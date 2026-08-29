import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DisposService, type DispoPost, type DisposQuery } from '../../core/services/dispos.service';
import { AuthStore } from '../../core/stores/auth.store';
import { NotificationsService } from '../../core/services/notifications.service';
import { SocketService } from '../../core/services/socket.service';
import { ReferenceService } from '../../core/services/reference.service';
import { CourtMapService } from '../../core/services/court-map.service';

// Repli si le catalogue de terrains (DB) est injoignable au démarrage.
const COURTS_FALLBACK = [
  'Club Ivoire', 'INSEP', 'Plateau Tennis Club', 'Cocody', 'Marcory',
  'Riviera', 'Yopougon', 'II Plateaux', 'Treichville',
];

const DURATIONS = [
  { value: 30, label: '30 min' }, { value: 60, label: '1h' },
  { value: 90, label: '1h30' },  { value: 120, label: '2h' },
  { value: 150, label: '2h30' }, { value: 180, label: '3h' },
];

@Component({
  selector: 'app-match-finder',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './match-finder.component.html',
  styleUrl: './match-finder.component.css',
})
export class MatchFinderComponent implements OnInit, OnDestroy {
  private readonly disposService = inject(DisposService);
  private readonly socket        = inject(SocketService);
  private readonly authStore     = inject(AuthStore);
  private readonly fb            = inject(FormBuilder);
  private readonly route         = inject(ActivatedRoute);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly reference     = inject(ReferenceService);
  private readonly courtMap      = inject(CourtMapService);
  readonly notifService          = inject(NotificationsService);

  readonly tab          = signal<'feed' | 'mine'>('feed');
  readonly focusId      = signal<string | null>(null);
  readonly showCreate   = signal(false);
  readonly loadingFeed  = signal(true);
  readonly loadingMine  = signal(false);
  readonly creating     = signal(false);
  readonly feedError    = signal('');
  readonly createError  = signal('');

  readonly dispos   = signal<DispoPost[]>([]);
  readonly total    = signal(0);
  readonly myDispos = signal<DispoPost[]>([]);

  readonly typeFilter = signal<'simple' | 'double' | 'mixte' | null>(null);
  readonly dateFilter = signal('');
  readonly newIds     = signal<ReadonlySet<string>>(new Set());

  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');

  // Ruban créateur : total demandes en attente sur toutes mes annonces
  readonly totalPending = computed(() =>
    this.myDispos().reduce((sum, d) => sum + this.pendingCount(d), 0)
  );

  // Ruban accepté : notifications match_confirmed non lues
  readonly confirmedNotifs = computed(() =>
    this.notifService.all().filter(n => n.type === 'match_confirmed' && !n.readAt)
  );

  readonly dots    = [1, 2, 3, 4, 5];
  readonly courts  = computed(() => {
    const names = this.reference.courtNames();
    return names.length ? names : COURTS_FALLBACK;
  });
  readonly durations = DURATIONS;

  openCourtMap(court: string): void {
    this.courtMap.open(court);
  }

  readonly createForm = this.fb.group({
    when:     ['', Validators.required],
    duration: [60, Validators.required],
    court:    ['', Validators.required],
    type:     ['simple' as 'simple' | 'double' | 'mixte', Validators.required],
    note:     [''],
  });

  ngOnInit(): void {
    this.loadFeed();

    // Feed en temps réel : nouvelle annonce publiée par un autre membre.
    this.socket.on<DispoPost>('dispo:new', (dispo) => this.onDispoNew(dispo));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      if (pm.get('tab') === 'mine') this.setTab('mine');
      const focus = pm.get('focus');
      this.focusId.set(focus);
      if (focus) {
        this.setTab('mine');
        setTimeout(() => {
          document.getElementById('d-' + focus)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
        setTimeout(() => this.focusId.set(null), 3200);
      }
    });
  }

  loadFeed(): void {
    this.loadingFeed.set(true);
    this.feedError.set('');
    const q: DisposQuery = {
      ...(this.typeFilter() ? { type: this.typeFilter()! } : {}),
      ...(this.dateFilter() ? { date: this.dateFilter() } : {}),
    };
    this.disposService.list(q).subscribe({
      next: r => { this.dispos.set(r.data); this.total.set(r.total); this.loadingFeed.set(false); },
      error: () => { this.feedError.set('Impossible de charger le feed.'); this.loadingFeed.set(false); },
    });
  }

  loadMine(): void {
    this.loadingMine.set(true);
    this.disposService.mine().subscribe({
      next: d => { this.myDispos.set(d); this.loadingMine.set(false); },
      error: () => this.loadingMine.set(false),
    });
  }

  setTab(t: 'feed' | 'mine'): void {
    this.tab.set(t);
    if (t === 'mine' && !this.myDispos().length) this.loadMine();
  }

  /** Insère une annonce reçue en live si elle correspond aux filtres actifs. */
  private onDispoNew(dispo: DispoPost): void {
    if (this.dispos().some((d) => d.id === dispo.id)) return;
    if (this.typeFilter() && dispo.type !== this.typeFilter()) return;
    if (this.dateFilter() && !dispo.when.startsWith(this.dateFilter())) return;
    this.dispos.update((list) => [dispo, ...list]);
    this.total.update((n) => n + 1);
    this.newIds.update((s) => new Set(s).add(dispo.id));
    setTimeout(() => this.newIds.update((s) => {
      const next = new Set(s);
      next.delete(dispo.id);
      return next;
    }), 4000);
  }

  isNew(id: string): boolean { return this.newIds().has(id); }

  ngOnDestroy(): void {
    this.socket.off('dispo:new');
  }

  setType(t: 'simple' | 'double' | 'mixte' | null): void {
    this.typeFilter.set(t); this.loadFeed();
  }

  onDateChange(e: Event): void {
    this.dateFilter.set((e.target as HTMLInputElement).value); this.loadFeed();
  }

  toggleCreate(): void {
    this.showCreate.update(v => !v);
    this.createError.set('');
    if (!this.showCreate()) this.createForm.reset({ duration: 60, type: 'simple' });
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) return;
    this.creating.set(true);
    this.createError.set('');
    const raw = this.createForm.getRawValue();
    this.disposService.create({
      when:     new Date(raw.when!).toISOString(),
      duration: raw.duration!,
      court:    raw.court!,
      type:     raw.type!,
      note:     raw.note || null,
    }).subscribe({
      next: dispo => {
        this.showCreate.set(false);
        this.creating.set(false);
        this.createForm.reset({ duration: 60, type: 'simple' });
        this.dispos.update(list => [dispo, ...list]);
        this.myDispos.update(list => [dispo, ...list]);
      },
      error: (err: HttpErrorResponse) => {
        this.createError.set(err.error?.error ?? 'Erreur lors de la création.');
        this.creating.set(false);
      },
    });
  }

  joinDispo(dispo: DispoPost): void {
    this.disposService.request(dispo.id).subscribe({
      next: req => {
        this.dispos.update(list =>
          list.map(d => d.id === dispo.id
            ? { ...d, requests: [...d.requests, req] }
            : d
          )
        );
      },
    });
  }

  deleteDispo(dispo: DispoPost): void {
    this.disposService.delete(dispo.id).subscribe({
      next: () => {
        this.myDispos.update(l => l.filter(d => d.id !== dispo.id));
        this.dispos.update(l => l.filter(d => d.id !== dispo.id));
      },
    });
  }

  acceptRequest(dispo: DispoPost, reqId: string): void {
    this.disposService.accept(dispo.id, reqId).subscribe({
      next: updated => this.updateRequest(dispo.id, updated),
    });
  }

  declineRequest(dispo: DispoPost, reqId: string): void {
    this.disposService.decline(dispo.id, reqId).subscribe({
      next: updated => this.updateRequest(dispo.id, updated),
    });
  }

  private updateRequest(dispoId: string, updated: { id: string; status: string }): void {
    const update = (list: DispoPost[]) => list.map(d =>
      d.id !== dispoId ? d : {
        ...d,
        requests: d.requests.map(r => r.id === updated.id ? { ...r, status: updated.status as 'accepted' | 'declined' } : r),
      }
    );
    this.myDispos.update(update);
    this.dispos.update(update);
  }

  myRequestStatus(dispo: DispoPost): 'pending' | 'accepted' | 'declined' | null {
    return dispo.requests.find(r => r.requesterId === this.currentUserId())?.status ?? null;
  }

  isMyDispo(dispo: DispoPost): boolean { return dispo.userId === this.currentUserId(); }

  pendingCount(dispo: DispoPost): number {
    return dispo.requests.filter(r => r.status === 'pending').length;
  }

  formatDuration(min: number): string {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h${m}` : `${h}h`) : `${m}min`;
  }

  typeLabel(t: string): string {
    return { simple: 'Simple', double: 'Double', mixte: 'Mixte' }[t] ?? t;
  }

  levelLabel(level: number): string {
    return this.reference.levelLabel(level);
  }
}
