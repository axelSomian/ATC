import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { BadgeIconComponent } from './badge-icon.component';

let CREST_SEQ = 0;

/**
 * Écusson de badge — forme d'armoirie moderne (sommet légèrement pointu, flancs
 * rentrants, base en pointe), bordure métallique, ruban intégré portant le nom,
 * glyphe central. Inspiration : trophées de jeux compétitifs.
 * Deux états : `earned` (métal doré + champ forêt) / verrouillé (étain grisé).
 */
@Component({
  selector: 'app-badge-crest',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeIconComponent],
  host: {
    '[class.is-earned]': 'earned()',
    '[class.is-locked]': '!earned()',
  },
  template: `
    <div class="crest">
      <svg class="crest-svg" viewBox="0 0 120 152" role="img" [attr.aria-label]="label()">
        <defs>
          <linearGradient [attr.id]="'m-' + uid + '-e'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#FBEAC4" />
            <stop offset="0.24" stop-color="#E6C97C" />
            <stop offset="0.5" stop-color="#C9A24E" />
            <stop offset="0.74" stop-color="#A67C31" />
            <stop offset="1" stop-color="#6B4F1F" />
          </linearGradient>
          <linearGradient [attr.id]="'m-' + uid + '-l'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#E9EAEE" />
            <stop offset="0.3" stop-color="#BDBEC5" />
            <stop offset="0.58" stop-color="#8C8D96" />
            <stop offset="1" stop-color="#585963" />
          </linearGradient>
          <linearGradient [attr.id]="'f-' + uid + '-e'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2A6E58" />
            <stop offset="1" stop-color="#0F3127" />
          </linearGradient>
          <linearGradient [attr.id]="'f-' + uid + '-l'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3E3F45" />
            <stop offset="1" stop-color="#282930" />
          </linearGradient>
          <linearGradient [attr.id]="'r-' + uid + '-e'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#21503F" />
            <stop offset="1" stop-color="#0E2A21" />
          </linearGradient>
          <linearGradient [attr.id]="'r-' + uid + '-l'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#4C4D54" />
            <stop offset="1" stop-color="#343539" />
          </linearGradient>
        </defs>

        <!-- Pans du ruban (derrière l'écusson) -->
        <path class="ribbon-tail" [attr.fill]="ribbonUrl()" d="M22 106 L5 132 L21 126 L33 113 Z" />
        <path class="ribbon-tail" [attr.fill]="ribbonUrl()" d="M98 106 L115 132 L99 126 L87 113 Z" />

        <!-- Bordure métallique = écusson plein -->
        <path [attr.fill]="metalUrl()" stroke="#00000030" stroke-width="1"
          d="M60 5 L64 10 C74 11 84 14 93 18 C100 21 105 24 106 29 L107 66
             C107 92 88 118 60 134 C32 118 13 92 13 66 L14 29
             C15 24 20 21 27 18 C36 14 46 11 56 10 Z" />

        <!-- Champ intérieur -->
        <path [attr.fill]="fieldUrl()"
          transform="translate(60 66) scale(0.82) translate(-60 -66)"
          d="M60 5 L64 10 C74 11 84 14 93 18 C100 21 105 24 106 29 L107 66
             C107 92 88 118 60 134 C32 118 13 92 13 66 L14 29
             C15 24 20 21 27 18 C36 14 46 11 56 10 Z" />

        <!-- Biseau + reflet -->
        <path fill="none" stroke="#FFFFFF22" stroke-width="1.6"
          transform="translate(60 66) scale(0.82) translate(-60 -66)"
          d="M60 5 L64 10 C74 11 84 14 93 18 C100 21 105 24 106 29 L107 66
             C107 92 88 118 60 134 C32 118 13 92 13 66 L14 29
             C15 24 20 21 27 18 C36 14 46 11 56 10 Z" />
        <ellipse class="shine" cx="60" cy="34" rx="30" ry="15" fill="#FFFFFF" opacity="0.06" />

        <!-- Gemme de sommet -->
        <path [attr.fill]="metalUrl()" stroke="#00000033" stroke-width="0.75" d="M60 1 L65 7 L60 13 L55 7 Z" />
        <path fill="#FFFFFF" opacity="0.35" d="M60 2.5 L62.5 6 L60 6.5 L57.5 6 Z" />

        <!-- Ruban avant -->
        <path [attr.fill]="ribbonUrl()" stroke="#00000022" stroke-width="0.75"
          d="M24 103 H96 V121 L60 129 L24 121 Z" />
        <path fill="#FFFFFF" opacity="0.08" d="M24 103 H96 V108 H24 Z" />
        <text class="ribbon-text" x="60" y="117" text-anchor="middle"
          [attr.font-size]="ribbonFont()"
          [attr.textLength]="labelLong() ? 72 : null" lengthAdjust="spacingAndGlyphs">{{ ribbonLabel() }}</text>
      </svg>

      <span class="crest-glyph">
        <app-badge-icon [code]="code()" [strokeWidth]="1.35" />
      </span>
    </div>
  `,
  styleUrl: './badge-crest.component.css',
})
export class BadgeCrestComponent {
  readonly code = input.required<string>();
  readonly label = input('');
  readonly earned = input(false);

  readonly uid = `bc${CREST_SEQ++}`;

  readonly metalUrl = computed(() => `url(#m-${this.uid}-${this.earned() ? 'e' : 'l'})`);
  readonly fieldUrl = computed(() => `url(#f-${this.uid}-${this.earned() ? 'e' : 'l'})`);
  readonly ribbonUrl = computed(() => `url(#r-${this.uid}-${this.earned() ? 'e' : 'l'})`);

  readonly ribbonLabel = computed(() => this.label().toUpperCase());
  readonly ribbonFont = computed(() => {
    const n = this.label().length;
    if (n >= 18) return 7.5;
    if (n >= 14) return 9;
    if (n >= 10) return 10.5;
    return 12;
  });
  readonly labelLong = computed(() => this.label().length >= 16);
}
