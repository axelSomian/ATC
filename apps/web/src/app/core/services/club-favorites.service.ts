import { Injectable, signal } from '@angular/core';

const KEY = 'atc_fav_clubs';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Clubs favoris de l'utilisateur — stockés par appareil (localStorage), pas de
 * backend. Partagé entre l'annuaire `/clubs` et la fiche `/clubs/:slug`.
 */
@Injectable({ providedIn: 'root' })
export class ClubFavoritesService {
  private readonly _slugs = signal<Set<string>>(load());
  readonly slugs = this._slugs.asReadonly();

  has(slug: string): boolean {
    return this._slugs().has(slug);
  }

  toggle(slug: string): void {
    const next = new Set(this._slugs());
    next.has(slug) ? next.delete(slug) : next.add(slug);
    this._slugs.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* stockage indisponible — favori gardé pour la session */
    }
  }
}
