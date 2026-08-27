import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatchesService, type RecordMatchDto } from '../../core/services/matches.service';
import { QuickMatchesService } from '../../core/services/quick-matches.service';
import { AuthStore } from '../../core/stores/auth.store';
import type { Match, UpcomingMatch } from '../../core/models/match.model';
import type { QuickMatch } from '../../core/models/quick-match.model';

const TYPE_LABELS: Record<string, string> = {
  simple: 'Simple', double: 'Double', mixte: 'Mixte',
};

interface SetScore { h: string; g: string; }

@Component({
  selector: 'app-my-matches',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './my-matches.component.html',
  styleUrl: './my-matches.component.css',
})
export class MyMatchesComponent implements OnInit {
  private readonly matchesSvc    = inject(MatchesService);
  private readonly quickSvc      = inject(QuickMatchesService);
  private readonly authStore     = inject(AuthStore);
  private readonly route         = inject(ActivatedRoute);

  readonly tab        = signal<'upcoming' | 'challenges' | 'history'>('upcoming');
  readonly upcoming   = signal<UpcomingMatch[]>([]);
  readonly history    = signal<Match[]>([]);
  readonly challenges = signal<QuickMatch[]>([]);
  readonly loading    = signal(true);

  readonly historyPage      = signal(1);
  readonly historyPages     = signal(1);
  readonly historyTotal     = signal(0);
  readonly historyLoading   = signal(false);
  readonly hasMoreHistory   = computed(() => this.historyPage() < this.historyPages());

  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');

  readonly scoringId  = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly scoreError = signal('');
  readonly numSets    = signal<number>(2);
  readonly setScores  = signal<SetScore[]>([]);

  readonly receivedChallenges = computed(() =>
    this.challenges().filter(q => q.challengedId === this.currentUserId() && q.status === 'pending')
  );
  readonly sentChallenges = computed(() =>
    this.challenges().filter(q => q.challengerId === this.currentUserId() && q.status === 'pending')
  );
  readonly pendingChallengesCount = computed(() => this.receivedChallenges().length);

  // Score soumis par moi, en attente de validation par l'adversaire
  readonly pendingByMe = computed(() =>
    this.history().filter(m => m.status === 'pending' && m.recordedBy === this.currentUserId())
  );
  // Score soumis par l'adversaire, en attente de ma validation
  readonly pendingValidation = computed(() =>
    this.history().filter(m => m.status === 'pending' && m.recordedBy !== this.currentUserId())
  );
  // Matchs confirmés
  readonly confirmedHistory = computed(() =>
    this.history().filter(m => m.status === 'confirmed')
  );
  // Matchs contestés
  readonly disputedMatches = computed(() =>
    this.history().filter(m => m.status === 'disputed')
  );
  readonly pendingValidationCount = computed(() => this.pendingValidation().length);

  readonly today = new Date().toISOString();

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'challenges' || tabParam === 'history') {
      this.tab.set(tabParam);
    }

    Promise.all([
      new Promise<void>(res => {
        this.matchesSvc.getUpcoming().subscribe({ next: d => { this.upcoming.set(d); res(); }, error: () => res() });
      }),
      new Promise<void>(res => {
        this.matchesSvc.getMyMatches(1).subscribe({
          next: d => { this.history.set(d.data); this.historyPage.set(1); this.historyPages.set(d.pages); this.historyTotal.set(d.total); res(); },
          error: () => res(),
        });
      }),
      new Promise<void>(res => {
        this.quickSvc.getMine().subscribe({ next: d => { this.challenges.set(d); res(); }, error: () => res() });
      }),
    ]).then(() => this.loading.set(false));
  }

  setTab(t: 'upcoming' | 'challenges' | 'history'): void { this.tab.set(t); }

  loadMoreHistory(): void {
    if (!this.hasMoreHistory() || this.historyLoading()) return;
    const next = this.historyPage() + 1;
    this.historyLoading.set(true);
    this.matchesSvc.getMyMatches(next).subscribe({
      next: d => {
        this.history.update(list => [...list, ...d.data]);
        this.historyPage.set(d.page);
        this.historyPages.set(d.pages);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  // ── Score ──

  openScoreForm(matchId: string): void {
    this.scoringId.set(matchId);
    this.scoreError.set('');
    this.changeNumSets(2);
  }

  cancelScore(): void {
    this.scoringId.set(null);
    this.setScores.set([]);
  }

  changeNumSets(n: number): void {
    this.numSets.set(n);
    this.setScores.set(Array.from({ length: n }, () => ({ h: '', g: '' })));
  }

  updateSetScore(i: number, field: 'h' | 'g', val: string): void {
    this.setScores.update(arr => arr.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  isScoreValid(): boolean {
    const scores = this.setScores();
    if (scores.length === 0) return false;
    return scores.every(s => {
      if (s.h === '' || s.g === '') return false;
      if (!/^\d+$/.test(s.h) || !/^\d+$/.test(s.g)) return false;
      return Number(s.h) <= 7 && Number(s.g) <= 7;
    });
  }

  private computeWinner(): 'host' | 'guest' | null {
    let hostWins = 0, guestWins = 0;
    for (const s of this.setScores()) {
      const h = Number(s.h), g = Number(s.g);
      if (h > g) hostWins++;
      else if (g > h) guestWins++;
    }
    if (hostWins > guestWins) return 'host';
    if (guestWins > hostWins) return 'guest';
    return null;
  }

  submitScore(match: UpcomingMatch): void {
    if (!this.isScoreValid() || this.submitting()) return;
    const winnerRole = this.computeWinner();
    if (!winnerRole) {
      this.scoreError.set('Impossible de déterminer le vainqueur. Vérifiez les scores.');
      return;
    }
    this.submitting.set(true);
    this.scoreError.set('');

    const isHost = match.role === 'host';
    const sets   = this.setScores();

    // Form columns are always "Moi" (h) vs "Adversaire" (g).
    // If the current user is the guest, their score is in h but the API
    // stores scoreHost for the dispo-creator, so we must swap.
    const scoreHost  = isHost
      ? sets.map(s => `${s.h}-${s.g}`).join(' ')
      : sets.map(s => `${s.g}-${s.h}`).join(' ');
    const scoreGuest = isHost
      ? sets.map(s => `${s.g}-${s.h}`).join(' ')
      : sets.map(s => `${s.h}-${s.g}`).join(' ');

    // computeWinner returns 'host' when the "Moi" column won.
    // If current user is guest, "Moi" won → the guest won → flip for API.
    const apiWinnerRole: 'host' | 'guest' = isHost
      ? winnerRole
      : (winnerRole === 'host' ? 'guest' : 'host');

    const dto: RecordMatchDto = {
      sourceType: match.source,
      sourceId:   match.id,
      scoreHost,
      scoreGuest,
      winnerRole: apiWinnerRole,
    };

    this.matchesSvc.recordResult(dto).subscribe({
      next: (recorded) => {
        this.submitting.set(false);
        this.scoringId.set(null);
        this.setScores.set([]);
        this.upcoming.update(list => list.filter(m => m.id !== match.id));
        this.history.update(list => [recorded, ...list]);
      },
      error: (err) => {
        this.scoreError.set(err.error?.error ?? 'Erreur lors de l\'enregistrement.');
        this.submitting.set(false);
      },
    });
  }

  // ── Validation score ──

  confirmMatch(m: Match): void {
    this.matchesSvc.validateMatch(m.id, 'confirm').subscribe({
      next: (updated) => this.history.update(list => list.map(h => h.id === updated.id ? updated : h)),
    });
  }

  disputeMatch(m: Match): void {
    this.matchesSvc.validateMatch(m.id, 'dispute').subscribe({
      next: (updated) => this.history.update(list => list.map(h => h.id === updated.id ? updated : h)),
    });
  }

  // ── Quick match ──

  acceptChallenge(qm: QuickMatch): void {
    this.quickSvc.accept(qm.id).subscribe({
      next: (updated) => {
        this.challenges.update(list => list.map(q => q.id === updated.id ? { ...q, status: 'accepted' as const } : q));
        this.matchesSvc.getUpcoming().subscribe({ next: d => this.upcoming.set(d) });
      },
    });
  }

  declineChallenge(qm: QuickMatch): void {
    this.quickSvc.decline(qm.id).subscribe({
      next: (updated) => {
        this.challenges.update(list => list.map(q => q.id === updated.id ? { ...q, status: 'declined' as const } : q));
      },
    });
  }

  // ── Helpers ──

  typeLabel(type: string): string { return TYPE_LABELS[type] ?? type; }

  parseScoreSets(m: Match): { me: number; opp: number }[] {
    const score = this.myScore(m);
    if (!score) return [];
    return score.split(' ').map(s => {
      const [me, opp] = s.split('-').map(Number);
      return { me, opp };
    });
  }

  isWin(m: Match): boolean { return m.winnerId === this.currentUserId(); }

  formatDuration(min: number | null): string {
    if (!min) return '';
    return min >= 60
      ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`
      : `${min}min`;
  }

  opponentName(m: Match): string {
    return m.hostId === this.currentUserId() ? m.guest.name : m.host.name;
  }

  opponentInitials(m: Match): string {
    return m.hostId === this.currentUserId() ? m.guest.initials : m.host.initials;
  }

  opponentAvatarUrl(m: Match): string | undefined {
    return m.hostId === this.currentUserId() ? m.guest.avatarUrl : m.host.avatarUrl;
  }

  myScore(m: Match): string {
    return m.hostId === this.currentUserId() ? m.scoreHost : m.scoreGuest;
  }

  opponentScore(m: Match): string {
    return m.hostId === this.currentUserId() ? m.scoreGuest : m.scoreHost;
  }
}
