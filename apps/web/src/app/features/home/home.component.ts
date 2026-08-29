import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { ReferenceService } from '../../core/services/reference.service';
import { MatchesService, type MyStats } from '../../core/services/matches.service';
import { PresenceService } from '../../core/services/presence.service';

interface Widget {
  id: string;
  route: string;
  query?: Record<string, string>;
  title: string;
  sub: string;
  tone: 'green' | 'forest' | 'sage' | 'sand' | 'positive' | 'ivory';
  img: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly reference = inject(ReferenceService);
  private readonly matchesSvc = inject(MatchesService);
  private readonly presence = inject(PresenceService);

  readonly user = this.store.user;
  readonly firstName = computed(() => this.user()?.name?.split(' ')[0] ?? '');
  readonly levelLabel = computed(() => this.reference.levelLabel(this.user()?.level ?? 1));
  readonly dots = [1, 2, 3, 4, 5];

  readonly stats = signal<MyStats | null>(null);
  readonly onlineCount = computed(() => this.presence.online().size);

  readonly widgets: Widget[] = [
    {
      id: 'annonce',
      route: '/matchs',
      query: { vue: 'trouver' },
      title: 'Créer une annonce',
      sub: 'Publie ta dispo, trouve un adversaire',
      tone: 'green',
      img: 'w-annonce',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    },
    {
      id: 'membres',
      route: '/members',
      title: 'Membres',
      sub: 'Parcours l\'annuaire de la communauté',
      tone: 'forest',
      img: 'w-membres',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    },
    {
      id: 'classement',
      route: '/rankings',
      title: 'Classement',
      sub: 'Suis ta progression et celle des autres',
      tone: 'sand',
      img: 'w-classement',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    },
    {
      id: 'mes-matchs',
      route: '/matchs',
      query: { vue: 'mes-matchs' },
      title: 'Mes matchs',
      sub: 'Défis, matchs à venir et historique',
      tone: 'sage',
      img: 'w-matchs',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    },
    {
      id: 'dispos',
      route: '/availability',
      title: 'Disponibilités',
      sub: 'Gère ton calendrier de la semaine',
      tone: 'ivory',
      img: 'w-dispos',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    },
    {
      id: 'profil',
      route: '/profile',
      title: 'Mon profil',
      sub: 'Tes infos, ton niveau, tes statistiques',
      tone: 'positive',
      img: 'w-profil',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
  ];

  ngOnInit(): void {
    this.matchesSvc.getMyStats().subscribe({ next: (s) => this.stats.set(s) });
  }

  /** Petite info vivante affichée sur certains widgets. */
  meta(id: string): string {
    const s = this.stats();
    switch (id) {
      case 'membres': {
        const n = this.onlineCount();
        return n > 0 ? `${n} en ligne` : '';
      }
      case 'classement':
        return s?.rank != null ? `Tu es #${s.rank}` : '';
      case 'mes-matchs':
        return s && s.upcomingCount > 0 ? `${s.upcomingCount} à venir` : '';
      default:
        return '';
    }
  }
}
