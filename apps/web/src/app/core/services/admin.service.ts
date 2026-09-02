import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AdminClub,
  AdminLevel,
  AdminMember,
  BroadcastPushPayload,
  BroadcastPushResult,
  ClubPayload,
  DisputedMatch,
  LevelPayload,
  PushStats,
} from '../models/admin.model';
import type { UserRole } from '../models/user.model';

const API = '/api/v1/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  /* ── Clubs ── */
  listClubs() {
    return this.http.get<AdminClub[]>(`${API}/clubs`);
  }
  createClub(payload: ClubPayload) {
    return this.http.post<AdminClub>(`${API}/clubs`, payload);
  }
  updateClub(id: string, payload: ClubPayload) {
    return this.http.patch<AdminClub>(`${API}/clubs/${id}`, payload);
  }
  deleteClub(id: string) {
    return this.http.delete<void>(`${API}/clubs/${id}`);
  }
  uploadClubImage(id: string, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<AdminClub>(`${API}/clubs/${id}/image`, fd);
  }

  /* ── Niveaux ── */
  listLevels() {
    return this.http.get<AdminLevel[]>(`${API}/levels`);
  }
  updateLevel(level: number, payload: LevelPayload) {
    return this.http.patch<AdminLevel>(`${API}/levels/${level}`, payload);
  }

  /* ── Litiges ── */
  listDisputedMatches() {
    return this.http.get<DisputedMatch[]>(`${API}/matches/disputed`);
  }
  resolveMatch(id: string, body: { winnerRole: 'host' | 'guest'; scoreHost?: string; scoreGuest?: string }) {
    return this.http.post(`${API}/matches/${id}/resolve`, body);
  }

  /* ── Notifications push ── */
  getPushStats() {
    return this.http.get<PushStats>(`${API}/push/stats`);
  }
  broadcastPush(payload: BroadcastPushPayload) {
    return this.http.post<BroadcastPushResult>(`${API}/push/broadcast`, payload);
  }

  /* ── Membres ── */
  listMembers() {
    return this.http.get<AdminMember[]>(`${API}/members`);
  }
  setMemberRole(id: string, role: UserRole) {
    return this.http.patch<{ id: string; name: string; role: UserRole }>(
      `${API}/members/${id}/role`,
      { role },
    );
  }
}
