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
