import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, catchError } from 'rxjs';
import type { ClubRef, CourtRef, LevelRef } from '../models/reference.model';

const API = '/api/v1';

// Filet de sécurité si l'API de référence est injoignable au démarrage.
const FALLBACK_LEVEL_NAMES = ['', 'Débutant·e', 'Initié·e', 'Intermédiaire', 'Avancé·e', 'Compétition'];

/**
 * Données de référence (clubs, niveaux) chargées une fois au démarrage.
 * Source de vérité = base de données (éditable par un admin), exposée via /api/v1/clubs et /levels.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private readonly http = inject(HttpClient);

  private readonly _clubs = signal<ClubRef[]>([]);
  private readonly _courts = signal<CourtRef[]>([]);
  private readonly _levels = signal<LevelRef[]>([]);
  private loaded = false;

  readonly clubs = this._clubs.asReadonly();
  readonly courts = this._courts.asReadonly();
  readonly levels = this._levels.asReadonly();

  /** Noms de terrains pour les <select> (préférences, création d'annonce). */
  readonly courtNames = computed(() => this._courts().map((c) => c.name));

  /** Clubs groupés par zone pour un <select> (l'option « autre » est isolée). */
  readonly clubsByZone = computed(() => {
    const groups = new Map<string, ClubRef[]>();
    for (const c of this._clubs()) {
      if (c.slug === 'autre') continue;
      const list = groups.get(c.zone) ?? [];
      list.push(c);
      groups.set(c.zone, list);
    }
    return [...groups.entries()].map(([zone, clubs]) => ({ zone, clubs }));
  });

  readonly otherClub = computed(() => this._clubs().find((c) => c.slug === 'autre') ?? null);

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    forkJoin({
      clubs: this.http.get<ClubRef[]>(`${API}/clubs`).pipe(catchError(() => of<ClubRef[]>([]))),
      courts: this.http.get<CourtRef[]>(`${API}/courts`).pipe(catchError(() => of<CourtRef[]>([]))),
      levels: this.http.get<LevelRef[]>(`${API}/levels`).pipe(catchError(() => of<LevelRef[]>([]))),
    }).subscribe(({ clubs, courts, levels }) => {
      this._clubs.set(clubs);
      this._courts.set(courts);
      this._levels.set(levels);
    });
  }

  levelDef(level: number): LevelRef | undefined {
    return this._levels().find((l) => l.level === level);
  }

  levelLabel(level: number): string {
    return this.levelDef(level)?.nom ?? FALLBACK_LEVEL_NAMES[level] ?? '';
  }

  clubName(idOrSlug?: string | null): string {
    if (!idOrSlug) return '';
    return this._clubs().find((c) => c.id === idOrSlug || c.slug === idOrSlug)?.name ?? '';
  }

  /** Retrouve un terrain par son nom (insensible à la casse / aux espaces). */
  courtByName(name?: string | null): CourtRef | undefined {
    if (!name) return undefined;
    const key = name.trim().toLowerCase();
    return this._courts().find((c) => c.name.trim().toLowerCase() === key);
  }
}
