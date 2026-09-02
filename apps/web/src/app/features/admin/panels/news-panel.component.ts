import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NewsService } from '../../../core/services/news.service';
import {
  POST_CATEGORIES, POST_STATUSES,
  type AdminPost, type AdminPostPayload, type PostCategory, type PostStatus, type RssFeed,
} from '../../../core/models/news.model';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function emptyDraft(): AdminPostPayload {
  return {
    category: 'atc', status: 'draft', title: '', summary: '', body: '',
    coverImageUrl: null, gallery: [], publishedAt: null,
    startsAt: null, endsAt: null, location: null,
    ctaLabel: null, ctaUrl: null, featured: false, featuredOrder: null,
    promoCode: null, source: null, notifyOnPublish: false,
  };
}

/** ISO <-> valeur d'un <input type="datetime-local"> (heure locale, sans zone). */
function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

@Component({
  selector: 'app-news-panel',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: '../admin-shared.css',
  styles: [`
    .np-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .np-row {
      display: flex; align-items: stretch; gap: 0;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); background: var(--color-surface);
      overflow: hidden;
    }
    .np-row:hover { border-color: var(--color-accent); }
    .np-fav {
      flex-shrink: 0; width: 40px; border: none; border-right: 1px solid var(--color-border-light);
      background: transparent; cursor: pointer; font-size: 16px; color: var(--color-border);
    }
    .np-fav:hover:not(:disabled) { color: var(--color-sand-beige); background: var(--color-cream); }
    .np-fav.on { color: var(--color-accent); }
    .np-fav:disabled { cursor: not-allowed; opacity: 0.4; }
    .np-fav-tag { color: var(--color-accent); font-weight: 700; }
    .np-row-open {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3); background: transparent; border: none; cursor: pointer;
      text-align: left; font: inherit; color: var(--color-ink);
    }
    .np-thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; background: var(--color-cream); }
    .np-row-main { flex: 1; min-width: 0; }
    .np-row-title { font-weight: 600; font-size: var(--text-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .np-row-meta { font-size: var(--text-xs); color: var(--color-muted); display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: 2px; }
    .np-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: var(--radius-full); }
    .np-badge.draft { background: var(--color-cream); color: var(--color-muted); }
    .np-badge.scheduled { background: #E8DFC8; color: var(--color-warning); }
    .np-badge.published { background: var(--color-accent-alpha); color: var(--color-accent); }
    .np-badge.archived { background: var(--color-cream); color: var(--color-ink-light); text-decoration: line-through; }
    .np-star { color: var(--color-accent); }
    .np-filters { display: flex; gap: var(--space-1); flex-wrap: wrap; }
    .np-chip { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: transparent; font-size: var(--text-xs); cursor: pointer; color: var(--color-muted); }
    .np-chip.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
    .np-editor { display: flex; flex-direction: column; gap: var(--space-3); }
    .np-2col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    @media (max-width: 640px) { .np-2col { grid-template-columns: 1fr; } }
    .np-check { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
    .np-preview { border: 1px dashed var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); background: var(--color-surface); font-size: var(--text-sm); line-height: 1.6; }
    .np-preview :is(h1,h2,h3,h4) { margin: 0.6em 0 0.3em; line-height: 1.25; }
    .np-preview img { border-radius: var(--radius-sm); }
    .np-gallery { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .np-gallery figure { position: relative; margin: 0; }
    .np-gallery img { width: 84px; height: 84px; object-fit: cover; border-radius: var(--radius-sm); }
    .np-gallery button { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; border: none; background: var(--color-ink); color: #fff; cursor: pointer; font-size: 12px; line-height: 1; }
    .np-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; padding-top: var(--space-2); border-top: 1px solid var(--color-border-light); }
    .np-actions .spacer { flex: 1; }
    .np-feed { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
      padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
    .np-feed-main { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 1px; }
    .np-feed-label { font-size: var(--text-sm); font-weight: 600; }
    .np-feed-url { font-size: var(--text-xs); color: var(--color-muted); word-break: break-all; }
    .np-feed-sync { font-size: 10px; color: var(--color-muted); }
    .np-feed-err { font-size: 10px; color: var(--color-error); }
    .np-feed-add { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-top: var(--space-3); }
    .np-feed-add input { flex: 1; min-width: 140px; padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-body); background: var(--color-surface); }
  `],
  template: `
    <div class="panel">
      <p class="panel-hint">
        Rubrique <strong>Actualité</strong> : tournois, événements, partenariats, infos tennis et news ATC.
        Un post « Programmé » devient visible automatiquement à sa date (pas besoin d'action).
        Le corps s'écrit en <strong>Markdown</strong> (#&nbsp;titre, **gras**, listes, [lien](url)).
      </p>

      @if (!editing()) {
        <div class="row-actions">
          <button class="btn btn-primary btn-sm" (click)="newPost()">Nouvelle publication</button>
        </div>
        <div class="np-filters">
          <button class="np-chip" [class.active]="statusFilter() === null" (click)="setFilter(null)">Toutes</button>
          @for (s of statuses; track s.value) {
            <button class="np-chip" [class.active]="statusFilter() === s.value" (click)="setFilter(s.value)">{{ s.label }}</button>
          }
        </div>

        @if (loading()) {
          <p class="panel-loading">Chargement…</p>
        } @else if (visible().length === 0) {
          <p class="panel-empty">Aucune publication.</p>
        } @else {
          <div class="np-list">
            @for (p of visible(); track p.id) {
              <div class="np-row">
                <button
                  class="np-fav"
                  [class.on]="p.featured"
                  [disabled]="favBusy() === p.id"
                  [title]="p.featured ? 'Retirer de la une' : 'Mettre à la une'"
                  (click)="toggleFeatured(p)">★</button>
                <button class="np-row-open" (click)="edit(p)">
                  <img class="np-thumb" [src]="p.coverImageUrl || placeholder" alt="" />
                  <div class="np-row-main">
                    <div class="np-row-title">{{ p.title }}</div>
                    <div class="np-row-meta">
                      <span class="np-badge" [class]="p.status">{{ statusLabel(p.status) }}</span>
                      <span>{{ categoryLabel(p.category) }}</span>
                      @if (p.featured) { <span class="np-fav-tag">À la une</span> }
                      @if (p.publishedAt) { <span>{{ p.publishedAt | date: 'd MMM y, HH:mm' }}</span> }
                    </div>
                  </div>
                </button>
              </div>
            }
          </div>
        }

        <!-- ── Flux RSS « Infos Tennis » ── -->
        <div class="admin-card card" style="margin-top:var(--space-4)">
          <div class="admin-card-head">
            <strong>Flux RSS — Infos Tennis</strong>
            <button class="btn btn-outline btn-sm" [disabled]="syncing()" (click)="syncFeeds()">
              {{ syncing() ? 'Synchro…' : 'Synchroniser maintenant' }}
            </button>
          </div>
          @if (syncMsg()) { <p class="form-msg" [class.err]="!syncOk()">{{ syncMsg() }}</p> }

          @for (f of feeds(); track f.id) {
            <div class="np-feed">
              <div class="np-feed-main">
                <span class="np-feed-label">{{ f.label }}</span>
                <span class="np-feed-url">{{ f.url }}</span>
                @if (f.lastError) { <span class="np-feed-err">⚠ {{ f.lastError }}</span> }
                @else if (f.lastSyncAt) { <span class="np-feed-sync">synchro {{ f.lastSyncAt | date: 'd MMM, HH:mm' }}</span> }
              </div>
              <label class="np-check"><input type="checkbox" [checked]="f.autoPublish" (change)="toggleFeed(f, 'autoPublish', $any($event.target).checked)" /> auto-publier</label>
              <label class="np-check"><input type="checkbox" [checked]="f.active" (change)="toggleFeed(f, 'active', $any($event.target).checked)" /> actif</label>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-error)" (click)="removeFeed(f)">Suppr.</button>
            </div>
          }

          <div class="np-feed-add">
            <input type="text" [(ngModel)]="newFeed.label" placeholder="Nom (ex : Tennis Majors)" />
            <input type="text" [(ngModel)]="newFeed.url" placeholder="https://…/rss" />
            <label class="np-check"><input type="checkbox" [(ngModel)]="newFeed.autoPublish" /> auto-publier</label>
            <button class="btn btn-primary btn-sm" [disabled]="feedBusy()" (click)="addFeed()">Ajouter</button>
          </div>
          <p class="panel-hint" style="margin-top:var(--space-2)">
            Les articles importés arrivent en <strong>brouillon</strong> (à valider ici) sauf si « auto-publier » est coché.
            Seuls le titre, un extrait et le lien vers la source sont repris.
          </p>
        </div>
      } @else {
        <div class="admin-card card np-editor">
          <div class="admin-card-head">
            <strong>{{ editingId() ? 'Modifier la publication' : 'Nouvelle publication' }}</strong>
            <button class="btn btn-ghost btn-sm" (click)="cancel()">← Retour</button>
          </div>

          <div class="np-2col">
            <div>
              <label class="field-block-label">Catégorie</label>
              <select [(ngModel)]="draft.category">
                @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </div>
            <div>
              <label class="field-block-label">Statut</label>
              <select [(ngModel)]="draft.status">
                @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
              </select>
            </div>
          </div>

          <label class="field-block-label">Titre</label>
          <input type="text" [(ngModel)]="draft.title" placeholder="Titre de l'actualité" />

          <label class="field-block-label">Résumé (affiché sur les cartes)</label>
          <textarea rows="2" [(ngModel)]="draft.summary" placeholder="1 à 2 phrases"></textarea>

          <label class="field-block-label">Contenu (Markdown)</label>
          <textarea rows="10" [(ngModel)]="draft.body" placeholder="# Titre&#10;&#10;Texte, **gras**, - listes, [lien](https://…)"></textarea>
          @if (draft.body) {
            <details>
              <summary style="font-size:var(--text-xs);color:var(--color-muted);cursor:pointer">Aperçu</summary>
              <div class="np-preview" [innerHTML]="preview()"></div>
            </details>
          }

          <label class="field-block-label">Image de couverture</label>
          @if (draft.coverImageUrl) {
            <div class="np-gallery">
              <figure>
                <img [src]="draft.coverImageUrl" alt="" />
                <button type="button" (click)="draft.coverImageUrl = null">×</button>
              </figure>
            </div>
          }
          <input type="file" accept="image/*" (change)="upload($event, 'cover')" [disabled]="uploadBusy()" />

          <label class="field-block-label">Galerie (optionnel)</label>
          @if (draft.gallery.length) {
            <div class="np-gallery">
              @for (g of draft.gallery; track g) {
                <figure><img [src]="g" alt="" /><button type="button" (click)="removeGallery(g)">×</button></figure>
              }
            </div>
          }
          <input type="file" accept="image/*" (change)="upload($event, 'gallery')" [disabled]="uploadBusy()" />

          <div class="np-2col">
            <div>
              <label class="field-block-label">Date de publication @if (draft.status === 'scheduled') { <em>(programmation)</em> }</label>
              <input type="datetime-local" [ngModel]="publishedLocal()" (ngModelChange)="draft.publishedAt = toIso($event)" />
            </div>
            <div>
              <label class="field-block-label">Lieu (événement)</label>
              <input type="text" [(ngModel)]="draft.location" placeholder="Club, ville" />
            </div>
          </div>

          @if (draft.category === 'evenement' || draft.category === 'tournoi') {
            <div class="np-2col">
              <div>
                <label class="field-block-label">Début</label>
                <input type="datetime-local" [ngModel]="startsLocal()" (ngModelChange)="draft.startsAt = toIso($event)" />
              </div>
              <div>
                <label class="field-block-label">Fin</label>
                <input type="datetime-local" [ngModel]="endsLocal()" (ngModelChange)="draft.endsAt = toIso($event)" />
              </div>
            </div>
          }

          <div class="np-2col">
            <div>
              <label class="field-block-label">Libellé du bouton (CTA)</label>
              <input type="text" [(ngModel)]="draft.ctaLabel" placeholder="En savoir plus" />
            </div>
            <div>
              <label class="field-block-label">Lien du CTA</label>
              <input type="text" [(ngModel)]="draft.ctaUrl" placeholder="https://… ou /matchs" />
            </div>
          </div>

          @if (draft.category === 'partenariat') {
            <div class="np-2col">
              <div>
                <label class="field-block-label">Code promo</label>
                <input type="text" [(ngModel)]="draft.promoCode" placeholder="ATC20" />
              </div>
            </div>
          }
          @if (draft.category === 'infos_tennis') {
            <div>
              <label class="field-block-label">Source</label>
              <input type="text" [(ngModel)]="draft.source" placeholder="RFI, L'Équipe, ATP…" />
            </div>
          }

          <div class="np-2col">
            <label class="np-check"><input type="checkbox" [(ngModel)]="draft.featured" /> À la une (carrousel)</label>
            @if (draft.featured) {
              <div>
                <label class="field-block-label">Ordre à la une</label>
                <input type="number" [(ngModel)]="draft.featuredOrder" min="0" placeholder="0 = en premier" />
              </div>
            }
          </div>
          <label class="np-check"><input type="checkbox" [(ngModel)]="draft.notifyOnPublish" /> Notifier tous les membres (push) à la publication</label>

          @if (msg()) { <p class="form-msg" [class.err]="!ok()">{{ msg() }}</p> }

          <div class="np-actions">
            <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            @if (editingId()) {
              <button class="btn btn-ghost btn-sm" style="color:var(--color-error)" [disabled]="busy()" (click)="remove()">Supprimer</button>
            }
            <span class="spacer"></span>
            @if (draft.status !== 'published') {
              <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="quickStatus('published')">Publier maintenant</button>
            }
            @if (draft.status === 'published') {
              <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="quickStatus('archived')">Archiver</button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NewsPanelComponent implements OnInit {
  private readonly svc = inject(NewsService);

  readonly categories = POST_CATEGORIES;
  readonly statuses = POST_STATUSES;
  readonly placeholder = '/assets/img/w/w-annonce.webp';

  readonly posts = signal<AdminPost[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<PostStatus | null>(null);
  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly busy = signal(false);
  readonly uploadBusy = signal(false);
  readonly msg = signal('');
  readonly ok = signal(false);

  draft: AdminPostPayload = emptyDraft();

  // ── Flux RSS ──
  readonly favBusy = signal<string | null>(null);
  readonly feeds = signal<RssFeed[]>([]);
  readonly syncing = signal(false);
  readonly feedBusy = signal(false);
  readonly syncMsg = signal('');
  readonly syncOk = signal(false);
  newFeed = { url: '', label: '', autoPublish: false };

  readonly visible = computed(() => {
    const f = this.statusFilter();
    return f ? this.posts().filter((p) => p.status === f) : this.posts();
  });

  readonly publishedLocal = () => isoToLocal(this.draft.publishedAt);
  readonly startsLocal = () => isoToLocal(this.draft.startsAt);
  readonly endsLocal = () => isoToLocal(this.draft.endsAt);
  readonly toIso = (v: string) => localToIso(v);

  ngOnInit(): void {
    this.reload();
    this.loadFeeds();
  }

  private loadFeeds(): void {
    this.svc.listFeeds().subscribe({ next: (f) => this.feeds.set(f) });
  }

  /** Mettre / retirer de la une directement depuis la liste. */
  toggleFeatured(p: AdminPost): void {
    if (this.favBusy()) return;
    this.favBusy.set(p.id);
    this.svc.adminUpdate(p.id, { featured: !p.featured }).subscribe({
      next: (upd) => {
        this.posts.update((l) => l.map((x) => (x.id === p.id ? upd : x)));
        this.favBusy.set(null);
      },
      error: () => this.favBusy.set(null),
    });
  }

  addFeed(): void {
    const url = this.newFeed.url.trim();
    const label = this.newFeed.label.trim();
    if (!/^https?:\/\//i.test(url) || label.length < 2) {
      this.syncOk.set(false);
      this.syncMsg.set('URL (http/https) et nom requis.');
      return;
    }
    this.feedBusy.set(true);
    this.svc.addFeed({ url, label, autoPublish: this.newFeed.autoPublish }).subscribe({
      next: (f) => {
        this.feeds.update((l) => [...l, f]);
        this.newFeed = { url: '', label: '', autoPublish: false };
        this.feedBusy.set(false);
        this.syncMsg.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.feedBusy.set(false);
        this.syncOk.set(false);
        this.syncMsg.set(err.error?.error ?? 'Ajout impossible.');
      },
    });
  }

  toggleFeed(f: RssFeed, key: 'autoPublish' | 'active', value: boolean): void {
    this.svc.updateFeed(f.id, { [key]: value }).subscribe({
      next: (upd) => this.feeds.update((l) => l.map((x) => (x.id === f.id ? upd : x))),
    });
  }

  removeFeed(f: RssFeed): void {
    if (!confirm(`Retirer le flux « ${f.label} » ? (les articles déjà importés restent)`)) return;
    this.svc.removeFeed(f.id).subscribe({
      next: () => this.feeds.update((l) => l.filter((x) => x.id !== f.id)),
    });
  }

  syncFeeds(): void {
    this.syncing.set(true);
    this.syncMsg.set('');
    this.svc.syncFeeds().subscribe({
      next: (r) => {
        this.syncing.set(false);
        this.syncOk.set(true);
        this.syncMsg.set(`${r.imported} article(s) importé(s) depuis ${r.feeds} flux.`);
        this.loadFeeds();
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.syncing.set(false);
        this.syncOk.set(false);
        this.syncMsg.set(err.error?.error ?? 'Synchro impossible.');
      },
    });
  }

  /** Aperçu grossier côté client (le rendu final assaini vient de l'API). */
  preview(): string {
    const html = (this.draft.body ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/^### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^## (.*)$/gm, '<h3>$1</h3>')
      .replace(/^# (.*)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }

  private reload(): void {
    this.loading.set(true);
    this.svc.adminList().subscribe({
      next: (list) => { this.posts.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setFilter(s: PostStatus | null): void { this.statusFilter.set(s); }

  categoryLabel(c: PostCategory): string { return this.categories.find((x) => x.value === c)?.label ?? c; }
  statusLabel(s: PostStatus): string { return this.statuses.find((x) => x.value === s)?.label ?? s; }

  newPost(): void {
    this.draft = emptyDraft();
    this.editingId.set(null);
    this.msg.set('');
    this.editing.set(true);
  }

  edit(p: AdminPost): void {
    this.svc.adminGet(p.id).subscribe({
      next: (full) => {
        this.draft = {
          category: full.category, status: full.status, title: full.title,
          summary: full.summary, body: full.body, coverImageUrl: full.coverImageUrl,
          gallery: [...full.gallery], publishedAt: full.publishedAt,
          startsAt: full.startsAt, endsAt: full.endsAt, location: full.location,
          ctaLabel: full.ctaLabel, ctaUrl: full.ctaUrl, featured: full.featured,
          featuredOrder: full.featuredOrder, promoCode: full.promoCode,
          source: full.source, notifyOnPublish: full.notifyOnPublish,
        };
        this.editingId.set(full.id);
        this.msg.set('');
        this.editing.set(true);
      },
    });
  }

  cancel(): void { this.editing.set(false); }

  private payload(): AdminPostPayload {
    const trimN = (v: string | null) => { const t = (v ?? '').trim(); return t === '' ? null : t; };
    return {
      ...this.draft,
      title: this.draft.title.trim(),
      summary: this.draft.summary.trim(),
      body: this.draft.body.trim(),
      location: trimN(this.draft.location),
      ctaLabel: trimN(this.draft.ctaLabel),
      ctaUrl: trimN(this.draft.ctaUrl),
      promoCode: trimN(this.draft.promoCode),
      source: trimN(this.draft.source),
      featuredOrder: this.draft.featured ? (Number(this.draft.featuredOrder) || 0) : null,
    };
  }

  save(): void {
    const p = this.payload();
    if (p.title.length < 3 || p.summary.length < 3 || p.body.length < 1) {
      this.fail('Titre, résumé et contenu sont obligatoires.');
      return;
    }
    if (p.status === 'scheduled' && !p.publishedAt) {
      this.fail('Une publication programmée doit avoir une date de publication.');
      return;
    }
    this.busy.set(true);
    this.msg.set('');
    const id = this.editingId();
    const req = id ? this.svc.adminUpdate(id, p) : this.svc.adminCreate(p);
    req.subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.ok.set(true);
        this.msg.set('Enregistré ✓');
        this.editingId.set(saved.id);
        this.draft.status = saved.status;
        this.draft.publishedAt = saved.publishedAt;
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Erreur à l\'enregistrement.'),
    });
  }

  quickStatus(status: PostStatus): void {
    this.draft.status = status;
    this.save();
  }

  remove(): void {
    const id = this.editingId();
    if (!id || !confirm('Supprimer définitivement cette publication ?')) return;
    this.busy.set(true);
    this.svc.adminRemove(id).subscribe({
      next: () => { this.busy.set(false); this.editing.set(false); this.reload(); },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Suppression impossible.'),
    });
  }

  upload(ev: Event, kind: 'cover' | 'gallery'): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) { this.fail('Image trop lourde (5 Mo max).'); input.value = ''; return; }
    this.uploadBusy.set(true);
    this.msg.set('');
    this.svc.uploadImage(file, kind).subscribe({
      next: ({ url }) => {
        this.uploadBusy.set(false);
        if (kind === 'cover') this.draft.coverImageUrl = url;
        else this.draft.gallery = [...this.draft.gallery, url];
        input.value = '';
      },
      error: (err: HttpErrorResponse) => { this.uploadBusy.set(false); this.fail(err.error?.error ?? 'Envoi de l\'image impossible.'); input.value = ''; },
    });
  }

  removeGallery(url: string): void {
    this.draft.gallery = this.draft.gallery.filter((g) => g !== url);
  }

  private fail(m: string): void {
    this.busy.set(false);
    this.uploadBusy.set(false);
    this.ok.set(false);
    this.msg.set(m);
  }
}
