export interface MatchPlayer {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  level: number;
}

export interface RecentMatch {
  id: string;
  playedAt: string;
  court: string;
  type: string;
  scoreHost: string;
  scoreGuest: string;
  winnerId: string;
  hostId: string;
  guestId: string;
  host: MatchPlayer;
  guest: MatchPlayer;
}

import type { ClubRef } from './reference.model';

export interface UserPublic {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  level: number;
  city?: string;
  club?: ClubRef | null;
  online: boolean;
  joinedAt: string;
}

export interface UserProfile extends UserPublic {
  bio?: string;
  age?: number;
  racquet?: string;
  preferredCourts: string[];
  preferredTimes: string[];
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  rating?: number;
  ratingGames?: number;
  rank?: number | null;
  bestRanking?: number | null;
  winStreak?: number;
  recentMatches?: RecentMatch[];
}

export interface UserMe extends UserProfile {
  email: string;
  phone?: string | null;
  role: UserRole;
  emailVerified: boolean;
  termsAccepted: boolean;
}

export type UserRole = 'member' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: number;
  role: UserRole;
  emailVerified: boolean;
  termsAccepted: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface GoogleLoginResponse extends LoginResponse {
  /** true si le compte vient d'être créé (→ inviter à compléter le profil). */
  isNew: boolean;
}
