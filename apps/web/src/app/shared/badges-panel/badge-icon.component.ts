import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Icône dédiée par badge (séries + hauts faits). Tracé SVG au trait, hérite de
 * `currentColor` — pas d'emoji (cf. design system). `code` inconnu → médaille.
 */
@Component({
  selector: 'app-badge-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (code()) {
        @case ('serie_victoires') {
          <path d="M12 22c3.9 0 6-2.7 6-6 0-2.3-1-3.7-2.2-4.9-.3 1.4-1 2.1-1.8 2.5.5-2.7-.7-5.2-3.5-6.9.3 2.5-.6 3.8-1.9 5.2C7.3 8.7 6 10.4 6 12.9 6 16.3 8.1 22 12 22Z"/>
        }
        @case ('matchs_mois') {
          <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
        }
        @case ('sans_accroc') {
          <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>
        }
        @case ('premier_match') {
          <circle cx="12" cy="12" r="9"/><path d="M4 7c4 2 4 8 0 10M20 7c-4 2-4 8 0 10"/>
        }
        @case ('premiere_victoire_plus_fort') {
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>
        }
        @case ('outsider') {
          <path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6L12 22l-5.4-2.8 1-6L3.3 9.3l6-.9L12 3Z"/>
        }
        @case ('vingt_adversaires') {
          <circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3.1 3-4.6 5.5-4.6S13.7 15.9 14.5 19"/><path d="M16 6.6a3 3 0 0 1 0 5.8M18 19c-.3-1.7-1-3-2-3.8"/>
        }
        @case ('passage_niveau') {
          <path d="M3 20h4v-4h4v-4h4V8h5"/><path d="m16 5 4 3-4 3"/>
        }
        @case ('veteran') {
          <path d="M9 3 7.2 7.6M15 3l1.8 4.6"/><circle cx="12" cy="15" r="5.5"/><path d="m12 12.4 1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3Z"/>
        }
        @case ('toujours_partant') {
          <path d="M5 21V4.5c3-1.6 6 1.4 9 0s5-1 5-1v10.2s-2 .4-5 1.1-6-1.6-9 0"/>
        }
        @case ('le_tombeur') {
          <path d="m2 20 5.6-10.5 3.6 5.2 2.6-4.2L22 20Z"/><path d="m7.5 9.5 1.7-4 1.8 3"/>
        }
        @case ('remontada') {
          <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4.5V9h4.5"/>
        }
        @case ('fidele_club') {
          <path d="M4 21V8.5L12 3l8 5.5V21"/><path d="M9.5 21v-6h5v6"/>
        }
        @default {
          <circle cx="12" cy="9" r="6"/><path d="M9 14.5 7 22l5-3 5 3-2-7.5"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; }
    svg { width: 100%; height: 100%; }
  `],
})
export class BadgeIconComponent {
  readonly code = input.required<string>();
}
