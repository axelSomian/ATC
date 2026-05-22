import { MatchType } from '../enums.js';
import { UserPublic } from './user.js';

export interface Match {
  id: string;
  host: UserPublic;
  guest: UserPublic;
  playedAt: string;
  court: string;
  type: MatchType;
  scoreHost: string;
  scoreGuest: string;
  winnerId: string;
}
