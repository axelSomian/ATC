import { Injectable, inject, signal } from '@angular/core';
import { SocketService } from './socket.service';

/** Statut "en ligne" des membres, tenu à jour en temps réel via Socket.IO. */
@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly socket = inject(SocketService);
  private readonly _online = signal<ReadonlySet<string>>(new Set());
  private readonly _synced = signal(false);

  readonly online = this._online.asReadonly();

  start(): void {
    this.socket.connect();
    this.socket.on<string[]>('presence:sync', (ids) => {
      this._online.set(new Set(ids));
      this._synced.set(true);
    });
    this.socket.on<{ userId: string }>('member:online', ({ userId }) =>
      this._online.update((s) => new Set(s).add(userId)),
    );
    this.socket.on<{ userId: string }>('member:offline', ({ userId }) =>
      this._online.update((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      }),
    );
  }

  stop(): void {
    this.socket.off('presence:sync');
    this.socket.off('member:online');
    this.socket.off('member:offline');
    this._synced.set(false);
  }

  /** true si connu en ligne. Avant la synchro socket, retombe sur `fallback` (valeur API). */
  isOnline(userId: string | null | undefined, fallback = false): boolean {
    if (!userId) return false;
    return this._synced() ? this._online().has(userId) : fallback;
  }
}
