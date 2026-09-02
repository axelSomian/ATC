import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { CourtMapComponent } from '../../shared/court-map/court-map.component';
import { NotificationsService } from '../../core/services/notifications.service';
import { PresenceService } from '../../core/services/presence.service';
import { MessagesService } from '../../core/services/messages.service';
import { PushService } from '../../core/services/push.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, MobileNavComponent, CourtMapComponent],
  template: `
    <div class="layout">
      <app-topbar />
      <div class="layout-body">
        <app-sidebar />
        <main class="layout-content">
          <router-outlet />
        </main>
      </div>
      <app-mobile-nav />
      <app-court-map />
    </div>
  `,
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnDestroy {
  private readonly notifService = inject(NotificationsService);
  private readonly presence = inject(PresenceService);
  private readonly messages = inject(MessagesService);
  private readonly push = inject(PushService);

  constructor() {
    this.notifService.start();
    this.presence.start();
    this.messages.start();
    this.push.init();
  }
  ngOnDestroy(): void {
    this.messages.stop();
    this.notifService.stop();
    this.presence.stop();
  }
}
