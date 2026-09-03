import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  styleUrl: '../login/login.component.css',
  template: `
    <div class="auth-page">
      <div class="auth-visual">
        <div class="visual-content">
          <div class="visual-badge">ATC</div>
          <h1 class="visual-title">Abidjan Tennis<br />Community</h1>
          <p class="visual-sub">La plateforme de référence pour les joueuses et joueurs de tennis à Abidjan.</p>
          <div class="ci-stripe"></div>
        </div>
      </div>

      <div class="auth-panel">
        <div class="auth-card">
          <div class="auth-header">
            <h2>Confirmation de l'adresse</h2>
          </div>

          @switch (state()) {
            @case ('loading') {
              <p class="text-muted">Vérification en cours…</p>
            }
            @case ('done') {
              <div class="form-alert form-alert--ok">Votre adresse e-mail est confirmée. Merci&nbsp;!</div>
              <p class="auth-footer">
                <a [routerLink]="isAuth() ? '/accueil' : '/auth/login'" class="link-clay">
                  {{ isAuth() ? "Retour à l'accueil" : 'Se connecter' }}
                </a>
              </p>
            }
            @case ('error') {
              <div class="form-alert">{{ error() }}</div>
              <p class="auth-footer">
                @if (isAuth()) {
                  <a routerLink="/profile" class="link-clay">Renvoyer un lien depuis mon profil</a>
                } @else {
                  <a routerLink="/auth/login" class="link-clay">Se connecter</a>
                }
              </p>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(AuthStore);

  readonly state = signal<'loading' | 'done' | 'error'>('loading');
  readonly error = signal('');
  readonly isAuth = this.store.isAuthenticated;

  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  constructor() {
    if (!this.token) {
      this.state.set('error');
      this.error.set('Lien invalide. Demandez un nouvel e-mail de confirmation.');
      return;
    }
    this.auth.verifyEmail(this.token).subscribe({
      next: () => {
        this.state.set('done');
        // Rafraîchit le profil en session pour faire disparaître le bandeau.
        if (this.store.accessToken()) this.auth.getMe().subscribe({ error: () => {} });
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('error');
        this.error.set(err.error?.error ?? 'Lien invalide ou expiré. Demandez un nouvel e-mail de confirmation.');
      },
    });
  }
}
