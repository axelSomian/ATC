import { Component, OnInit, inject, input, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MembersService } from '../../../core/services/members.service';
import { QuickMatchesService } from '../../../core/services/quick-matches.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { ReferenceService } from '../../../core/services/reference.service';
import { PresenceService } from '../../../core/services/presence.service';
import type { UserProfile, RecentMatch } from '../../../core/models/user.model';

// Repli si le catalogue des clubs (DB) est injoignable au démarrage.
const VENUE_FALLBACK = [
  'Le Central Tennis Club (LCTC)', "N'Goran Tennis Concept (NTC)", 'Golf Tennis Club',
  'Sotra Tennis Academy', 'Athlétic Club', 'Sol Béni', 'Yop Tennis Academy',
];

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './member-detail.component.html',
  styleUrl: './member-detail.component.css',
})
export class MemberDetailComponent implements OnInit {
  private readonly membersService    = inject(MembersService);
  private readonly quickMatchService = inject(QuickMatchesService);
  private readonly authStore         = inject(AuthStore);
  private readonly reference         = inject(ReferenceService);
  private readonly presence          = inject(PresenceService);
  private readonly fb                = inject(FormBuilder);

  readonly id = input.required<string>();

  readonly member   = signal<UserProfile | null>(null);
  readonly loading  = signal(true);
  readonly error    = signal('');
  readonly tab      = signal<'info' | 'history'>('info');

  readonly showChallenge  = signal(false);
  readonly challenging    = signal(false);
  readonly challengeError = signal('');
  readonly challengeSent  = signal(false);

  readonly isOwnProfile = computed(() => this.authStore.user()?.id === this.id());
  readonly dots      = [1, 2, 3, 4, 5];
  readonly courts    = computed(() => {
    const names = this.reference.venueNames();
    return names.length ? names : VENUE_FALLBACK;
  });
  readonly levelLabel = computed(() => this.reference.levelLabel(this.member()?.level ?? 1));
  readonly isOnline = computed(() => this.presence.isOnline(this.member()?.id, this.member()?.online ?? false));

  readonly winRate = computed(() => {
    const m = this.member();
    if (!m || !m.matchesPlayed) return '—';
    return `${m.winRate ?? 0}%`;
  });

  readonly rankLabel = computed(() => {
    const m = this.member();
    if (!m?.rank) return null;
    return `#${m.rank}`;
  });

  readonly bestRankLabel = computed(() => {
    const m = this.member();
    if (!m?.bestRanking) return null;
    return `#${m.bestRanking}`;
  });

  readonly challengeForm = this.fb.group({
    when:  ['', Validators.required],
    court: ['', Validators.required],
    type:  ['simple' as 'simple' | 'double' | 'mixte', Validators.required],
    note:  [''],
  });

  ngOnInit(): void {
    this.membersService.getMember(this.id()).subscribe({
      next: (data) => { this.member.set(data); this.loading.set(false); },
      error: () => { this.error.set('Membre introuvable.'); this.loading.set(false); },
    });
  }

  toggleChallenge(): void {
    this.showChallenge.update(v => !v);
    this.challengeError.set('');
    this.challengeSent.set(false);
    if (!this.showChallenge()) this.challengeForm.reset({ type: 'simple' });
  }

  submitChallenge(): void {
    if (this.challengeForm.invalid || this.challenging()) return;
    this.challenging.set(true);
    this.challengeError.set('');
    const raw = this.challengeForm.getRawValue();
    this.quickMatchService.challenge({
      challengedId: this.id(),
      when:  new Date(raw.when!).toISOString(),
      court: raw.court!,
      type:  raw.type!,
      note:  raw.note || undefined,
    }).subscribe({
      next: () => {
        this.challenging.set(false);
        this.challengeSent.set(true);
        this.showChallenge.set(false);
        this.challengeForm.reset({ type: 'simple' });
      },
      error: (err) => {
        this.challengeError.set(err.error?.error ?? 'Erreur lors de l\'envoi.');
        this.challenging.set(false);
      },
    });
  }

  typeLabel(t: string): string {
    return { simple: 'Simple', double: 'Double', mixte: 'Mixte' }[t] ?? t;
  }

  // ── Helpers historique ──

  isWin(m: RecentMatch): boolean { return m.winnerId === this.id(); }

  opponent(m: RecentMatch) {
    return m.hostId === this.id() ? m.guest : m.host;
  }

  parseScoreSets(m: RecentMatch): { me: number; opp: number }[] {
    const raw = m.hostId === this.id() ? m.scoreHost : m.scoreGuest;
    if (!raw) return [];
    return raw.split(' ').map(s => {
      const [me, opp] = s.split('-').map(Number);
      return { me, opp };
    });
  }
}
