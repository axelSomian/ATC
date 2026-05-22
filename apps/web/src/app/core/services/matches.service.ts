import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Match, UpcomingMatch } from '../models/match.model';

export interface MyStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  upcomingCount: number;
  membersTotal: number;
}

const API = '/api/v1';

export interface RecordMatchDto {
  sourceType: 'dispo' | 'quick';
  sourceId:   string;
  scoreHost:  string;
  scoreGuest: string;
  winnerRole: 'host' | 'guest';
}

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private readonly http = inject(HttpClient);

  getMyStats() {
    return this.http.get<MyStats>(`${API}/matches/me/stats`);
  }

  getMyMatches() {
    return this.http.get<Match[]>(`${API}/matches/me`);
  }

  getUpcoming() {
    return this.http.get<UpcomingMatch[]>(`${API}/dispos/upcoming`);
  }

  recordResult(dto: RecordMatchDto) {
    return this.http.post<Match>(`${API}/matches`, dto);
  }

  validateMatch(matchId: string, action: 'confirm' | 'dispute') {
    return this.http.patch<Match>(`${API}/matches/${matchId}/validate`, { action });
  }
}
