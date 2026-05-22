import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = '/api/v1';

export interface DispoUser {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  level: number;
  city?: string;
}

export interface DispoRequest {
  id: string;
  requesterId: string;
  status: 'pending' | 'accepted' | 'declined';
  requester?: DispoUser | null;
}

export interface DispoPost {
  id: string;
  when: string;
  duration: number;
  court: string;
  type: 'simple' | 'double' | 'mixte';
  note?: string | null;
  createdAt: string;
  userId: string;
  user: DispoUser;
  requests: DispoRequest[];
}

export interface DisposPage {
  data: DispoPost[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateDispoPayload {
  when: string;
  duration: number;
  court: string;
  type: 'simple' | 'double' | 'mixte';
  note?: string | null;
}

export interface DisposQuery {
  type?: 'simple' | 'double' | 'mixte';
  date?: string;
  level?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DisposService {
  private readonly http = inject(HttpClient);

  list(q?: DisposQuery) {
    return this.http.get<DisposPage>(`${API}/dispos`, { params: q as Record<string, string | number> });
  }

  mine() {
    return this.http.get<DispoPost[]>(`${API}/dispos/me`);
  }

  create(dto: CreateDispoPayload) {
    return this.http.post<DispoPost>(`${API}/dispos`, dto);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${API}/dispos/${id}`);
  }

  request(dispoId: string) {
    return this.http.post<DispoRequest>(`${API}/dispos/${dispoId}/request`, {});
  }

  accept(dispoId: string, reqId: string) {
    return this.http.post<DispoRequest>(`${API}/dispos/${dispoId}/requests/${reqId}/accept`, {});
  }

  decline(dispoId: string, reqId: string) {
    return this.http.post<DispoRequest>(`${API}/dispos/${dispoId}/requests/${reqId}/decline`, {});
  }
}
