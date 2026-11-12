import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminClub, ClubPayload } from '../../../core/models/admin.model';
import { CourtPickerComponent, type PickedPoint } from '../../../shared/court-picker/court-picker.component';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EMPTY_DRAFT = {
  slug: '',
  name: '',
  zone: '',
  location: '',
  address: '' as string | null,
  description: '' as string | null,
  feesInfo: '' as string | null,
  phone: '' as string | null,
  website: '' as string | null,
  imageUrl: null as string | null,
  lat: null as number | null,
  lng: null as number | null,
  sortOrder: 0,
  active: true,
};

type Draft = typeof EMPTY_DRAFT;

/** Cible en cours d'édition sur la carte : toujours le brouillon courant. */
type PickTarget = { lat: number | null; lng: number | null };

@Component({
  selector: 'app-clubs-panel',
  standalone: true,
  imports: [FormsModule, CourtPickerComponent],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      <!-- ═══ LISTE ═══ -->
      <div class="admin-toolbar">
        <button class="btn btn-primary btn-sm" (click)="newClub()">Ajouter un club</button>
        <span class="spacer"></span>
        <input class="admin-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Rechercher…" />
      </div>

      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else if (visible().length === 0) {
        <p class="panel-empty">Aucun club{{ search() ? ' pour cette recherche' : '' }}.</p>
      } @else {
        <div class="admin-table">
          @for (c of visible(); track c.id) {
            <button class="admin-table-row" (click)="edit(c)">
              @if (c.imageUrl) {
                <img class="admin-row-thumb" [src]="c.imageUrl" alt="" />
              } @else {
                <div class="admin-row-thumb admin-row-thumb-empty">Pas de photo</div>
              }
              <div class="admin-row-main">
                <div class="admin-row-title">{{ c.name || '(sans nom)' }}</div>
                <div class="admin-row-meta">
                  <span class="status-text"><span class="status-dot" [class.on]="c.active" [class.off]="!c.active"></span>{{ c.active ? 'Actif' : 'Inactif' }}</span>
                  @if (c.lat == null || c.lng == null) { <span>Sans position</span> }
                  @if (c.zone) { <span>{{ c.zone }}</span> }
                  @if (c.location) { <span>{{ c.location }}</span> }
                </div>
              </div>
              <span class="admin-row-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </button>
          }
        </div>
      }
    </div>

    @if (editing()) {
      <div class="admin-drawer-backdrop" (click)="cancel()">
        <div class="admin-drawer" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <header class="admin-drawer-head">
            <h2>{{ editingId() ? (draft.name || 'Club') : 'Ajouter un club' }}</h2>
            <button type="button" class="admin-drawer-close" aria-label="Fermer" (click)="cancel()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div class="admin-drawer-body">
            <div class="club-photo-row">
              @if (draft.imageUrl) {
                <img class="club-photo-thumb" [src]="draft.imageUrl" [alt]="'Photo ' + draft.name" />
              } @else {
                <div class="club-photo-thumb club-photo-empty">Pas de photo</div>
              }
              <div class="club-photo-actions">
                <label class="btn btn-ghost btn-sm">
                  {{ photoBusy() ? 'Envoi…' : (draft.imageUrl ? 'Changer la photo' : 'Ajouter une photo') }}
                  <input type="file" accept="image/*" hidden
                    [disabled]="photoBusy() || !editingId()" (change)="onImage($event)" />
                </label>
                @if (draft.imageUrl) {
                  <button class="btn btn-ghost btn-sm" [disabled]="photoBusy()" (click)="removeImage()">Retirer</button>
                }
                <span class="club-photo-hint">
                  JPG/PNG, max 5 Mo — recadré en 800×500
                  @if (!editingId()) { · enregistrez d'abord le club pour ajouter une photo }
                </span>
              </div>
            </div>

            <div class="admin-section">
              <div class="field-row">
                <label>Nom</label>
                <input type="text" [(ngModel)]="draft.name" placeholder="Golf Tennis Club" />
                <label>Slug</label>
                <input type="text" [(ngModel)]="draft.slug" placeholder="golf" />
                <label>Zone</label>
                <input type="text" [(ngModel)]="draft.zone" placeholder="Cocody" />
                <label>Lieu (libellé court)</label>
                <input type="text" [(ngModel)]="draft.location" placeholder="Cocody – 2 Plateaux" />
                <label>Adresse complète</label>
                <input type="text" [(ngModel)]="draft.address" placeholder="Rue des Jardins, 2 Plateaux, Cocody" />
                <label>Téléphone</label>
                <input type="text" [(ngModel)]="draft.phone" placeholder="+225 07 00 00 00 00" />
                <label>Site web</label>
                <input type="text" [(ngModel)]="draft.website" placeholder="https://…" />
                <label>Ordre</label>
                <input type="number" [(ngModel)]="draft.sortOrder" />
                <label>Actif</label>
                <input type="checkbox" [(ngModel)]="draft.active" style="width: auto; justify-self: start;" />
              </div>
              <label class="field-block-label">Présentation</label>
              <textarea rows="2" [(ngModel)]="draft.description" placeholder="Quelques lignes sur le club…"></textarea>
              <label class="field-block-label">Honoraires / cotisation</label>
              <textarea rows="2" [(ngModel)]="draft.feesInfo" placeholder="Ex : 15 000 F/mois · 120 000 F/an"></textarea>
            </div>

            <div class="admin-section">
              <strong>Position</strong>
              <div class="court-pos">
                <span class="court-pos-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ posLabel(draft) }}
                </span>
                <button type="button" class="btn btn-outline btn-sm" (click)="openPicker()">
                  {{ draft.lat != null ? 'Modifier la position' : 'Placer sur la carte' }}
                </button>
                @if (draft.lat != null) {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="clearPos()">Retirer</button>
                }
              </div>
            </div>

            @if (msg()) { <p class="form-msg" [class.err]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }
          </div>

          <footer class="admin-drawer-footer">
            <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <span class="spacer"></span>
            @if (editingId()) {
              <button class="btn btn-ghost btn-sm" style="color:var(--color-error)" [disabled]="busy()" (click)="remove()">Supprimer</button>
            }
          </footer>
        </div>
      </div>
    }

    @if (picking()) {
      <div class="cp-backdrop" (click)="cancelPick()">
        <div class="cp-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <header class="cp-dialog-head">
            <strong>Position du club</strong>
            <button type="button" class="cp-x" aria-label="Fermer" (click)="cancelPick()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <app-court-picker [lat]="picking()!.lat" [lng]="picking()!.lng" (picked)="onPicked($event)" />
          <div class="cp-dialog-actions">
            <button class="btn btn-primary btn-sm" [disabled]="!pendingPoint" (click)="confirmPick()">
              Enregistrer la position
            </button>
            <button class="btn btn-ghost btn-sm" (click)="cancelPick()">Annuler</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .court-pos {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
      }
      .court-pos-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: var(--text-sm);
        color: var(--color-muted);
        font-variant-numeric: tabular-nums;
      }
      .cp-backdrop {
        position: fixed;
        inset: 0;
        z-index: 400;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
        background: rgba(16, 36, 61, 0.45);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
      }
      .cp-dialog {
        width: 100%;
        max-width: 540px;
        max-height: 92vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
      }
      .cp-dialog-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .cp-x {
        display: flex;
        border: none;
        background: none;
        color: var(--color-muted);
        cursor: pointer;
        padding: 2px;
      }
      .cp-x:hover { color: var(--color-ink); }
      .cp-dialog-actions { display: flex; gap: var(--space-2); }
    `,
  ],
})
export class ClubsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly clubs = signal<AdminClub[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');

  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.clubs();
    return this.clubs().filter((c) => `${c.name} ${c.zone} ${c.location}`.toLowerCase().includes(q));
  });

  readonly editing   = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly busy      = signal(false);
  readonly photoBusy = signal(false);
  readonly msg       = signal('');
  readonly ok        = signal(false);

  draft: Draft = { ...EMPTY_DRAFT };

  readonly picking = signal<PickTarget | null>(null);
  pendingPoint: PickedPoint | null = null;

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.admin.listClubs().subscribe({
      next: (list) => {
        this.clubs.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  posLabel(c: { lat: number | null; lng: number | null }): string {
    return c.lat != null && c.lng != null
      ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`
      : 'Position non renseignée';
  }

  newClub(): void {
    this.draft = { ...EMPTY_DRAFT };
    this.editingId.set(null);
    this.msg.set('');
    this.editing.set(true);
  }

  edit(c: AdminClub): void {
    this.draft = {
      slug: c.slug, name: c.name, zone: c.zone, location: c.location,
      address: c.address, description: c.description, feesInfo: c.feesInfo,
      phone: c.phone, website: c.website, imageUrl: c.imageUrl,
      lat: c.lat, lng: c.lng, sortOrder: c.sortOrder, active: c.active,
    };
    this.editingId.set(c.id);
    this.msg.set('');
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
  }

  openPicker(): void {
    this.pendingPoint = null;
    this.picking.set({ lat: this.draft.lat, lng: this.draft.lng });
  }

  onPicked(p: PickedPoint): void {
    this.pendingPoint = p;
  }

  confirmPick(): void {
    if (this.picking() && this.pendingPoint) {
      this.draft.lat = this.pendingPoint.lat;
      this.draft.lng = this.pendingPoint.lng;
      if (this.pendingPoint.address && !(this.draft.address ?? '').trim()) {
        this.draft.address = this.pendingPoint.address;
      }
    }
    this.picking.set(null);
    this.pendingPoint = null;
  }

  cancelPick(): void {
    this.picking.set(null);
    this.pendingPoint = null;
  }

  clearPos(): void {
    this.draft.lat = null;
    this.draft.lng = null;
  }

  save(): void {
    this.busy.set(true);
    this.msg.set('');
    const id = this.editingId();
    const req = id ? this.admin.updateClub(id, this.toPayload(this.draft)) : this.admin.createClub(this.toPayload(this.draft));
    req.subscribe({
      next: (club) => {
        this.busy.set(false);
        this.ok.set(true);
        this.msg.set('Enregistré ✓');
        this.editingId.set(club.id);
        this.draft.imageUrl = club.imageUrl;
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Enregistrement impossible.'),
    });
  }

  remove(): void {
    const id = this.editingId();
    const c = this.clubs().find((x) => x.id === id);
    if (!id || !confirm(`Supprimer « ${c?.name ?? 'ce club'} » ?`)) return;
    this.busy.set(true);
    this.admin.deleteClub(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(false);
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Suppression impossible.'),
    });
  }

  onImage(ev: Event): void {
    const id = this.editingId();
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!id || !file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      this.ok.set(false);
      this.msg.set('Image trop lourde (max 5 Mo).');
      return;
    }
    this.photoBusy.set(true);
    this.msg.set('');
    this.admin.uploadClubImage(id, file).subscribe({
      next: (updated) => {
        this.photoBusy.set(false);
        this.draft.imageUrl = updated.imageUrl;
        this.ok.set(true);
        this.msg.set('Photo mise à jour ✓');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.photoBusy.set(false);
        this.ok.set(false);
        this.msg.set(err.error?.error ?? 'Envoi de la photo impossible.');
      },
    });
  }

  removeImage(): void {
    const id = this.editingId();
    if (!id) return;
    this.photoBusy.set(true);
    this.msg.set('');
    this.admin.updateClub(id, { imageUrl: null }).subscribe({
      next: () => {
        this.photoBusy.set(false);
        this.draft.imageUrl = null;
        this.ok.set(true);
        this.msg.set('Photo retirée ✓');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.photoBusy.set(false);
        this.ok.set(false);
        this.msg.set(err.error?.error ?? 'Erreur.');
      },
    });
  }

  private toPayload(c: Draft): ClubPayload {
    return {
      name: c.name,
      slug: c.slug,
      zone: c.zone,
      location: c.location,
      address: c.address ?? null,
      description: c.description ?? null,
      feesInfo: c.feesInfo ?? null,
      phone: c.phone ?? null,
      website: c.website ?? null,
      lat: c.lat,
      lng: c.lng,
      sortOrder: Number(c.sortOrder) || 0,
      active: c.active,
    };
  }

  private fail(m: string): void {
    this.busy.set(false);
    this.ok.set(false);
    this.msg.set(m);
  }
}
