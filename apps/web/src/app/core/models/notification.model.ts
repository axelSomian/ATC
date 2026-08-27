export type NotifType = 'match_request' | 'match_confirmed' | 'match_declined' | 'quick_match_request' | 'score_to_validate' | 'score_confirmed' | 'score_disputed' | 'score_resolved';

export interface AppNotification {
  id: string;
  type: NotifType;
  payload: {
    requesterName?: string;
    requesterId?: string;
    challengerName?: string;
    challengerId?: string;
    dispoId?: string;
    quickMatchId?: string;
    matchId?: string;
    when?: string;
    playedAt?: string;
    court?: string;
    scoreHost?: string;
    scoreGuest?: string;
  };
  readAt: string | null;
  createdAt: string;
}
