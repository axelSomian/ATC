import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { QuickMatch, CreateQuickMatchDto } from '../models/quick-match.model';

const API = '/api/v1/quick-matches';

@Injectable({ providedIn: 'root' })
export class QuickMatchesService {
  private readonly http = inject(HttpClient);

  getMine() {
    return this.http.get<QuickMatch[]>(`${API}/me`);
  }

  challenge(dto: CreateQuickMatchDto) {
    return this.http.post<QuickMatch>(API, dto);
  }

  accept(id: string) {
    return this.http.post<QuickMatch>(`${API}/${id}/accept`, {});
  }

  decline(id: string) {
    return this.http.post<QuickMatch>(`${API}/${id}/decline`, {});
  }
}
