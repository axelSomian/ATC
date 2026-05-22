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

export interface UserPublic {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  level: number;
  city?: string;
  club?: string;
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
  winStreak?: number;
  recentMatches?: RecentMatch[];
}

export interface UserMe extends UserProfile {
  email: string;
  phone?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: number;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}
