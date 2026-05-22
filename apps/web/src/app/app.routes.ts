import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'members',
        loadChildren: () =>
          import('./features/members/members.routes').then((m) => m.MEMBERS_ROUTES),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'matchmaking',
        loadComponent: () =>
          import('./features/match-finder/match-finder.component').then((m) => m.MatchFinderComponent),
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('./features/availability/availability.component').then((m) => m.AvailabilityComponent),
      },
      {
        path: 'my-matches',
        loadComponent: () =>
          import('./features/my-matches/my-matches.component').then((m) => m.MyMatchesComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'rankings',
        loadComponent: () =>
          import('./features/rankings/rankings.component').then((m) => m.RankingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
