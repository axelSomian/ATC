import { Injectable, NgZone, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthStore } from '../stores/auth.store';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly zone = inject(NgZone);
  private socket: Socket | null = null;
  /** Handlers ré-appliqués à chaque (re)connexion. */
  private readonly handlers = new Map<string, (data: unknown) => void>();
  /** Conversation ouverte à l'écran — ré-émise à chaque reconnexion. */
  private currentConversation: string | null = null;

  connect(): void {
    if (this.socket) return; // déjà connecté ou en cours
    const token = this.authStore.accessToken();
    if (!token) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    for (const [event, handler] of this.handlers) {
      this.socket.on(event, handler);
    }

    // À chaque (re)connexion, resignaler la conversation ouverte (le serveur
    // suit ça par socket.id, qui change à la reconnexion).
    this.socket.on('connect', () => {
      if (this.currentConversation) this.socket?.emit('conversation:enter', this.currentConversation);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  enterConversation(conversationId: string): void {
    this.currentConversation = conversationId;
    this.socket?.emit('conversation:enter', conversationId);
  }

  leaveConversation(): void {
    this.currentConversation = null;
    this.socket?.emit('conversation:leave');
  }

  on<T>(event: string, handler: (data: T) => void): void {
    // Les callbacks Socket.IO arrivent hors de la zone Angular : on les y ramène
    // pour que les mises à jour de signaux déclenchent bien la détection de changements.
    const h = (data: unknown) => this.zone.run(() => (handler as (d: unknown) => void)(data));
    this.handlers.set(event, h);
    this.socket?.on(event, h);
  }

  off(event: string): void {
    this.handlers.delete(event);
    this.socket?.off(event);
  }

  emit(event: string, ...args: unknown[]): void {
    this.socket?.emit(event, ...args);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
