import { MatchRequestStatus, MatchType } from '../enums.js';
import { UserPublic } from './user.js';

export interface DispoPost {
  id: string;
  user: UserPublic;
  when: string;
  duration: number;
  court: string;
  type: MatchType;
  note?: string;
  createdAt: string;
  requestCount: number;
}

export interface MatchRequest {
  id: string;
  dispoPostId: string;
  requesterId: string;
  status: MatchRequestStatus;
}
