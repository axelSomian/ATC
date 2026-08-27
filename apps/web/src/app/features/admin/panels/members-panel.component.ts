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
  template: `
    <div class="panel">
      <input
        type="text"
        class="member-search"
        placeholder="Rechercher un membre…"
        [ngModel]="q()"
        (ngModelChange)="q.set($event)"
      />

      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else {
        @for (m of filtered(); track m.id) {
          <div class="admin-card card">
            <div class="admin-card-head">
              <div>
                <strong>{{ m.name }}</strong>
                @if (m.role === 'admin') { <span class="pill-tag pill-admin">Admin</span> }
                <div class="text-muted" style="font-size: var(--text-xs);">
                  {{ m.email }} · Niv. {{ m.level }}@if (m.club) { · {{ m.club.name }} }
                </div>
              </div>
              <div class="row-actions">
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
            </div>
            @if (m._err) { <p class="form-msg err">{{ m._err }}</p> }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `.member-search {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-family: var(--font-body);
    }`,
  ],
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
