import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AddTournamentRegistrantPayload,
  AdminClub,
  AdminLevel,
  AdminMember,
  AdminOverview,
  AdminTournament,
  Bracket,
  BroadcastPushPayload,
  BroadcastPushResult,
  ClubPayload,
  LevelPayload,
  PushStats,
  SetMatchResultPayload,
  SwapBracketPlayersPayload,
  TournamentPayload,
  TournamentRegistrationsView,
  TournamentResultInput,
} from '../models/admin.model';
import type { UserRole } from '../models/user.model';

const API = '/api/v1/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  /* ── Vue d'ensemble ── */
  getOverview() {
    return this.http.get<AdminOverview>(`${API}/overview`);
  }

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

  /* ── Notifications push ── */
  getPushStats() {
    return this.http.get<PushStats>(`${API}/push/stats`);
  }
  broadcastPush(payload: BroadcastPushPayload) {
    return this.http.post<BroadcastPushResult>(`${API}/push/broadcast`, payload);
  }

  /* ── Tournois ── */
  listTournaments() {
    return this.http.get<AdminTournament[]>(`${API}/tournaments`);
  }
  createTournament(payload: TournamentPayload) {
    return this.http.post<AdminTournament>(`${API}/tournaments`, payload);
  }
  updateTournament(id: string, payload: TournamentPayload) {
    return this.http.patch<AdminTournament>(`${API}/tournaments/${id}`, payload);
  }
  deleteTournament(id: string) {
    return this.http.delete<void>(`${API}/tournaments/${id}`);
  }
  getTournamentRegistrations(id: string) {
    return this.http.get<TournamentRegistrationsView>(`${API}/tournaments/${id}/registrations`);
  }
  setTournamentResults(id: string, results: TournamentResultInput[]) {
    return this.http.post<TournamentRegistrationsView>(`${API}/tournaments/${id}/results`, { results });
  }
  addTournamentRegistrant(id: string, payload: AddTournamentRegistrantPayload) {
    return this.http.post<TournamentRegistrationsView>(`${API}/tournaments/${id}/registrations`, payload);
  }
  removeTournamentRegistrant(id: string, userId: string) {
    return this.http.delete<TournamentRegistrationsView>(`${API}/tournaments/${id}/registrations/${userId}`);
  }
  getBracket(id: string) {
    return this.http.get<Bracket>(`${API}/tournaments/${id}/bracket`);
  }
  generateBracket(id: string, force = false) {
    return this.http.post<Bracket>(`${API}/tournaments/${id}/bracket`, { force });
  }
  setMatchResult(id: string, matchId: string, payload: SetMatchResultPayload) {
    return this.http.patch<Bracket>(`${API}/tournaments/${id}/bracket/matches/${matchId}`, payload);
  }
  swapBracketPlayers(id: string, payload: SwapBracketPlayersPayload) {
    return this.http.patch<Bracket>(`${API}/tournaments/${id}/bracket/swap`, payload);
  }
  setBracketPublished(id: string, published: boolean) {
    return this.http.patch<Bracket>(`${API}/tournaments/${id}/bracket/publish`, { published });
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
