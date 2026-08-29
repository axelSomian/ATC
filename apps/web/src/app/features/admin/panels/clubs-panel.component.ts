import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminClub, ClubPayload } from '../../../core/models/admin.model';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Editable extends AdminClub {
  _busy?: boolean;
  _msg?: string;
  _ok?: boolean;
  _photoBusy?: boolean;
}

const EMPTY_NEW = { slug: '', name: '', zone: '', location: '', sortOrder: 0, active: true };

@Component({
  selector: 'app-clubs-panel',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      <!-- Nouveau club -->
      <div class="admin-card card">
        <strong>Ajouter un club</strong>
        <div class="field-row">
          <label>Nom</label>
          <input type="text" [(ngModel)]="draft.name" placeholder="Golf Tennis Club" />
          <label>Slug</label>
          <input type="text" [(ngModel)]="draft.slug" placeholder="golf" />
          <label>Zone</label>
          <input type="text" [(ngModel)]="draft.zone" placeholder="Cocody" />
          <label>Lieu</label>
          <input type="text" [(ngModel)]="draft.location" placeholder="Riviera Golf" />
          <label>Ordre</label>
          <input type="number" [(ngModel)]="draft.sortOrder" />
        </div>
        @if (createMsg()) { <p class="form-msg err">{{ createMsg() }}</p> }
        <div class="row-actions">
          <button class="btn btn-primary btn-sm" [disabled]="creating()" (click)="create()">
            {{ creating() ? 'Création…' : 'Créer' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="panel-loading">Chargement…</p>
      } @else {
        @for (c of clubs(); track c.id) {
          <div class="admin-card card">
            <div class="admin-card-head">
              <strong>{{ c.name || '(sans nom)' }}</strong>
              @if (!c.active) { <span class="pill-tag pill-inactive">Inactif</span> }
            </div>

            <div class="club-photo-row">
              @if (c.imageUrl) {
                <img class="club-photo-thumb" [src]="c.imageUrl" [alt]="'Photo ' + c.name" />
              } @else {
                <div class="club-photo-thumb club-photo-empty">Pas de photo</div>
              }
              <div class="club-photo-actions">
                <label class="btn btn-ghost btn-sm">
                  {{ c._photoBusy ? 'Envoi…' : (c.imageUrl ? 'Changer la photo' : 'Ajouter une photo') }}
                  <input type="file" accept="image/*" hidden
                    [disabled]="c._photoBusy" (change)="onImage(c, $event)" />
                </label>
                @if (c.imageUrl) {
                  <button class="btn btn-ghost btn-sm" [disabled]="c._photoBusy" (click)="removeImage(c)">Retirer</button>
                }
                <span class="club-photo-hint">JPG/PNG, max 5 Mo — recadré en 800×500</span>
              </div>
            </div>

            <div class="field-row">
              <label>Nom</label>
              <input type="text" [(ngModel)]="c.name" />
              <label>Slug</label>
              <input type="text" [(ngModel)]="c.slug" />
              <label>Zone</label>
              <input type="text" [(ngModel)]="c.zone" />
              <label>Lieu</label>
              <input type="text" [(ngModel)]="c.location" />
              <label>Ordre</label>
              <input type="number" [(ngModel)]="c.sortOrder" />
              <label>Actif</label>
              <input type="checkbox" [(ngModel)]="c.active" style="width: auto; justify-self: start;" />
            </div>
            @if (c._msg) { <p class="form-msg" [class.err]="!c._ok" [class.ok]="c._ok">{{ c._msg }}</p> }
            <div class="row-actions">
              <button class="btn btn-primary btn-sm" [disabled]="c._busy" (click)="save(c)">Enregistrer</button>
              <button class="btn btn-ghost btn-sm" [disabled]="c._busy" (click)="remove(c)">Supprimer</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ClubsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly clubs = signal<Editable[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly createMsg = signal('');
  draft: typeof EMPTY_NEW = { ...EMPTY_NEW };

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.admin.listClubs().subscribe({
      next: (list) => {
        this.clubs.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    this.creating.set(true);
    this.createMsg.set('');
    this.admin.createClub(this.draft).subscribe({
      next: (club) => {
        this.clubs.update((l) => [...l, club as Editable]);
        this.draft = { ...EMPTY_NEW };
        this.creating.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        this.createMsg.set(err.error?.error ?? 'Création impossible.');
      },
    });
  }

  onImage(c: Editable, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      c._ok = false;
      c._msg = 'Image trop lourde (max 5 Mo).';
      return;
    }
    c._photoBusy = true;
    c._msg = undefined;
    this.admin.uploadClubImage(c.id, file).subscribe({
      next: (updated) => {
        c._photoBusy = false;
        c.imageUrl = updated.imageUrl;
        c._ok = true;
        c._msg = 'Photo mise à jour ✓';
      },
      error: (err: HttpErrorResponse) => {
        c._photoBusy = false;
        c._ok = false;
        c._msg = err.error?.error ?? 'Envoi de la photo impossible.';
      },
    });
  }

  removeImage(c: Editable): void {
    c._photoBusy = true;
    c._msg = undefined;
    this.admin.updateClub(c.id, { imageUrl: null }).subscribe({
      next: () => {
        c._photoBusy = false;
        c.imageUrl = null;
        c._ok = true;
        c._msg = 'Photo retirée ✓';
      },
      error: (err: HttpErrorResponse) => {
        c._photoBusy = false;
        c._ok = false;
        c._msg = err.error?.error ?? 'Erreur.';
      },
    });
  }

  save(c: Editable): void {
    c._busy = true;
    c._msg = undefined;
    const payload: ClubPayload = {
      name: c.name,
      slug: c.slug,
      zone: c.zone,
      location: c.location,
      sortOrder: Number(c.sortOrder),
      active: c.active,
    };
    this.admin.updateClub(c.id, payload).subscribe({
      next: () => {
        c._busy = false;
        c._ok = true;
        c._msg = 'Enregistré ✓';
      },
      error: (err: HttpErrorResponse) => {
        c._busy = false;
        c._ok = false;
        c._msg = err.error?.error ?? 'Erreur.';
      },
    });
  }

  remove(c: Editable): void {
    if (!confirm(`Supprimer « ${c.name} » ?`)) return;
    c._busy = true;
    c._msg = undefined;
    this.admin.deleteClub(c.id).subscribe({
      next: () => this.clubs.update((l) => l.filter((x) => x.id !== c.id)),
      error: (err: HttpErrorResponse) => {
        c._busy = false;
        c._ok = false;
        c._msg = err.error?.error ?? 'Suppression impossible.';
      },
    });
  }
}
