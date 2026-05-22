import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthStore } from '../../core/stores/auth.store';
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  private readonly store   = inject(AuthStore);
  readonly notifService    = inject(NotificationsService);
  readonly user            = this.store.user;
  readonly open            = signal(false);

  togglePanel(): void { this.open.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.notif-bell-wrap')) this.open.set(false);
  }

  markRead(id: string, e: MouseEvent): void {
    e.stopPropagation();
    this.notifService.markRead(id);
  }

  markAll(e: MouseEvent): void {
    e.stopPropagation();
    this.notifService.markAllRead();
  }
}
