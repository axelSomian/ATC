import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
            <h2>Nouveau mot de passe</h2>
            <p class="text-muted">Choisissez un mot de passe d'au moins 8 caractères.</p>
          </div>

          @if (!token) {
            <div class="form-alert">Lien invalide. <a routerLink="/auth/forgot-password" class="link-clay">Refaire une demande</a>.</div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
              @if (error()) { <div class="form-alert">{{ error() }}</div> }

              <div class="form-group">
                <label class="form-label" for="password">Nouveau mot de passe</label>
                <input
                  id="password"
                  type="password"
                  class="form-control"
                  [class.is-invalid]="form.controls.password.invalid && form.controls.password.touched"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                @if (form.controls.password.invalid && form.controls.password.touched) {
                  <span class="form-error">Minimum 8 caractères</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="confirm">Confirmer</label>
                <input
                  id="confirm"
                  type="password"
                  class="form-control"
                  [class.is-invalid]="mismatch()"
                  formControlName="confirm"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                @if (mismatch()) { <span class="form-error">Les mots de passe ne correspondent pas</span> }
              </div>

              <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
                {{ loading() ? 'Enregistrement…' : 'Changer le mot de passe' }}
              </button>
            </form>
          }

          <p class="auth-footer">
            <a routerLink="/auth/login" class="link-clay">Retour à la connexion</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });
  readonly loading = signal(false);
  readonly error = signal('');

  mismatch(): boolean {
    const { password, confirm } = this.form.controls;
    return confirm.touched && confirm.value.length > 0 && password.value !== confirm.value;
  }

  submit(): void {
    if (this.form.invalid || this.mismatch() || this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => this.router.navigate(['/accueil']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'Lien invalide ou expiré. Refaites une demande.');
      },
    });
  }
}
