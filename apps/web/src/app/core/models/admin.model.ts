import type { UserRole } from './user.model';

export interface AdminClub {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AdminCourt {
  id: string;
  slug: string;
  name: string;
  zone: string;
  address: string;
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

export interface DisputePlayer {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  level: number;
}

export interface DisputedMatch {
  id: string;
  hostId: string;
  guestId: string;
  playedAt: string;
  court: string;
  type: string;
  scoreHost: string;
  scoreGuest: string;
  winnerId: string;
  status: string;
  recordedBy: string | null;
  host: DisputePlayer;
  guest: DisputePlayer;
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
export type CourtPayload = Partial<Omit<AdminCourt, 'id' | 'createdAt'>>;
export type LevelPayload = Partial<Pick<AdminLevel, 'code' | 'nom' | 'profil' | 'jeu'>>;
