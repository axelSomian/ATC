export interface ConvParticipant {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  level: number;
}

/** Rappel du match rattaché à la conversation. */
export interface ConvMatchContext {
  source: 'dispo' | 'quick';
  sourceId: string;
  when: string;
  court: string;
  type: string;
  hostId: string;
  guestId: string;
}

export interface ConvLastMessage {
  body: string;
  createdAt: string;
  senderId: string;
}

export interface ConversationSummary {
  id: string;
  otherUser: ConvParticipant | null;
  lastMessage: ConvLastMessage | null;
  unread: number;
  lastMessageAt: string;
  match: ConvMatchContext | null;
}

export interface ConversationDetail {
  id: string;
  participants: ConvParticipant[];
  match: ConvMatchContext | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessagePage {
  data: ChatMessage[];
  hasMore: boolean;
}
