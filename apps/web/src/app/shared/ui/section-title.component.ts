import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Titre de section récurrent : libellé en petites capitales espacées, avec un
 * emplacement d'action optionnel aligné à droite (`[action]`).
 *
 *   <app-section-title label="Prochain match">
 *     <a action routerLink="/matchs">Tout voir</a>
 *   </app-section-title>
 */
@Component({
  selector: 'app-section-title',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sth">
      <h3 class="sth__label">{{ label() }}</h3>
      <span class="sth__action"><ng-content select="[action]" /></span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sth {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    .sth__label {
      font-family: var(--font-display);
      font-size: var(--text-sm);
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--color-muted);
      margin: 0;
    }
    .sth__action { font-size: var(--text-sm); flex-shrink: 0; }
    .sth__action:empty { display: none; }
  `],
})
export class SectionTitleComponent {
  readonly label = input.required<string>();
}
