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
        <svg class="visual-blueprint" viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect x="90" y="80" width="520" height="740" fill="none" stroke="#F4F5F1" stroke-width="2" />
          <line x1="90" y1="450" x2="610" y2="450" stroke="#F4F5F1" stroke-width="2" />
          <line x1="220" y1="80" x2="220" y2="820" stroke="#F4F5F1" stroke-width="2" />
          <line x1="480" y1="80" x2="480" y2="820" stroke="#F4F5F1" stroke-width="2" />
          <line x1="350" y1="260" x2="350" y2="640" stroke="#F4F5F1" stroke-width="2" />
        </svg>
        <div class="visual-content">
          <div class="visual-brand">
            <span class="visual-wordmark">TenCI</span>
            <span class="visual-official">Plateforme officielle</span>
          </div>
          <h1 class="visual-title">Le tennis ivoirien,<br />à armes égales.</h1>
          <p class="visual-sub">Retrouvez vos matchs, votre niveau et vos clubs.</p>
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
