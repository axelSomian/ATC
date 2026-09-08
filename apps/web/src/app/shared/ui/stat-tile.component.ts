import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Tuile de statistique (profil, fiche membre, classement).
 * Libellé en capitales · valeur en grand · indice optionnel.
 * `tone` colore la valeur : ink (défaut), positive, negative, gold (classement).
 */
@Component({
  selector: 'app-stat-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="st" [class.st--plain]="plain()">
      <span class="st__label">{{ label() }}</span>
      <span class="st__value st__value--{{ tone() }}">{{ value() }}</span>
      @if (hint()) { <span class="st__hint">{{ hint() }}</span> }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .st {
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-xs);
      padding: var(--space-4) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .st--plain {
      background: none;
      border: 0;
      box-shadow: none;
      padding: var(--space-2) 0;
      align-items: center;
      text-align: center;
    }
    .st__label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-muted);
    }
    .st__value {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      margin: 4px 0 2px;
      color: var(--color-ink);
      font-variant-numeric: tabular-nums;
    }
    .st--plain .st__value { font-size: 20px; }
    .st__value--positive { color: var(--color-positive); }
    .st__value--negative { color: var(--color-error); }
    .st__value--gold     { color: #836841; }
    .st__hint {
      font-size: 12px;
      color: var(--color-muted);
      line-height: 1.4;
    }
  `],
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly tone = input<'ink' | 'positive' | 'negative' | 'gold'>('ink');
  /** Sans fond ni bordure — pour une barre de stats compacte (fiche membre). */
  readonly plain = input(false);
}
