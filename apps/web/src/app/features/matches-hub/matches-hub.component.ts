import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchFinderComponent } from '../match-finder/match-finder.component';
import { MyMatchesComponent } from '../my-matches/my-matches.component';

type Vue = 'trouver' | 'mes-matchs';

/**
 * Regroupe « Trouver un adversaire » (matchmaking) et « Mes matchs » sous une
 * seule page /matchs, pour simplifier la navigation. Le sous-onglet actif est
 * porté par le query param `vue` ; les params `tab` / `focus` restent lus par
 * les composants enfants pour les liens profonds des notifications.
 */
@Component({
  selector: 'app-matches-hub',
  standalone: true,
  imports: [MatchFinderComponent, MyMatchesComponent],
  template: `
    <div class="matches-hub">
      <nav class="hub-tabs">
        <button class="hub-tab" [class.active]="vue() === 'trouver'" (click)="go('trouver')">
          Trouver un adversaire
        </button>
        <button class="hub-tab" [class.active]="vue() === 'mes-matchs'" (click)="go('mes-matchs')">
          Mes matchs
        </button>
      </nav>

      @if (vue() === 'trouver') {
        <app-match-finder />
      } @else {
        <app-my-matches />
      }
    </div>
  `,
  styleUrl: './matches-hub.component.css',
})
export class MatchesHubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vue = signal<Vue>('trouver');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const v = pm.get('vue');
      if (v === 'trouver' || v === 'mes-matchs') this.vue.set(v);
    });
  }

  go(v: Vue): void {
    this.vue.set(v);
    this.router.navigate([], { relativeTo: this.route, queryParams: { vue: v } });
  }
}
