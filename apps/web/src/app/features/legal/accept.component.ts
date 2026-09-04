import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

/**
 * Écran bloquant : tant que le membre n'a pas accepté la version courante des
 * CGU + politique de confidentialité, il ne peut pas accéder à l'application
 * (garde `termsGuard`). Sert aussi lors d'une mise à jour des textes.
 */
@Component({
  selector: 'app-legal-accept',
  standalone: true,
  styleUrl: './legal.css',
  template: `
    <div class="accept-page">
      <div class="accept-card">
        <span class="brand">ATC</span>
        <h1>Avant de continuer</h1>
        <p>
          Pour utiliser Abidjan Tennis Community, vous devez prendre connaissance et
          accepter nos conditions d'utilisation et notre politique de confidentialité.
        </p>

        <div class="accept-links">
          <a href="/legal/cgu" target="_blank" rel="noopener">Conditions d'utilisation ↗</a>
          <a href="/legal/confidentialite" target="_blank" rel="noopener">Politique de confidentialité ↗</a>
        </div>

        <label class="accept-check">
          <input type="checkbox" [checked]="checked()" (change)="checked.set($any($event.target).checked)" />
          <span>J'ai lu et j'accepte les conditions d'utilisation et la politique de confidentialité.</span>
        </label>

        <div class="accept-actions">
          <button class="btn btn-primary btn-sm" [disabled]="!checked() || busy()" (click)="accept()">
            {{ busy() ? 'Enregistrement…' : 'Continuer' }}
          </button>
          <button class="accept-refuse" [disabled]="busy()" (click)="refuse()">Refuser et se déconnecter</button>
        </div>
        @if (error()) { <p class="accept-err">{{ error() }}</p> }
      </div>
    </div>
  `,
})
export class LegalAcceptComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly checked = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  accept(): void {
    if (!this.checked() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.acceptTerms().subscribe({
      next: () => this.router.navigateByUrl('/accueil'),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.error?.error ?? "Impossible d'enregistrer votre acceptation.");
      },
    });
  }

  refuse(): void {
    this.auth.logout().subscribe();
  }
}
