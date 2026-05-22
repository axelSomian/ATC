import type { MatchPlayer } from './match.model';

export interface QuickMatch {
  id: string;
  challengerId: string;
  challengedId: string;
  when: string;
  court: string;
  type: 'simple' | 'double' | 'mixte';
  note?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  challenger: MatchPlayer;
  challenged: MatchPlayer;
}

export interface CreateQuickMatchDto {
  challengedId: string;
  when: string;
  court: string;
  type: 'simple' | 'double' | 'mixte';
  note?: string;
}
