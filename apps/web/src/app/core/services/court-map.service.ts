import { Injectable, computed, inject, signal } from '@angular/core';
import { ReferenceService } from './reference.service';
import type { CourtRef } from '../models/reference.model';

/** Terrain à afficher sur la carte : soit un terrain du catalogue, soit juste un nom libre. */
export interface CourtMapTarget {
  name: string;
  zone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Pilote la fenêtre carte (`<app-court-map>` monté une fois dans le layout).
 * N'importe quelle carte de match peut appeler `open(nomDuTerrain)`.
 */
@Injectable({ providedIn: 'root' })
export class CourtMapService {
  private readonly reference = inject(ReferenceService);
  private readonly _target = signal<CourtMapTarget | null>(null);

  readonly target = this._target.asReadonly();
  readonly isOpen = computed(() => this._target() !== null);

  open(courtName: string | null | undefined): void {
    const name = (courtName ?? '').trim();
    if (!name) return;
    const match: CourtRef | undefined = this.reference.courtByName(name);
    this._target.set({
      name: match?.name ?? name,
      zone: match?.zone ?? '',
      address: match?.address ?? '',
      lat: match?.lat ?? null,
      lng: match?.lng ?? null,
    });
  }

  close(): void {
    this._target.set(null);
  }
}
