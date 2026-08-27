import { Component, inject, computed } from '@angular/core';
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

  readonly hasUnread = computed(() => this.notifService.unreadCount() > 0);

  navigate(n: AppNotification): void {
    this.notifService.open(n);
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
