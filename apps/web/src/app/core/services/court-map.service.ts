import { Injectable, computed, inject, signal } from '@angular/core';
import { ReferenceService } from './reference.service';
import type { ClubRef } from '../models/reference.model';

/** Lieu à afficher sur la carte : soit un club du catalogue, soit juste un nom libre. */
export interface CourtMapTarget {
  name: string;
  zone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Pilote la fenêtre carte (`<app-court-map>` monté une fois dans le layout).
 * N'importe quelle carte de match peut appeler `open(nomDuLieu)`. Le lieu est
 * résolu contre le catalogue des clubs (entité « lieu » unique).
 */
@Injectable({ providedIn: 'root' })
export class CourtMapService {
  private readonly reference = inject(ReferenceService);
  private readonly _target = signal<CourtMapTarget | null>(null);

  readonly target = this._target.asReadonly();
  readonly isOpen = computed(() => this._target() !== null);

  open(venueName: string | null | undefined): void {
    const name = (venueName ?? '').trim();
    if (!name) return;
    const club: ClubRef | undefined = this.reference.venueByName(name);
    this._target.set({
      name: club?.name ?? name,
      zone: club?.zone ?? '',
      address: '',
      lat: club?.lat ?? null,
      lng: club?.lng ?? null,
    });
  }

  close(): void {
    this._target.set(null);
  }
}
