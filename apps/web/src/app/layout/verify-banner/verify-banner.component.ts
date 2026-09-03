import { Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../core/stores/auth.store';
import { AuthService } from '../../core/services/auth.service';

/**
 * Bandeau « confirmez votre adresse », visible tant que le compte n'est pas
 * vérifié. Fermable pour la session en cours (revient au prochain lancement).
 * Passé 7 jours sans confirmation, la publication d'annonces est bloquée côté API.
 */
@Component({
  selector: 'app-verify-banner',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="vb" role="status">
        <span class="vb-text">
          @if (sent()) {
            E-mail envoyé à <strong>{{ email() }}</strong>. Pensez à regarder vos spams.
          } @else {
            Confirmez votre adresse e-mail pour sécuriser votre compte et pouvoir publier des annonces.
          }
        </span>
        <span class="vb-actions">
          @if (!sent()) {
            <button type="button" class="vb-btn" [disabled]="busy()" (click)="resend()">
              {{ busy() ? 'Envoi…' : "Renvoyer l'e-mail" }}
            </button>
          }
          <button type="button" class="vb-close" aria-label="Fermer" (click)="dismiss()">×</button>
        </span>
      </div>
    }
  `,
  styles: [`
    .vb {
      display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
      padding: 10px var(--space-4);
      background: #F3E7CE; color: var(--color-ink-light);
      border-bottom: 1px solid var(--color-cream-dark);
      font-size: var(--text-sm);
    }
    .vb-text { flex: 1; min-width: 180px; line-height: 1.45; }
    .vb-actions { display: flex; align-items: center; gap: var(--space-2); }
    .vb-btn {
      background: var(--color-accent); color: #fff; border: none; cursor: pointer;
      font: inherit; font-size: var(--text-xs); font-weight: 600;
      padding: 6px 12px; border-radius: var(--radius-full);
    }
    .vb-btn:disabled { opacity: 0.5; cursor: default; }
    .vb-close {
      background: none; border: none; cursor: pointer; font-size: 18px; line-height: 1;
      color: var(--color-muted); padding: 0 4px;
    }
    .vb-close:hover { color: var(--color-ink); }
  `],
})
export class VerifyBannerComponent {
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);

  readonly busy = signal(false);
  readonly sent = signal(false);
  private readonly closed = signal(false);

  readonly email = computed(() => this.store.user()?.email ?? '');
  readonly visible = computed(
    () => this.store.isAuthenticated() && this.store.user()?.emailVerified === false && !this.closed(),
  );

  resend(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.auth.resendVerification().subscribe({
      next: (r) => {
        this.busy.set(false);
        if (r.alreadyVerified) {
          this.auth.getMe().subscribe({ error: () => {} }); // le bandeau disparaît
        } else {
          this.sent.set(true);
        }
      },
      error: () => this.busy.set(false),
    });
  }

  dismiss(): void { this.closed.set(true); }
}
