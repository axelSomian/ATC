import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'accueil', pathMatch: 'full' },
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
        path: 'accueil',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'members',
        loadChildren: () =>
          import('./features/members/members.routes').then((m) => m.MEMBERS_ROUTES),
      },
      {
        path: 'clubs',
        loadComponent: () =>
          import('./features/clubs/clubs.component').then((m) => m.ClubsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'matchs',
        loadComponent: () =>
          import('./features/matches-hub/matches-hub.component').then((m) => m.MatchesHubComponent),
      },
      { path: 'matchmaking', redirectTo: 'matchs', pathMatch: 'full' },
      { path: 'my-matches', redirectTo: 'matchs', pathMatch: 'full' },
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
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'accueil' },
];
