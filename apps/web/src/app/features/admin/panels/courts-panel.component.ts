import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminCourt, CourtPayload } from '../../../core/models/admin.model';

interface Editable extends AdminCourt {
  _busy?: boolean;
  _msg?: string;
  _ok?: boolean;
}

interface Draft {
  slug: string;
  name: string;
  zone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  sortOrder: number;
  active: boolean;
}

const EMPTY_NEW: Draft = {
  slug: '', name: '', zone: '', address: '', lat: null, lng: null, sortOrder: 0, active: true,
};

@Component({
  selector: 'app-courts-panel',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../admin-shared.css',
  template: `
    <div class="panel">
      <p class="panel-hint">
        Les coordonnées (latitude / longitude) alimentent la carte affichée aux joueurs
        pour un match. Astuce : clic droit sur un point dans Google Maps → « Plus… » copie
        « lat, lng ». Sans coordonnées, les joueurs ont un lien de recherche par nom.
      </p>

      <!-- Nouveau terrain -->
      <div class="admin-card card">
        <strong>Ajouter un terrain</strong>
        <div class="field-row">
          <label>Nom</label>
          <input type="text" [(ngModel)]="draft.name" placeholder="Club Ivoire" />
          <label>Slug</label>
          <input type="text" [(ngModel)]="draft.slug" placeholder="club-ivoire" />
          <label>Zone</label>
          <input type="text" [(ngModel)]="draft.zone" placeholder="Cocody" />
          <label>Adresse</label>
          <input type="text" [(ngModel)]="draft.address" placeholder="Sofitel Hôtel Ivoire, Bd Hassan II" />
          <label>Latitude</label>
          <input type="number" step="0.00001" [(ngModel)]="draft.lat" placeholder="5.3242" />
          <label>Longitude</label>
          <input type="number" step="0.00001" [(ngModel)]="draft.lng" placeholder="-4.0088" />
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
        @for (c of courts(); track c.id) {
          <div class="admin-card card">
            <div class="admin-card-head">
              <strong>{{ c.name || '(sans nom)' }}</strong>
              @if (c.lat == null || c.lng == null) { <span class="pill-tag pill-inactive">Sans position</span> }
              @if (!c.active) { <span class="pill-tag pill-inactive">Inactif</span> }
            </div>
            <div class="field-row">
              <label>Nom</label>
              <input type="text" [(ngModel)]="c.name" />
              <label>Slug</label>
              <input type="text" [(ngModel)]="c.slug" />
              <label>Zone</label>
              <input type="text" [(ngModel)]="c.zone" />
              <label>Adresse</label>
              <input type="text" [(ngModel)]="c.address" />
              <label>Latitude</label>
              <input type="number" step="0.00001" [(ngModel)]="c.lat" />
              <label>Longitude</label>
              <input type="number" step="0.00001" [(ngModel)]="c.lng" />
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
export class CourtsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly courts = signal<Editable[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly createMsg = signal('');
  draft: Draft = { ...EMPTY_NEW };

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.admin.listCourts().subscribe({
      next: (list) => {
        this.courts.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    this.creating.set(true);
    this.createMsg.set('');
    this.admin.createCourt(this.toPayload(this.draft)).subscribe({
      next: (court) => {
        this.courts.update((l) => [...l, court as Editable]);
        this.draft = { ...EMPTY_NEW };
        this.creating.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        this.createMsg.set(err.error?.error ?? 'Création impossible.');
      },
    });
  }

  save(c: Editable): void {
    c._busy = true;
    c._msg = undefined;
    this.admin.updateCourt(c.id, this.toPayload(c)).subscribe({
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
    this.admin.deleteCourt(c.id).subscribe({
      next: () => this.courts.update((l) => l.filter((x) => x.id !== c.id)),
      error: (err: HttpErrorResponse) => {
        c._busy = false;
        c._ok = false;
        c._msg = err.error?.error ?? 'Suppression impossible.';
      },
    });
  }

  private toPayload(c: Draft | Editable): CourtPayload {
    const num = (v: unknown): number | null =>
      v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
    return {
      name: c.name,
      slug: c.slug,
      zone: c.zone,
      address: c.address,
      lat: num(c.lat),
      lng: num(c.lng),
      sortOrder: Number(c.sortOrder) || 0,
      active: c.active,
    };
  }
}
