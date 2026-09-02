import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { BroadcastPushResult, PushStats } from '../../../core/models/admin.model';

const LINKS = [
  { label: 'Accueil', value: '/accueil' },
  { label: 'Matchs', value: '/matchs' },
  { label: 'Classement', value: '/rankings' },
  { label: 'Clubs', value: '/clubs' },
  { label: 'Membres', value: '/members' },
];

@Component({
  selector: 'app-push-panel',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      <div class="admin-card card">
        <div class="admin-card-head"><strong>Notification à tous les membres</strong></div>

        @if (stats(); as s) {
          <p class="text-muted" style="font-size:var(--text-sm);margin:0 0 var(--space-4)">
            {{ s.subscriptions }} appareil{{ s.subscriptions > 1 ? 's' : '' }} abonné{{ s.subscriptions > 1 ? 's' : '' }}
            · {{ s.users }} membre{{ s.users > 1 ? 's' : '' }}
          </p>
        }

        <div class="field-row">
          <label>Titre</label>
          <input type="text" [ngModel]="title()" (ngModelChange)="title.set($event)"
            maxlength="80" placeholder="Ex : Tournoi ce week-end" />

          <label>Message</label>
          <textarea [ngModel]="body()" (ngModelChange)="body.set($event)" maxlength="300" rows="3"
            placeholder="Ex : Inscriptions ouvertes jusqu'à vendredi 18h."></textarea>

          <label>Ouvre sur</label>
          <select [ngModel]="url()" (ngModelChange)="url.set($event)">
            @for (l of links; track l.value) { <option [value]="l.value">{{ l.label }}</option> }
          </select>
        </div>

        @if (result(); as r) {
          <p class="form-msg ok">
            Envoyée : {{ r.sent }} appareil{{ r.sent > 1 ? 's' : '' }}
            @if (r.failed > 0) { · {{ r.failed }} échec{{ r.failed > 1 ? 's' : '' }} }
          </p>
        }
        @if (error()) { <p class="form-msg err">{{ error() }}</p> }

        <div class="row-actions">
          <button class="btn btn-primary btn-sm" [disabled]="busy() || !canSend()" (click)="send()">
            {{ busy() ? 'Envoi…' : 'Envoyer la notification' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PushPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly links = LINKS;
  readonly stats = signal<PushStats | null>(null);
  readonly title = signal('');
  readonly body = signal('');
  readonly url = signal('/accueil');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly result = signal<BroadcastPushResult | null>(null);

  readonly canSend = computed(() => this.title().trim().length > 0 && this.body().trim().length > 0);

  ngOnInit(): void {
    this.admin.getPushStats().subscribe({ next: (s) => this.stats.set(s) });
  }

  send(): void {
    if (!this.canSend()) return;
    this.busy.set(true);
    this.error.set('');
    this.result.set(null);
    this.admin
      .broadcastPush({ title: this.title().trim(), body: this.body().trim(), url: this.url() })
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.busy.set(false);
          this.title.set('');
          this.body.set('');
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.error ?? 'Échec de l’envoi.');
          this.busy.set(false);
        },
      });
  }
}
