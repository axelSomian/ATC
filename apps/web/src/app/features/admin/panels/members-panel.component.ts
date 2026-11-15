import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import { AuthStore } from '../../../core/stores/auth.store';
import type { AdminMember } from '../../../core/models/admin.model';

interface Row extends AdminMember {
  _busy?: boolean;
  _err?: string;
}

@Component({
  selector: 'app-members-panel',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../admin-shared.css',
  styles: [`
    .mp-row { align-items: center; cursor: default; }
    .mp-identity { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .mp-identity strong { font-size: var(--text-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mp-identity span { font-size: var(--text-xs); color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mp-level {
      padding: 4px 6px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      font-size: var(--text-sm); font-family: var(--font-body); background: var(--color-surface); color: var(--color-ink);
    }
  `],
  template: `
    <div class="panel">
      <div class="admin-toolbar">
        <input
          class="admin-search"
          type="search"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
          placeholder="Rechercher un membre…"
        />
      </div>

      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else if (filtered().length === 0) {
        <p class="panel-empty">Aucun membre{{ q() ? ' pour cette recherche' : '' }}.</p>
      } @else {
        <div class="admin-table">
          @for (m of filtered(); track m.id) {
            <div class="admin-table-row mp-row">
              <div class="mp-identity">
                <strong>{{ m.name }}</strong>
                <span>
                  {{ m.email }} · Niv. {{ m.level }}@if (m.club) { · {{ m.club.name }} }
                </span>
              </div>
              <select class="mp-level" [disabled]="m._busy" [value]="m.level" (change)="setLevel(m, $any($event.target).value, $event)" aria-label="Niveau">
                @for (l of levels; track l) { <option [value]="l" [selected]="l === m.level">N{{ l }}</option> }
              </select>
              <span class="status-text"><span class="status-dot" [class.accent]="m.role === 'admin'"></span>{{ m.role === 'admin' ? 'Admin' : 'Membre' }}</span>
              @if (m._err) { <span class="form-msg err">{{ m._err }}</span> }
              @if (m.role === 'admin') {
                <button class="btn btn-ghost btn-sm" [disabled]="m._busy || m.id === myId()" (click)="setRole(m, 'member')">
                  Retirer admin
                </button>
              } @else {
                <button class="btn btn-outline btn-sm" [disabled]="m._busy" (click)="setRole(m, 'admin')">
                  Promouvoir admin
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MembersPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly authStore = inject(AuthStore);

  readonly members = signal<Row[]>([]);
  readonly loading = signal(true);
  readonly myId = computed(() => this.authStore.user()?.id ?? '');
  readonly q = signal('');
  readonly levels = [1, 2, 3, 4, 5];

  readonly filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.members();
    return this.members().filter(
      (m) => m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.admin.listMembers().subscribe({
      next: (list) => {
        this.members.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Changement manuel du niveau (seul moyen de faire descendre un joueur) — tracé dans « Montées de niveau ». */
  setLevel(m: Row, value: string, event: Event): void {
    const level = Number(value);
    const select = event.target as HTMLSelectElement;
    if (level === m.level) return;
    const reason = prompt(`Passer ${m.name} de N${m.level} à N${level}.\nMotif (optionnel, visible dans l'historique) :`, '');
    if (reason === null) { select.value = String(m.level); return; }
    m._busy = true;
    m._err = undefined;
    this.admin.setMemberLevel(m.id, level, reason.trim() || null).subscribe({
      next: (res) => {
        m._busy = false;
        this.members.update((list) => list.map((x) => (x.id === m.id ? { ...x, level: res.level } : x)));
      },
      error: (err: HttpErrorResponse) => {
        m._busy = false;
        m._err = err.error?.error ?? 'Erreur.';
        select.value = String(m.level);
      },
    });
  }

  setRole(m: Row, role: 'member' | 'admin'): void {
    m._busy = true;
    m._err = undefined;
    this.admin.setMemberRole(m.id, role).subscribe({
      next: (res) => {
        m._busy = false;
        this.members.update((list) =>
          list.map((x) => (x.id === m.id ? { ...x, role: res.role } : x)),
        );
      },
      error: (err: HttpErrorResponse) => {
        m._busy = false;
        m._err = err.error?.error ?? 'Erreur.';
      },
    });
  }
}
