import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SocketService } from './socket.service';
import type { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly socket = inject(SocketService);

  readonly all         = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.all().filter(n => !n.readAt).length);

  start(): void {
    this.fetch();
    this.socket.connect();
    this.socket.on<AppNotification>('notification:new', (notif) => {
      this.all.update(list => [notif, ...list]);
    });
  }

  stop(): void {
    this.socket.off('notification:new');
    this.socket.disconnect();
  }

  private fetch(): void {
    this.http.get<AppNotification[]>('/api/v1/notifications/me').subscribe({
      next: list => this.all.set(list),
    });
  }

  /** Marque la notif lue puis navigue vers l'événement concerné. */
  open(n: AppNotification): void {
    this.markRead(n.id);
    const p = n.payload;
    switch (n.type) {
      case 'match_request':
        this.router.navigate(['/matchmaking'], { queryParams: { tab: 'mine', focus: p.dispoId ?? null } });
        break;
      case 'match_declined':
        this.router.navigate(['/matchmaking'], { queryParams: { tab: 'mine' } });
        break;
      case 'match_confirmed':
        this.router.navigate(['/my-matches'], { queryParams: { tab: 'upcoming', focus: p.dispoId ?? p.quickMatchId ?? null } });
        break;
      case 'quick_match_request':
        this.router.navigate(['/my-matches'], { queryParams: { tab: 'challenges', focus: p.quickMatchId ?? null } });
        break;
      case 'score_to_validate':
      case 'score_confirmed':
      case 'score_disputed':
      case 'score_resolved':
        this.router.navigate(['/my-matches'], { queryParams: { tab: 'history', focus: p.matchId ?? null } });
        break;
      default:
        this.router.navigate(['/notifications']);
    }
  }

  markRead(id: string): void {
    this.http.patch(`/api/v1/notifications/${id}/read`, {}).subscribe({
      next: () => this.all.update(list =>
        list.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
      ),
    });
  }

  markAllRead(): void {
    this.http.patch('/api/v1/notifications/read-all', {}).subscribe({
      next: () => this.all.update(list =>
        list.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      ),
    });
  }

  label(n: AppNotification): string {
    const { payload } = n;
    const when = payload.when
      ? new Date(payload.when).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
      : '';
    const court = payload.court ?? '';
    switch (n.type) {
      case 'match_request':
        return `${payload.requesterName ?? 'Un joueur'} veut rejoindre votre match du ${when} à ${court}`;
      case 'match_confirmed':
        return `Votre demande pour le ${when} à ${court} a été acceptée ✓`;
      case 'match_declined':
        return `Votre demande pour le ${when} à ${court} a été refusée`;
      case 'quick_match_request':
        return `${payload.challengerName ?? 'Un joueur'} vous défie à un match le ${when} à ${court}`;
      case 'score_to_validate':
        return `Votre adversaire a saisi un score — à valider`;
      case 'score_confirmed':
        return `Le score de votre match a été confirmé ✓`;
      case 'score_disputed':
        return `Le score de votre match a été contesté`;
      case 'score_resolved':
        return `Un administrateur a tranché le litige de votre match`;
      default:
        return 'Nouvelle notification';
    }
  }
}
