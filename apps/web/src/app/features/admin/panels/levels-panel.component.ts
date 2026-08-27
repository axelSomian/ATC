import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminLevel, LevelPayload } from '../../../core/models/admin.model';

interface Editable extends AdminLevel {
  _busy?: boolean;
  _msg?: string;
  _ok?: boolean;
}

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
        @for (l of levels(); track l.level) {
          <div class="admin-card card">
            <div class="admin-card-head">
              <strong>Niveau {{ l.level }} — {{ l.nom }}</strong>
            </div>
            <div class="field-row">
              <label>Code</label>
              <input type="text" [(ngModel)]="l.code" />
              <label>Nom</label>
              <input type="text" [(ngModel)]="l.nom" />
              <label>Profil</label>
              <textarea [(ngModel)]="l.profil"></textarea>
              <label>Match / jeu</label>
              <textarea [(ngModel)]="l.jeu"></textarea>
            </div>
            @if (l._msg) { <p class="form-msg" [class.err]="!l._ok" [class.ok]="l._ok">{{ l._msg }}</p> }
            <div class="row-actions">
              <button class="btn btn-primary btn-sm" [disabled]="l._busy" (click)="save(l)">Enregistrer</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class LevelsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly levels = signal<Editable[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.admin.listLevels().subscribe({
      next: (list) => {
        this.levels.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(l: Editable): void {
    l._busy = true;
    l._msg = undefined;
    const payload: LevelPayload = { code: l.code, nom: l.nom, profil: l.profil, jeu: l.jeu };
    this.admin.updateLevel(l.level, payload).subscribe({
      next: () => {
        l._busy = false;
        l._ok = true;
        l._msg = 'Enregistré ✓';
      },
      error: (err: HttpErrorResponse) => {
        l._busy = false;
        l._ok = false;
        l._msg = err.error?.error ?? 'Erreur.';
      },
    });
  }
}
