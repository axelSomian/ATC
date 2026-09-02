import { Injectable, signal } from '@angular/core';

const KEY = 'atc_saved_news';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Actualités enregistrées par l'utilisateur — par appareil (localStorage), pas de backend. */
@Injectable({ providedIn: 'root' })
export class NewsBookmarksService {
  private readonly _ids = signal<Set<string>>(load());
  readonly ids = this._ids.asReadonly();

  has(id: string): boolean {
    return this._ids().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this._ids());
    next.has(id) ? next.delete(id) : next.add(id);
    this._ids.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* stockage indisponible */
    }
  }
}
