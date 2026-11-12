import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = '/api/v1';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  status: 'upcoming' | 'open' | 'closed' | 'completed';
  genderRule: 'homme' | 'femme' | null;
  minLevel: number | null;
  maxLevel: number | null;
  maxPlayers: number | null;
  rulesLabel: string | null;
  /** null = le joueur courant est éligible ; sinon le motif à afficher. */
  ineligibleReason: string | null;
  registrationsCount: number;
  registered: boolean;
  bracketPublished: boolean;
}

export interface BracketPlayer {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
}

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  playerA: BracketPlayer | null;
  playerB: BracketPlayer | null;
  winner: BracketPlayer | null;
  scoreText: string | null;
  playedAt: string | null;
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

export interface Bracket {
  published: boolean;
  generated: boolean;
  totalRounds: number;
  champion: BracketPlayer | null;
  rounds: BracketRound[];
}

export interface TournamentParticipant {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  level: number;
}

export interface TournamentResultEntry {
  userId: string;
  points: number;
  position: number | null;
  user: Pick<TournamentParticipant, 'id' | 'name' | 'initials' | 'avatarUrl'>;
}

export interface TournamentDetail extends Omit<Tournament, 'registrationsCount'> {
  registered: boolean;
  participants: TournamentParticipant[];
  results: TournamentResultEntry[];
}

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Tournament[]>(`${API}/tournaments`);
  }

  getOne(id: string) {
    return this.http.get<TournamentDetail>(`${API}/tournaments/${id}`);
  }

  register(id: string) {
    return this.http.post<TournamentDetail>(`${API}/tournaments/${id}/register`, {});
  }

  unregister(id: string) {
    return this.http.delete<TournamentDetail>(`${API}/tournaments/${id}/register`);
  }

  getBracket(id: string) {
    return this.http.get<Bracket>(`${API}/tournaments/${id}/bracket`);
  }
}
