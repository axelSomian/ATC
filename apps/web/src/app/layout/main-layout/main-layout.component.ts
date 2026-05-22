import { Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, MobileNavComponent],
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
    </div>
  `,
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnDestroy {
  private readonly notifService = inject(NotificationsService);

  constructor() { this.notifService.start(); }
  ngOnDestroy(): void { this.notifService.stop(); }
}
