import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of, catchError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};

/**
 * Réserve une route aux admins. Au rechargement, le profil (donc le rôle)
 * n'est pas encore chargé : on force un /auth/me avant de trancher.
 */
export const adminGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const deny = () => router.createUrlTree(['/dashboard']);

  if (store.user()) return store.isAdmin() ? true : deny();
  if (!store.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  return auth.getMe().pipe(
    map(() => (store.isAdmin() ? true : deny())),
    catchError(() => of(deny())),
  );
};
