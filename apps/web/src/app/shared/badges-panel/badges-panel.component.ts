import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BadgesService } from '../../core/services/badges.service';
import type { BadgesPayload, BadgeSerie } from '../../core/models/badge.model';

/**
 * Panneau des badges d'un joueur (séries vivantes + hauts faits permanents).
 * `userId` absent → joueur connecté. `showLocked` → afficher les hauts faits
 * non encore débloqués comme objectifs (profil perso) ou les masquer (autre membre).
 */
@Component({
  selector: 'app-badges-panel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './badges-panel.component.html',
  styleUrl: './badges-panel.component.css',
})
export class BadgesPanelComponent {
  private readonly badges = inject(BadgesService);

  readonly userId = input<string>();
  readonly showLocked = input(true);

  readonly data = signal<BadgesPayload | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  readonly visibleFeats = computed(() => {
    const d = this.data();
    if (!d) return [];
    return this.showLocked() ? d.achievements : d.achievements.filter((a) => a.earned);
  });

  readonly isEmptyForOther = computed(() => {
    const d = this.data();
    return !this.showLocked() && !!d && this.visibleFeats().length === 0 && !d.series.some((s) => s.earned);
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      this.loading.set(true);
      this.failed.set(false);
      const req = id ? this.badges.getFor(id) : this.badges.getMine();
      req.subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => { this.failed.set(true); this.loading.set(false); },
      });
    });
  }

  pct(s: BadgeSerie): number {
    if (s.target <= 0) return 0;
    return Math.min(100, Math.round((s.value / s.target) * 100));
  }
}
