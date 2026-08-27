import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthStore } from '../../core/stores/auth.store';
import { MatchesService, type MyStats } from '../../core/services/matches.service';
import type { UpcomingMatch } from '../../core/models/match.model';

const LEVEL_LABELS = ['', 'Débutant', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly store       = inject(AuthStore);
  private readonly matchesSvc  = inject(MatchesService);

  readonly user        = this.store.user;
  readonly firstName   = computed(() => this.user()?.name?.split(' ')[0] ?? '');
  readonly levelLabel  = computed(() => LEVEL_LABELS[this.user()?.level ?? 1]);
  readonly dots        = [1, 2, 3, 4, 5];

  readonly stats    = signal<MyStats | null>(null);
  readonly upcoming = signal<UpcomingMatch[]>([]);
  readonly loading  = signal(true);

  readonly nextMatch   = computed(() => this.upcoming()[0] ?? null);
  readonly rankLabel   = computed(() => {
    const r = this.stats()?.rank;
    return r != null ? `#${r}` : '—';
  });
  readonly deltaLabel  = computed(() => {
    const d = this.stats()?.ratingDelta;
    if (!d) return null;
    return d > 0 ? `+${d}` : `${d}`;
  });
  readonly deltaUp     = computed(() => (this.stats()?.ratingDelta ?? 0) > 0);
  readonly deltaDown   = computed(() => (this.stats()?.ratingDelta ?? 0) < 0);

  ngOnInit(): void {
    Promise.all([
      new Promise<void>(res => {
        this.matchesSvc.getMyStats().subscribe({ next: s => { this.stats.set(s); res(); }, error: () => res() });
      }),
      new Promise<void>(res => {
        this.matchesSvc.getUpcoming().subscribe({ next: d => { this.upcoming.set(d); res(); }, error: () => res() });
      }),
    ]).then(() => this.loading.set(false));
  }

  formatDuration(min: number | null): string {
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h${m}` : `${h}h`) : `${m}min`;
  }
}
