import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SocketService } from './socket.service';
import { AuthStore } from '../stores/auth.store';
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  MessagePage,
} from '../models/conversation.model';

const API = '/api/v1/conversations';

interface MessageNewEvent { conversationId: string; message: ChatMessage; }
interface MessageReadEvent { conversationId: string; readerId: string; readAt: string; }

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly socket = inject(SocketService);
  private readonly store  = inject(AuthStore);

  /** Liste des conversations, triée par activité (plus récente d'abord). */
  readonly conversations = signal<ConversationSummary[]>([]);
  readonly unreadTotal   = computed(() =>
    this.conversations().reduce((sum, c) => sum + c.unread, 0),
  );

  /** Conversation actuellement ouverte à l'écran (pour ne pas la compter non-lue). */
  readonly activeId = signal<string | null>(null);

  /** Dernier message reçu en live — la vue conversation y réagit via un effect. */
  readonly incoming  = signal<MessageNewEvent | null>(null);
  /** Dernier accusé de lecture reçu — idem. */
  readonly readEvent = signal<MessageReadEvent | null>(null);

  private get myId(): string { return this.store.user()?.id ?? ''; }

  start(): void {
    this.refresh();
    this.socket.connect();

    this.socket.on<MessageNewEvent>('message:new', (ev) => {
      this.incoming.set(ev);
      this.applyIncoming(ev);
    });
    this.socket.on<MessageReadEvent>('message:read', (ev) => {
      this.readEvent.set(ev);
    });
    this.socket.on<{ id: string }>('conversation:new', () => this.refresh());
  }

  stop(): void {
    this.socket.off('message:new');
    this.socket.off('message:read');
    this.socket.off('conversation:new');
  }

  refresh(): void {
    this.http.get<ConversationSummary[]>(API).subscribe({
      next: (list) => this.conversations.set(list),
    });
  }

  getConversation(id: string) {
    return this.http.get<ConversationDetail>(`${API}/${id}`);
  }

  listMessages(id: string, before?: string) {
    return this.http.get<MessagePage>(`${API}/${id}/messages`, {
      params: before ? { before } : {},
    });
  }

  send(id: string, body: string) {
    return this.http.post<ChatMessage>(`${API}/${id}/messages`, { body });
  }

  markRead(id: string): void {
    this.http.post(`${API}/${id}/read`, {}).subscribe({
      next: () => this.conversations.update((list) =>
        list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
      ),
    });
  }

  /** Ouvre (ou crée) la conversation d'un match et navigue dessus. */
  openBySource(source: 'dispo' | 'quick', sourceId: string): void {
    this.http.get<ConversationDetail>(`${API}/by-source/${source}/${sourceId}`).subscribe({
      next: (conv) => this.router.navigate(['/messages', conv.id]),
    });
  }

  private applyIncoming(ev: MessageNewEvent): void {
    const list = this.conversations();
    const idx = list.findIndex((c) => c.id === ev.conversationId);
    if (idx === -1) {
      // conversation encore inconnue du client (jamais chargée) → on recharge la liste
      this.refresh();
      return;
    }

    const isMine = ev.message.senderId === this.myId;
    const isActive = this.activeId() === ev.conversationId;
    const conv = list[idx];
    const updated: ConversationSummary = {
      ...conv,
      lastMessage: {
        body: ev.message.body,
        createdAt: ev.message.createdAt,
        senderId: ev.message.senderId,
      },
      lastMessageAt: ev.message.createdAt,
      unread: isMine || isActive ? conv.unread : conv.unread + 1,
    };
    this.conversations.set([updated, ...list.slice(0, idx), ...list.slice(idx + 1)]);
  }
}
