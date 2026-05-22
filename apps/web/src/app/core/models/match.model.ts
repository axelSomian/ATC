export interface MatchPlayer {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  level: number;
}

export interface Match {
  id: string;
  hostId: string;
  guestId: string;
  playedAt: string;
  court: string;
  type: string;
  scoreHost: string;
  scoreGuest: string;
  winnerId: string;
  status: 'pending' | 'confirmed' | 'disputed';
  recordedBy: string | null;
  host: MatchPlayer;
  guest: MatchPlayer;
}

export interface UpcomingMatch {
  id: string;           // dispoPostId ou quickMatchId selon source
  when: string;
  duration: number | null;
  court: string;
  type: 'simple' | 'double' | 'mixte';
  role: 'host' | 'guest';
  source: 'dispo' | 'quick';
  opponent: MatchPlayer | null;
}
