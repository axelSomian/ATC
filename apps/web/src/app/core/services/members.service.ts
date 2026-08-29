import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { UserMe, UserProfile } from '../models/user.model';

const API = '/api/v1';

export interface UpdateProfilePayload {
  name?: string;
  bio?: string | null;
  age?: number | null;
  phone?: string | null;
  city?: string | null;
  clubId?: string | null;
  racquet?: string | null;
  level?: number;
  preferredCourts?: string[];
  preferredTimes?: string[];
}

export interface MembersPage {
  data: UserProfile[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MembersQuery {
  q?: string;
  level?: number;
  online?: boolean;
  city?: string;
  club?: string;
  page?: number;
  limit?: number;
}

export interface RankingEntry {
  rank:          number;
  id:            string;
  name:          string;
  initials:      string;
  avatarUrl:     string | null;
  level:         number;
  rating:        number;
  ratingDelta:   number;
  matchesPlayed: number;
  wins:          number;
  losses:        number;
  winRate:       number;
}

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);

  getMe() {
    return this.http.get<UserMe>(`${API}/members/me`);
  }

  updateMe(dto: UpdateProfilePayload) {
    return this.http.patch<UserMe>(`${API}/members/me`, dto);
  }

  getMember(id: string) {
    return this.http.get<UserProfile>(`${API}/members/${id}`);
  }

  listMembers(params?: MembersQuery) {
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== '') clean[k] = v as string | number | boolean;
    }
    return this.http.get<MembersPage>(`${API}/members`, { params: clean });
  }

  getRankings() {
    return this.http.get<RankingEntry[]>(`${API}/members/rankings`);
  }

  uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<UserMe>(`${API}/members/me/avatar`, fd);
  }
}
