import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ClubDetail } from '../models/reference.model';

const API = '/api/v1';

/** Accès à la fiche détaillée d'un club (données non mises en cache au démarrage). */
@Injectable({ providedIn: 'root' })
export class ClubsService {
  private readonly http = inject(HttpClient);

  get(slug: string) {
    return this.http.get<ClubDetail>(`${API}/clubs/${slug}`);
  }
}
