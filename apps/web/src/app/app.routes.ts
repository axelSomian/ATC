import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, termsGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'accueil', pathMatch: 'full' },
  // Actions déclenchées par un lien e-mail : doivent fonctionner que l'utilisateur
  // soit connecté ou non (après inscription il l'est → pas de guestGuard ici).
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'legal/confidentialite',
    loadComponent: () =>
      import('./features/legal/privacy.component').then((m) => m.LegalPrivacyComponent),
  },
  {
    path: 'legal/cgu',
    loadComponent: () =>
      import('./features/legal/terms.component').then((m) => m.LegalTermsComponent),
  },
  {
    path: 'legal/accept',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/legal/accept.component').then((m) => m.LegalAcceptComponent),
  },
  {
    path: '',
    canActivate: [authGuard, termsGuard],
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
        path: 'clubs/:slug',
        loadComponent: () =>
          import('./features/clubs/club-detail/club-detail.component').then(
            (m) => m.ClubDetailComponent,
          ),
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
        path: 'actualite',
        loadComponent: () =>
          import('./features/news/news.component').then((m) => m.NewsComponent),
      },
      {
        path: 'actualite/evenements',
        loadComponent: () =>
          import('./features/news/events.component').then((m) => m.NewsEventsComponent),
      },
      {
        path: 'actualite/:slug',
        loadComponent: () =>
          import('./features/news/news-detail.component').then((m) => m.NewsDetailComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./features/messages/conversation.component').then((m) => m.ConversationComponent),
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
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'accueil' },
];
