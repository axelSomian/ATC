import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthStore } from '../stores/auth.store';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private socket: Socket | null = null;
  /** Handlers ré-appliqués à chaque (re)connexion. */
  private readonly handlers = new Map<string, (data: unknown) => void>();

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
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T>(event: string, handler: (data: T) => void): void {
    const h = handler as (data: unknown) => void;
    this.handlers.set(event, h);
    this.socket?.on(event, h);
  }

  off(event: string): void {
    this.handlers.delete(event);
    this.socket?.off(event);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
