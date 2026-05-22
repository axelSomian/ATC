import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NotificationsService } from '../../core/services/notifications.service';
import type { AppNotification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent {
  readonly notifService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly hasUnread = computed(() => this.notifService.unreadCount() > 0);

  navigate(n: AppNotification): void {
    this.notifService.markRead(n.id);
    switch (n.type) {
      case 'match_request':       this.router.navigate(['/matchmaking'], { queryParams: { tab: 'mine' } }); break;
      case 'match_confirmed':     this.router.navigate(['/my-matches']); break;
      case 'match_declined':      this.router.navigate(['/matchmaking']); break;
      case 'quick_match_request': this.router.navigate(['/my-matches'], { queryParams: { tab: 'challenges' } }); break;
      case 'score_to_validate':   this.router.navigate(['/my-matches'], { queryParams: { tab: 'history' } }); break;
      case 'score_confirmed':     this.router.navigate(['/my-matches'], { queryParams: { tab: 'history' } }); break;
      case 'score_disputed':      this.router.navigate(['/my-matches'], { queryParams: { tab: 'history' } }); break;
    }
  }

  icon(type: string): string {
    switch (type) {
      case 'match_request':      return 'request';
      case 'match_confirmed':    return 'confirmed';
      case 'match_declined':     return 'declined';
      case 'score_to_validate':  return 'request';
      case 'score_confirmed':    return 'confirmed';
      case 'score_disputed':     return 'declined';
      default: return 'default';
    }
  }
}
