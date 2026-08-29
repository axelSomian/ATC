import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReferenceService } from '../../core/services/reference.service';
import type { ClubRef } from '../../core/models/reference.model';

const FAV_KEY = 'atc_fav_clubs';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Annuaire des clubs : grille de cartes visuelles (photo, nom, localisation,
 * nombre de membres ATC, favori). La carte renvoie vers les membres du club
 * (`/members?club=<slug>`). Favoris stockés par appareil (localStorage).
 * Source : `ReferenceService` (chargé au démarrage, `GET /api/v1/clubs`).
 */
@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.css',
})
export class ClubsComponent {
  private readonly reference = inject(ReferenceService);

  readonly search = signal('');
  readonly favorites = signal<Set<string>>(loadFavorites());

  private readonly realClubs = computed(() =>
    this.reference.clubs().filter((c) => c.slug !== 'autre'),
  );

  readonly total = computed(() => this.realClubs().length);
  readonly totalMembers = computed(() =>
    this.realClubs().reduce((sum, c) => sum + (c.memberCount ?? 0), 0),
  );

  /** Liste à plat, filtrée par la recherche, favoris en tête. */
  readonly visibleClubs = computed<ClubRef[]>(() => {
    const q = this.search().trim().toLowerCase();
    const favs = this.favorites();
    return this.realClubs()
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.zone.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      )
      .slice()
      .sort((a, b) => {
        const fa = favs.has(a.slug) ? 0 : 1;
        const fb = favs.has(b.slug) ? 0 : 1;
        return fa - fb || a.name.localeCompare(b.name);
      });
  });

  isFavorite(slug: string): boolean {
    return this.favorites().has(slug);
  }

  toggleFavorite(slug: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(this.favorites());
    next.has(slug) ? next.delete(slug) : next.add(slug);
    this.favorites.set(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
    } catch {
      /* stockage indisponible — favori gardé pour la session en cours */
    }
  }

  /** Initiale pour le visuel de repli quand le club n'a pas de photo. */
  initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }
}
