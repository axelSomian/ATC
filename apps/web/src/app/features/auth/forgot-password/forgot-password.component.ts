import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
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
            <h2>Mot de passe oublié</h2>
            <p class="text-muted">On vous envoie un lien pour en choisir un nouveau.</p>
          </div>

          @if (sent()) {
            <div class="form-alert" style="background:var(--color-accent-alpha);color:var(--color-ink)">
              Si un compte existe pour <strong>{{ form.controls.email.value }}</strong>, un e-mail vient d'être
              envoyé. Le lien est valable 30 minutes — pensez à regarder vos indésirables.
            </div>
            <p class="auth-footer"><a routerLink="/auth/login" class="link-clay">Retour à la connexion</a></p>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
              @if (error()) { <div class="form-alert">{{ error() }}</div> }

              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                  id="email"
                  type="email"
                  class="form-control"
                  [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
                  formControlName="email"
                  placeholder="votre@email.com"
                  autocomplete="email"
                />
                @if (form.controls.email.invalid && form.controls.email.touched) {
                  <span class="form-error">Email invalide</span>
                }
              </div>

              <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
                {{ loading() ? 'Envoi…' : 'Envoyer le lien' }}
              </button>
            </form>

            <p class="auth-footer">
              <a routerLink="/auth/login" class="link-clay">Retour à la connexion</a>
            </p>
          }
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'Une erreur est survenue. Réessayez.');
      },
    });
  }
}
