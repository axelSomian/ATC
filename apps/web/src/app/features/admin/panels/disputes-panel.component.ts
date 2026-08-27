import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { DisputedMatch } from '../../../core/models/admin.model';

interface Editable extends DisputedMatch {
  _winner: 'host' | 'guest';
  _scoreHost: string;
  _scoreGuest: string;
  _busy?: boolean;
  _err?: string;
}

@Component({
  selector: 'app-disputes-panel',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else if (matches().length === 0) {
        <p class="panel-empty">Aucun litige en attente. 🎾</p>
      } @else {
        @for (m of matches(); track m.id) {
          <div class="admin-card card">
            <div class="admin-card-head">
              <strong>{{ m.host.name }} vs {{ m.guest.name }}</strong>
              <span class="text-muted">{{ m.playedAt | date: 'dd/MM/yyyy' }} · {{ m.court }}</span>
            </div>

            <p class="text-muted" style="font-size: var(--text-xs); margin: 0;">
              Score saisi : {{ m.scoreHost }} / {{ m.scoreGuest }}
              @if (m.recordedBy) {
                — par {{ m.recordedBy === m.hostId ? m.host.name : m.guest.name }}
              }
            </p>

            <div class="field-row">
              <label>Score {{ m.host.name }}</label>
              <input type="text" [(ngModel)]="m._scoreHost" placeholder="6-4 7-5" />
              <label>Score {{ m.guest.name }}</label>
              <input type="text" [(ngModel)]="m._scoreGuest" placeholder="4-6 5-7" />
              <label>Vainqueur</label>
              <select [(ngModel)]="m._winner">
                <option value="host">{{ m.host.name }}</option>
                <option value="guest">{{ m.guest.name }}</option>
              </select>
            </div>

            @if (m._err) { <p class="form-msg err">{{ m._err }}</p> }

            <div class="row-actions">
              <button class="btn btn-primary btn-sm" [disabled]="m._busy" (click)="resolve(m)">
                {{ m._busy ? 'Validation…' : 'Trancher et confirmer' }}
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DisputesPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly matches = signal<Editable[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.admin.listDisputedMatches().subscribe({
      next: (list) => {
        this.matches.set(
          list.map((m) => ({
            ...m,
            _winner: m.winnerId === m.guestId ? 'guest' : 'host',
            _scoreHost: m.scoreHost,
            _scoreGuest: m.scoreGuest,
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resolve(m: Editable): void {
    m._busy = true;
    m._err = undefined;
    this.admin
      .resolveMatch(m.id, {
        winnerRole: m._winner,
        scoreHost: m._scoreHost.trim(),
        scoreGuest: m._scoreGuest.trim(),
      })
      .subscribe({
        next: () => this.matches.update((list) => list.filter((x) => x.id !== m.id)),
        error: (err: HttpErrorResponse) => {
          m._busy = false;
          m._err = err.error?.error ?? 'Erreur lors de la résolution.';
        },
      });
  }
}
