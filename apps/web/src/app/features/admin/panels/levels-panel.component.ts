import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminLevel, LevelPayload } from '../../../core/models/admin.model';

@Component({
  selector: 'app-levels-panel',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else {
        <div class="admin-table">
          @for (l of levels(); track l.level) {
            <button class="admin-table-row" (click)="edit(l)">
              <div class="admin-row-main">
                <div class="admin-row-title">Niveau {{ l.level }} — {{ l.nom }}</div>
                <div class="admin-row-meta"><span>{{ l.profil }}</span></div>
              </div>
              <span class="admin-row-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </button>
          }
        </div>
      }
    </div>

    @if (editing(); as draft) {
      <div class="admin-drawer-backdrop" (click)="cancel()">
        <div class="admin-drawer" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <header class="admin-drawer-head">
            <h2>Niveau {{ draft.level }}</h2>
            <button type="button" class="admin-drawer-close" aria-label="Fermer" (click)="cancel()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div class="admin-drawer-body">
            <div class="admin-section">
              <div class="field-row">
                <label>Code</label>
                <input type="text" [(ngModel)]="draft.code" />
                <label>Nom</label>
                <input type="text" [(ngModel)]="draft.nom" />
              </div>
              <label class="field-block-label">Profil</label>
              <textarea rows="3" [(ngModel)]="draft.profil"></textarea>
              <label class="field-block-label">Match / jeu</label>
              <textarea rows="3" [(ngModel)]="draft.jeu"></textarea>
            </div>
            @if (msg()) { <p class="form-msg" [class.err]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }
          </div>

          <footer class="admin-drawer-footer">
            <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="save(draft)">
              {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
})
export class LevelsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly levels = signal<AdminLevel[]>([]);
  readonly loading = signal(true);

  readonly editing = signal<AdminLevel | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly ok = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.admin.listLevels().subscribe({
      next: (list) => {
        this.levels.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  edit(l: AdminLevel): void {
    this.editing.set({ ...l });
    this.msg.set('');
  }

  cancel(): void {
    this.editing.set(null);
  }

  save(draft: AdminLevel): void {
    this.busy.set(true);
    this.msg.set('');
    const payload: LevelPayload = { code: draft.code, nom: draft.nom, profil: draft.profil, jeu: draft.jeu };
    this.admin.updateLevel(draft.level, payload).subscribe({
      next: () => {
        this.busy.set(false);
        this.ok.set(true);
        this.msg.set('Enregistré ✓');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.ok.set(false);
        this.msg.set(err.error?.error ?? 'Erreur.');
      },
    });
  }
}
