import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { LevelChange } from '../../../core/models/admin.model';

/**
 * Historique des changements de niveau : montées automatiques (2 tournois
 * gagnés, ou 1 tournoi gagné à un niveau supérieur) et changements manuels.
 * Une montée automatique s'applique tout de suite ; l'admin peut l'annuler ici.
 */
@Component({
  selector: 'app-progression-panel',
  standalone: true,
  imports: [DatePipe],
  styleUrl: '../admin-shared.css',
  styles: [`
    .pg-row { align-items: center; cursor: default; }
    .pg-main { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
    .pg-main strong { font-size: var(--text-sm); }
    .pg-main span { font-size: var(--text-xs); color: var(--color-muted); }
    .pg-levels { font-family: var(--font-display); font-weight: 700; font-size: var(--text-sm); white-space: nowrap; }
    .pg-reverted { text-decoration: line-through; opacity: 0.6; }
  `],
  template: `
    <div class="panel">
      <p class="panel-hint">
        Un joueur monte automatiquement après <strong>2 tournois gagnés</strong> à son niveau (ou au-dessus) sur 12 mois,
        ou dès <strong>1 tournoi gagné à un niveau supérieur</strong>. La montée s'applique tout de suite et le joueur
        est notifié ; tu peux l'annuler ici. Pour faire descendre un joueur, change son niveau dans « Membres ».
      </p>

      @if (msg()) { <p class="form-msg" [class.err]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }

      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else if (changes().length === 0) {
        <p class="panel-empty">Aucun changement de niveau pour l'instant.</p>
      } @else {
        <div class="admin-table">
          @for (c of changes(); track c.id) {
            <div class="admin-table-row pg-row" [class.pg-reverted]="c.revertedAt">
              <div class="pg-main">
                <strong>{{ c.user.name }}</strong>
                <span>
                  {{ c.source === 'auto' ? 'Montée automatique' : 'Changement manuel' }}
                  @if (c.reason) { · {{ c.reason }} }
                  @if (c.tournaments.length) { · {{ tournamentNames(c) }} }
                </span>
                <span>
                  {{ c.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                  @if (c.revertedAt) { · annulé le {{ c.revertedAt | date: 'dd/MM/yyyy' }} }
                </span>
              </div>
              <span class="pg-levels">N{{ c.fromLevel }} → N{{ c.toLevel }}</span>
              @if (c.revertible) {
                <button class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="revert(c)">Annuler</button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProgressionPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly changes = signal<LevelChange[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly ok = signal(false);

  ngOnInit(): void {
    this.admin.listLevelChanges().subscribe({
      next: (list) => { this.changes.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  tournamentNames(c: LevelChange): string {
    return c.tournaments.map((t) => t.name).join(', ');
  }

  revert(c: LevelChange): void {
    if (!confirm(`Annuler ce changement ? ${c.user.name} repassera niveau ${c.fromLevel}.`)) return;
    this.busy.set(true);
    this.msg.set('');
    this.admin.revertLevelChange(c.id).subscribe({
      next: (list) => {
        this.changes.set(list);
        this.busy.set(false);
        this.ok.set(true);
        this.msg.set(`${c.user.name} est repassé niveau ${c.fromLevel} ✓`);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.ok.set(false);
        this.msg.set(err.error?.error ?? 'Annulation impossible.');
      },
    });
  }
}
