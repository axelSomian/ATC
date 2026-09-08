import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * État vide unifié (listes sans résultat, onglets sans contenu).
 * Icône projetée via `[icon]`, action optionnelle via `[cta]`.
 *
 *   <app-empty-state title="Aucun match à venir" hint="Publiez une annonce.">
 *     <svg icon>…</svg>
 *     <a cta routerLink="/matchs" class="btn btn-primary btn-sm">Trouver un match</a>
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="es" [class.es--card]="card()">
      <span class="es__icon"><ng-content select="[icon]" /></span>
      <p class="es__title">{{ title() }}</p>
      @if (hint()) { <p class="es__hint">{{ hint() }}</p> }
      <span class="es__cta"><ng-content select="[cta]" /></span>
    </div>
  `,
  styles: [`
    .es {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      text-align: center;
      padding: var(--space-12) var(--space-6);
    }
    .es--card {
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg, 16px);
    }
    .es__icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-muted);
    }
    .es__icon:empty { display: none; }
    .es__icon ::ng-deep svg { width: 26px; height: 26px; }
    .es__title {
      font-size: var(--text-lg);
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--color-ink);
      margin: 0;
      text-wrap: balance;
    }
    .es__hint {
      font-size: var(--text-sm);
      color: var(--color-muted);
      margin: 0;
      max-width: 34ch;
      line-height: 1.5;
      text-wrap: balance;
    }
    .es__cta:empty { display: none; }
    .es__cta { margin-top: var(--space-1); }
  `],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly hint = input<string>();
  readonly card = input(true);
}
