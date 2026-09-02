import { Component, computed, inject, signal } from '@angular/core';
import { PushService } from '../../core/services/push.service';

const KEY = 'atc_push_prompt_dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Invite à activer les notifications, affichée une fois au lancement (repoussée
 * 7 jours si « Plus tard »). Le bouton « Activer » déclenche la demande de
 * permission — obligatoire sur iOS où un prompt automatique est ignoré.
 */
@Component({
  selector: 'app-push-prompt',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="push-prompt" role="dialog" aria-label="Activer les notifications">
        <span class="pp-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <div class="pp-body">
          <strong>Activer les notifications</strong>
          <p>Demandes de match, défis, messages — même l'application fermée.</p>
        </div>
        <div class="pp-actions">
          <button class="pp-later" (click)="later()">Plus tard</button>
          <button class="btn btn-primary btn-sm" (click)="enable()" [disabled]="busy()">
            {{ busy() ? '…' : 'Activer' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .push-prompt {
      position: fixed;
      z-index: 300;
      left: 50%;
      transform: translateX(-50%);
      bottom: calc(var(--bottom-nav-height) + 12px);
      width: calc(100% - 24px);
      max-width: 420px;
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--color-deep-forest);
      color: #fff;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      animation: pp-in 0.25s ease;
    }
    @media (min-width: 768px) {
      .push-prompt { left: auto; right: 20px; bottom: 20px; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) { .push-prompt { animation: none; } }
    @keyframes pp-in { from { opacity: 0; transform: translate(-50%, 12px); } }

    .pp-icon {
      flex-shrink: 0;
      display: flex;
      width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.10);
      color: var(--color-sage);
    }
    .pp-body { flex: 1; min-width: 0; }
    .pp-body strong { display: block; font-size: var(--text-sm); font-weight: 600; }
    .pp-body p { margin: 2px 0 0; font-size: var(--text-xs); color: rgba(255, 255, 255, 0.62); line-height: 1.45; }

    .pp-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-1);
      flex-wrap: wrap;
    }
    .pp-later {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.55);
      font: inherit;
      font-size: var(--text-xs);
      cursor: pointer;
      padding: 6px 4px;
    }
    .pp-later:hover { color: #fff; }
  `],
})
export class PushPromptComponent {
  readonly push = inject(PushService);
  readonly busy = signal(false);
  private readonly dismissed = signal(this.wasDismissed());
  private readonly delayed = signal(false);

  readonly visible = computed(
    () => this.push.ready() && this.push.state() === 'default' && !this.dismissed() && this.delayed(),
  );

  constructor() {
    setTimeout(() => this.delayed.set(true), 1500);
  }

  async enable(): Promise<void> {
    this.busy.set(true);
    try {
      await this.push.enable();
    } finally {
      this.busy.set(false);
    }
  }

  later(): void {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    this.dismissed.set(true);
  }

  private wasDismissed(): boolean {
    try {
      const v = localStorage.getItem(KEY);
      return v != null && Date.now() - Number(v) < SNOOZE_MS;
    } catch {
      return false;
    }
  }
}
