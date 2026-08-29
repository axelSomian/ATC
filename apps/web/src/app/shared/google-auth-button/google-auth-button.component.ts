import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  output,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface GoogleGsi {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (res: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

/**
 * Bouton « Continuer avec Google » (Google Identity Services).
 * Ne s'affiche que si `environment.googleClientId` est renseigné.
 * Gère tout le flux : ID token → POST /auth/google → session → navigation.
 */
@Component({
  selector: 'app-google-auth-button',
  standalone: true,
  imports: [],
  template: `
    @if (enabled) {
      <div class="google-btn-wrap">
        <div #target class="google-btn-target"></div>
        @if (busy()) { <span class="google-btn-busy">Connexion…</span> }
      </div>
    }
  `,
  styles: [
    `
      .google-btn-wrap { display: flex; flex-direction: column; align-items: stretch; gap: 6px; }
      .google-btn-target { display: flex; justify-content: center; width: 100%; min-height: 40px; color-scheme: light; }
      .google-btn-busy { font-size: var(--text-sm); color: var(--color-muted); text-align: center; }
    `,
  ],
})
export class GoogleAuthButtonComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private readonly target = viewChild<ElementRef<HTMLElement>>('target');

  /** Erreur remontée au parent (login / signup) pour affichage. */
  readonly failed = output<string>();

  readonly busy = signal(false);
  readonly enabled = !!environment.googleClientId;

  private pollId?: ReturnType<typeof setInterval>;

  ngAfterViewInit(): void {
    if (!this.enabled) return;
    // Le script GSI est chargé en async dans index.html : on attend qu'il soit prêt.
    let tries = 0;
    this.pollId = setInterval(() => {
      const gsi = (window as unknown as { google?: GoogleGsi }).google;
      const host = this.target()?.nativeElement;
      if (gsi && host) {
        clearInterval(this.pollId);
        this.render(gsi, host);
      } else if (++tries > 50) {
        clearInterval(this.pollId);
        this.failed.emit("Le service Google n'a pas pu être chargé.");
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
  }

  private render(gsi: GoogleGsi, host: HTMLElement): void {
    gsi.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (res) => this.zone.run(() => this.onCredential(res.credential)),
      cancel_on_tap_outside: true,
    });
    // GSI n'accepte pas 100 % : on cale la largeur sur le conteneur (borné 240–400).
    const available = host.getBoundingClientRect().width || 320;
    const width = Math.round(Math.max(240, Math.min(400, available)));
    gsi.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'center',
      width,
      locale: 'fr',
    });
  }

  private onCredential(credential: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.auth.loginWithGoogle(credential).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.router.navigate([res.isNew ? '/profile' : '/accueil'], {
          queryParams: res.isNew ? { bienvenue: 1 } : {},
        });
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.failed.emit(err.error?.error ?? 'Connexion Google impossible.');
      },
    });
  }
}
