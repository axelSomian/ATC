import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Subject, switchMap, debounceTime, distinctUntilChanged, catchError, EMPTY, takeUntil } from 'rxjs';
import { MembersService, type MembersQuery } from '../../../core/services/members.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { LevelLegendComponent } from '../../../shared/level-legend/level-legend.component';
import { CITIES_CI } from '@atc/shared';
import type { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, LevelLegendComponent],
  templateUrl: './members-list.component.html',
  styleUrl: './members-list.component.css',
})
export class MembersListComponent implements OnInit, OnDestroy {
  private readonly membersService = inject(MembersService);
  private readonly reference = inject(ReferenceService);
  private readonly destroy$ = new Subject<void>();
  private readonly query$ = new BehaviorSubject<MembersQuery>({ page: 1, limit: 18 });

  readonly members   = signal<UserProfile[]>([]);
  readonly total     = signal(0);
  readonly pages     = signal(0);
  readonly loading   = signal(true);
  readonly error     = signal('');

  readonly levelFilter  = signal<number | null>(null);
  readonly onlineFilter = signal(false);
  readonly searchCtrl   = new FormControl('');
  readonly cityCtrl     = new FormControl('');

  readonly cities       = CITIES_CI;
  readonly levels       = [1, 2, 3, 4, 5];
  readonly dots         = [1, 2, 3, 4, 5];

  get currentPage(): number { return this.query$.value.page ?? 1; }

  ngOnInit(): void {
    this.query$.pipe(
      debounceTime(80),
      switchMap(q => {
        this.loading.set(true);
        this.error.set('');
        return this.membersService.listMembers(q).pipe(
          catchError(() => {
            this.error.set('Impossible de charger les membres.');
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.members.set(res.data);
      this.total.set(res.total);
      this.pages.set(res.pages);
      this.loading.set(false);
    });

    this.searchCtrl.valueChanges.pipe(
      debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(q => this.patch({ q: q || undefined, page: 1 }));

    this.cityCtrl.valueChanges.pipe(
      debounceTime(100), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(city => this.patch({ city: city || undefined, page: 1 }));
  }

  private patch(partial: Partial<MembersQuery>): void {
    const next = { ...this.query$.value, ...partial } as Record<string, unknown>;
    for (const k of Object.keys(next)) {
      if (next[k] === undefined || next[k] === null || next[k] === '') delete next[k];
    }
    this.query$.next(next as MembersQuery);
  }

  setLevel(level: number | null): void {
    this.levelFilter.set(level);
    this.patch({ level: level ?? undefined, page: 1 });
  }

  toggleOnline(): void {
    const next = !this.onlineFilter();
    this.onlineFilter.set(next);
    this.patch({ online: next || undefined, page: 1 });
  }

  goTo(page: number): void { this.patch({ page }); }

  getLevelLabel(l: number): string { return this.reference.levelLabel(l); }

  paginationItems(): Array<number | null> {
    const total = this.pages();
    const cur = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const items: Array<number | null> = [1];
    if (cur > 3) items.push(null);
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) items.push(p);
    if (cur < total - 2) items.push(null);
    items.push(total);
    return items;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
