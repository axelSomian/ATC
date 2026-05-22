import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MembersService, type RankingEntry } from '../../core/services/members.service';
import { AuthStore } from '../../core/stores/auth.store';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './rankings.component.html',
  styleUrl: './rankings.component.css',
})
export class RankingsComponent implements OnInit {
  private readonly membersSvc = inject(MembersService);
  private readonly authStore  = inject(AuthStore);

  readonly rankings = signal<RankingEntry[]>([]);
  readonly loading  = signal(true);

  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');

  readonly myRank = computed(() =>
    this.rankings().find(r => r.id === this.currentUserId()) ?? null
  );

  ngOnInit(): void {
    this.membersSvc.getRankings().subscribe({
      next:  r => { this.rankings.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  levelLabel(level: number): string {
    return ['', 'Débutant', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert'][level] ?? '';
  }

  ratingColor(rating: number): string {
    if (rating >= 1500) return 'rating-expert';
    if (rating >= 1300) return 'rating-avance';
    if (rating >= 1100) return 'rating-confirme';
    if (rating >= 900)  return 'rating-inter';
    return 'rating-debutant';
  }

  rankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  deltaArrow(d: number): string { return d > 0 ? '↑' : d < 0 ? '↓' : '—'; }
  deltaLabel(d: number): string { return d > 0 ? `+${d}` : d < 0 ? `${d}` : ''; }
  deltaCss(d: number):   string { return d > 0 ? 'delta-up' : d < 0 ? 'delta-down' : 'delta-neutral'; }
}
