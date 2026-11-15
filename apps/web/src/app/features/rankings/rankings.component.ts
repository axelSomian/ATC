import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import type { PointsBreakdown } from '../../core/models/ranking.model';
import { MembersService, type RankingEntry } from '../../core/services/members.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ReferenceService } from '../../core/services/reference.service';
import { LevelLegendComponent } from '../../shared/level-legend/level-legend.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [RouterLink, DatePipe, LevelLegendComponent, EmptyStateComponent],
  templateUrl: './rankings.component.html',
  styleUrl: './rankings.component.css',
})
export class RankingsComponent implements OnInit {
  private readonly membersSvc = inject(MembersService);
  private readonly authStore  = inject(AuthStore);
  private readonly reference  = inject(ReferenceService);

  readonly rankings = signal<RankingEntry[]>([]);
  readonly loading  = signal(true);
  readonly myPoints = signal<PointsBreakdown | null>(null);

  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');

  readonly myRank = computed(() =>
    this.rankings().find(r => r.id === this.currentUserId()) ?? null
  );

  ngOnInit(): void {
    this.membersSvc.getRankings().subscribe({
      next:  r => { this.rankings.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    const me = this.currentUserId();
    if (me) this.membersSvc.getPoints(me).subscribe({ next: (p) => this.myPoints.set(p) });
  }

  levelLabel(level: number): string {
    return this.reference.levelLabel(level);
  }

  rankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }
}
