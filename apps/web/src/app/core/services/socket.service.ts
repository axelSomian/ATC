import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthStore } from '../stores/auth.store';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.authStore.accessToken();
    if (!token) return;

    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler);
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
