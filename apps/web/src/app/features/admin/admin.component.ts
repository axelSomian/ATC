import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OverviewPanelComponent } from './panels/overview-panel.component';
import { ClubsPanelComponent } from './panels/clubs-panel.component';
import { LevelsPanelComponent } from './panels/levels-panel.component';
import { MembersPanelComponent } from './panels/members-panel.component';
import { PushPanelComponent } from './panels/push-panel.component';
import { NewsPanelComponent } from './panels/news-panel.component';
import { TournamentsPanelComponent } from './panels/tournaments-panel.component';

type Tab = 'overview' | 'clubs' | 'levels' | 'members' | 'push' | 'news' | 'tournaments';

interface NavItem {
  tab: Tab;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function icon(inner: string): string {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const ICON = {
  overview: icon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  tournaments: icon('<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>'),
  clubs: icon('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 11h.01M15 11h.01"/>'),
  levels: icon('<line x1="4" y1="20" x2="4" y2="14"/><line x1="10" y1="20" x2="10" y2="10"/><line x1="16" y1="20" x2="16" y2="6"/>'),
  members: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  news: icon('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>'),
  push: icon('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
} as const;

const NAV: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { tab: 'overview', label: "Vue d'ensemble", title: "Vue d'ensemble", subtitle: 'Les métriques clés de la fédération, en temps réel.', icon: ICON.overview },
    ],
  },
  {
    label: 'Compétition',
    items: [
      { tab: 'tournaments', label: 'Tournois', title: 'Tournois', subtitle: 'Créer un tournoi, définir ses règles, suivre les inscrits et saisir les résultats.', icon: ICON.tournaments },
      { tab: 'clubs', label: 'Clubs', title: 'Clubs', subtitle: 'Fiches, tarifs, position sur la carte.', icon: ICON.clubs },
      { tab: 'levels', label: 'Niveaux', title: 'Niveaux', subtitle: 'Libellés et descriptions des 5 paliers.', icon: ICON.levels },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { tab: 'members', label: 'Membres', title: 'Membres', subtitle: 'Rôles et profils des membres de la fédération.', icon: ICON.members },
    ],
  },
  {
    label: 'Diffusion',
    items: [
      { tab: 'news', label: 'Actualité', title: 'Actualité', subtitle: 'Articles, événements et flux RSS.', icon: ICON.news },
      { tab: 'push', label: 'Notifications', title: 'Notifications', subtitle: 'Diffusion push groupée vers les membres.', icon: ICON.push },
    ],
  },
];

const ALL_TABS: Tab[] = NAV.flatMap((g) => g.items.map((i) => i.tab));

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    OverviewPanelComponent,
    ClubsPanelComponent,
    LevelsPanelComponent,
    MembersPanelComponent,
    PushPanelComponent,
    NewsPanelComponent,
    TournamentsPanelComponent,
  ],
  template: `
    <div class="admin-shell">
      <nav class="admin-nav">
        <div class="admin-nav-brand">
          <strong>Administration</strong>
          <span>TenCI Fédération</span>
        </div>
        @for (group of nav; track group.label) {
          <div class="admin-nav-group">
            <span class="admin-nav-group-label">{{ group.label }}</span>
            @for (item of group.items; track item.tab) {
              <button class="admin-nav-item" [class.active]="tab() === item.tab" (click)="tab.set(item.tab)">
                <span class="admin-nav-icon" [innerHTML]="item.icon"></span>
                {{ item.label }}
              </button>
            }
          </div>
        }
      </nav>

      <div class="admin-main">
        <header class="admin-topbar">
          <div>
            <h1>{{ current().title }}</h1>
            <p class="text-muted">{{ current().subtitle }}</p>
          </div>
        </header>

        <div class="admin-content">
          @switch (tab()) {
            @case ('overview') { <app-overview-panel /> }
            @case ('clubs') { <app-clubs-panel /> }
            @case ('tournaments') { <app-tournaments-panel /> }
            @case ('levels') { <app-levels-panel /> }
            @case ('members') { <app-members-panel /> }
            @case ('push') { <app-push-panel /> }
            @case ('news') { <app-news-panel /> }
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-shared.css',
})
export class AdminComponent {
  readonly nav = NAV;
  readonly tab = signal<Tab>('overview');

  readonly current = () => NAV.flatMap((g) => g.items).find((i) => i.tab === this.tab())!;

  constructor() {
    const t = inject(ActivatedRoute).snapshot.queryParamMap.get('tab');
    if (t && (ALL_TABS as string[]).includes(t)) this.tab.set(t as Tab);
  }
}
