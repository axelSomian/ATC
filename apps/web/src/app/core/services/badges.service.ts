import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { BadgesPayload } from '../models/badge.model';

const API = '/api/v1';

@Injectable({ providedIn: 'root' })
export class BadgesService {
  private readonly http = inject(HttpClient);

  /** Badges du joueur connecté (séries + hauts faits verrouillés inclus). */
  getMine() {
    return this.http.get<BadgesPayload>(`${API}/badges/me`);
  }

  /** Badges d'un autre membre. */
  getFor(userId: string) {
    return this.http.get<BadgesPayload>(`${API}/badges/${userId}`);
  }
}
