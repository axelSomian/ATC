import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-mark">ATC</span>
        <span class="logo-text">Abidjan Tennis</span>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span>{{ item.label }}</span>
          </a>
        }
        @if (store.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="active" class="nav-item">
            <span class="nav-icon" [innerHTML]="adminIcon"></span>
            <span>Administration</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        @if (user()) {
          <div class="user-chip">
            <div class="avatar avatar-sm">{{ user()!.initials }}</div>
            <div class="user-info">
              <span class="user-name">{{ user()!.name }}</span>
              <span class="user-level text-muted">Niveau {{ user()!.level }}</span>
            </div>
          </div>
        }
        <button class="btn-logout" (click)="logout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Déconnexion
        </button>
      </div>
    </aside>
  `,
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  protected readonly store = inject(AuthStore);
  readonly user = this.store.user;

  readonly adminIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

  readonly navItems: NavItem[] = [
    {
      label: 'Tableau de bord',
      route: '/dashboard',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    },
    {
      label: 'Membres',
      route: '/members',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    },
    {
      label: 'Matchmaking',
      route: '/matchmaking',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/><path d="M12 2c-2.76 4-2.76 16 0 20"/></svg>',
    },
    {
      label: 'Mes matchs',
      route: '/my-matches',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    },
    {
      label: 'Disponibilités',
      route: '/availability',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    },
    {
      label: 'Classement',
      route: '/rankings',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    },
    {
      label: 'Mon profil',
      route: '/profile',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
  ];

  logout(): void {
    this.authService.logout().subscribe();
  }
}
