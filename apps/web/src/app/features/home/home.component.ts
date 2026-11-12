import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { ReferenceService } from '../../core/services/reference.service';
import { MatchesService, type MyStats } from '../../core/services/matches.service';
import { PresenceService } from '../../core/services/presence.service';
import { MessagesService } from '../../core/services/messages.service';
import { NewsService } from '../../core/services/news.service';
import { TournamentsService } from '../../core/services/tournaments.service';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { SectionTitleComponent } from '../../shared/ui/section-title.component';

interface QuickLink {
  id: 'clubs' | 'actualite' | 'messages' | 'tournois' | 'classement';
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, StatTileComponent, SectionTitleComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly reference = inject(ReferenceService);
  private readonly matchesSvc = inject(MatchesService);
  private readonly presence = inject(PresenceService);
  readonly messages = inject(MessagesService);
  private readonly news = inject(NewsService);
  private readonly tournamentsSvc = inject(TournamentsService);

  readonly user = this.store.user;
  readonly firstName = computed(() => this.user()?.name?.split(' ')[0] ?? '');
  readonly levelLabel = computed(() => this.reference.levelLabel(this.user()?.level ?? 1));
  readonly dots = [1, 2, 3, 4, 5];

  readonly stats = signal<MyStats | null>(null);
  readonly onlineCount = computed(() => this.presence.online().size);
  readonly latestNewsTitle = signal<string | null>(null);

  readonly matchmakingHint = computed(() => {
    const s = this.stats();
    if (!s) return 'Publie ta dispo, trouve un adversaire';
    if (s.upcomingCount > 0) {
      return s.upcomingCount === 1 ? '1 match à venir' : `${s.upcomingCount} matchs à venir`;
    }
    return 'Publie ta dispo, trouve un adversaire';
  });

  readonly clubsCount = computed(() => this.reference.clubs().filter((c) => c.slug !== 'autre').length);
  readonly openTournamentsCount = signal(0);

  readonly quickLinks: QuickLink[] = [
    {
      id: 'clubs',
      route: '/clubs',
      label: 'Clubs',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 11h.01M15 11h.01"/></svg>',
    },
    {
      id: 'actualite',
      route: '/actualite',
      label: 'Actualité',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>',
    },
    {
      id: 'messages',
      route: '/messages',
      label: 'Messages',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    },
    {
      id: 'tournois',
      route: '/tournois',
      label: 'Tournois',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/></svg>',
    },
    {
      id: 'classement',
      route: '/rankings',
      label: 'Classement',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    },
  ];

  ngOnInit(): void {
    this.matchesSvc.getMyStats().subscribe({ next: (s) => this.stats.set(s) });
    this.news.featured().subscribe({
      next: (posts) => this.latestNewsTitle.set(posts[0]?.title ?? null),
      error: () => this.latestNewsTitle.set(null),
    });
    this.tournamentsSvc.getAll().subscribe({
      next: (list) => this.openTournamentsCount.set(list.filter((t) => t.status === 'open').length),
      error: () => this.openTournamentsCount.set(0),
    });
  }

  hint(id: QuickLink['id']): string {
    switch (id) {
      case 'clubs':
        return this.clubsCount() > 0 ? `${this.clubsCount()} clubs référencés` : 'L’annuaire des clubs';
      case 'actualite':
        return this.latestNewsTitle() ?? 'Tournois, événements, infos fédérales';
      case 'messages': {
        const n = this.messages.unreadTotal();
        return n > 0 ? (n === 1 ? '1 message non lu' : `${n} messages non lus`) : 'Tes conversations de match';
      }
      case 'tournois':
        return this.openTournamentsCount() > 0
          ? `${this.openTournamentsCount()} tournoi${this.openTournamentsCount() > 1 ? 's' : ''} ouvert${this.openTournamentsCount() > 1 ? 's' : ''}`
          : 'Les tournois fédéraux à venir';
      case 'classement':
        return 'Alimenté par les résultats de tournoi';
    }
  }

  badge(id: QuickLink['id']): string | null {
    if (id === 'messages' && this.messages.unreadTotal() > 0) {
      return this.messages.unreadTotal() > 9 ? '9+' : String(this.messages.unreadTotal());
    }
    return null;
  }
}
