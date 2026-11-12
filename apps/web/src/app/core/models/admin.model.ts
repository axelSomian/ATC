import type { UserRole } from './user.model';
import type { LicenceCategory } from '../services/licence.service';

export interface AdminClub {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
  address: string | null;
  description: string | null;
  feesInfo: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AdminLevel {
  level: number;
  code: string;
  nom: string;
  profil: string;
  jeu: string;
  updatedAt: string;
}

export interface AdminOverview {
  membersCount: number;
  clubsCount: number;
  licencesActive: number;
  licencesRevenue: number;
  tournamentsTotal: number;
  tournamentsOpen: number;
  tournamentRegistrationsTotal: number;
  matchesConfirmed: number;
  pushSubscriptions: number;
  pushUsers: number;
  newsPublished: number;
  levelDistribution: { level: number; count: number }[];
  tournamentsByStatus: { status: string; label: string; count: number }[];
  licencesByCategory: { category: string; label: string; count: number }[];
  matchesPerDay: { date: string; count: number }[];
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: number;
  role: UserRole;
  online: boolean;
  joinedAt: string;
  club: { id: string; name: string } | null;
}

export type ClubPayload = Partial<Omit<AdminClub, 'id' | 'createdAt'>>;
export type LevelPayload = Partial<Pick<AdminLevel, 'code' | 'nom' | 'profil' | 'jeu'>>;

export interface PushStats {
  subscriptions: number;
  users: number;
}

export interface BroadcastPushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface BroadcastPushResult {
  subscriptions: number;
  sent: number;
  failed: number;
}

export type TournamentStatus = 'upcoming' | 'open' | 'closed' | 'completed';
export type TournamentGenderRule = 'homme' | 'femme' | null;

export interface AdminTournament {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  status: TournamentStatus;
  genderRule: TournamentGenderRule;
  minLevel: number | null;
  maxLevel: number | null;
  maxPlayers: number | null;
  allowedLicenceCategories: LicenceCategory[];
  bracketPublished: boolean;
  createdAt: string;
  _count: { registrations: number; results: number };
}

export type TournamentPayload = Partial<{
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  status: TournamentStatus;
  genderRule: TournamentGenderRule;
  minLevel: number | null;
  maxLevel: number | null;
  allowedLicenceCategories: LicenceCategory[];
  maxPlayers: number | null;
}>;

export interface TournamentRegistrant {
  user: { id: string; name: string; initials: string; avatarUrl: string | null; level: number; isGuest: boolean };
  registeredAt: string;
  result: { points: number; position: number | null } | null;
}

export interface TournamentRegistrationsView {
  id: string;
  name: string;
  status: TournamentStatus;
  maxPlayers: number | null;
  registrations: TournamentRegistrant[];
}

export type AddTournamentRegistrantPayload = { userId: string } | { name: string };

export interface TournamentResultInput {
  userId: string;
  points: number;
  position?: number | null;
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
  generated: boolean;
  totalRounds: number;
  champion: BracketPlayer | null;
  rounds: BracketRound[];
}

export interface SetMatchResultPayload {
  winnerId: string;
  scoreText?: string | null;
}

export interface SwapBracketPlayersPayload {
  userIdA: string;
  userIdB: string;
}
