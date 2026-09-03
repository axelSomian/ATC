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

/** États proposés dans l'éditeur (Archivé se pilote via la barre d'action). */
const EDITOR_STATUSES: { value: PostStatus; label: string; hint: string }[] = [
  { value: 'draft', label: 'Brouillon', hint: 'Visible de vous seul.' },
  { value: 'scheduled', label: 'Programmé', hint: 'Publié automatiquement à la date choisie.' },
  { value: 'published', label: 'Publié', hint: 'Visible de tous les membres, maintenant.' },
];

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
    /* ── Bascule Publications / Sources RSS ── */
    .np-switch { display: inline-flex; padding: 3px; gap: 3px; background: var(--color-cream); border-radius: var(--radius-lg); }
    .np-switch button {
      border: none; background: transparent; cursor: pointer; font: inherit;
      font-size: var(--text-sm); font-weight: 600; color: var(--color-muted);
      padding: 6px 16px; border-radius: var(--radius-md);
    }
    .np-switch button.on { background: var(--color-surface); color: var(--color-ink); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

    .np-toolbar { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .np-toolbar .spacer { flex: 1; }
    .np-search {
      min-width: 180px; padding: 7px 12px; border: 1px solid var(--color-border);
      border-radius: var(--radius-full); font-size: var(--text-sm); font-family: var(--font-body);
      background: var(--color-surface); color: var(--color-ink);
    }
    .np-filters { display: flex; gap: var(--space-1); flex-wrap: wrap; }
    .np-chip {
      padding: 4px 11px; border: 1px solid var(--color-border); border-radius: var(--radius-full);
      background: transparent; font-size: var(--text-xs); cursor: pointer; color: var(--color-muted);
    }
    .np-chip.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }

    /* ── Liste ── */
    .np-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .np-row {
      display: flex; align-items: stretch;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-surface); overflow: hidden;
    }
    .np-row:hover { border-color: var(--color-accent); }
    .np-fav {
      flex-shrink: 0; width: 40px; border: none; border-right: 1px solid var(--color-border-light);
      background: transparent; cursor: pointer; font-size: 16px; color: var(--color-border);
    }
    .np-fav:hover:not(:disabled) { color: var(--color-sand-beige); background: var(--color-cream); }
    .np-fav.on { color: var(--color-accent); }
    .np-fav:disabled { cursor: not-allowed; opacity: 0.4; }
    .np-row-open {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3); background: transparent; border: none; cursor: pointer;
      text-align: left; font: inherit; color: var(--color-ink);
    }
    .np-thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; background: var(--color-cream); }
    .np-row-main { flex: 1; min-width: 0; }
    .np-row-title { font-weight: 600; font-size: var(--text-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .np-row-meta { font-size: var(--text-xs); color: var(--color-muted); display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: 2px; align-items: center; }
    .np-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: var(--radius-full); }
    .np-badge.draft { background: var(--color-cream); color: var(--color-muted); }
    .np-badge.scheduled { background: #E8DFC8; color: var(--color-warning); }
    .np-badge.published { background: var(--color-accent-alpha); color: var(--color-accent); }
    .np-badge.archived { background: var(--color-cream); color: var(--color-ink-light); text-decoration: line-through; }
    .np-fav-tag { color: var(--color-accent); font-weight: 700; }

    /* ── Éditeur ── */
    .np-editor { display: flex; flex-direction: column; gap: var(--space-4); }
    .np-editor-head { display: flex; align-items: center; gap: var(--space-3); }
    .np-editor-head h2 { margin: 0; font-size: var(--text-lg); }
    .np-back { background: transparent; border: none; cursor: pointer; font: inherit; color: var(--color-muted); font-size: var(--text-sm); padding: 4px 0; }
    .np-back:hover { color: var(--color-ink); }

    .np-section {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);
      background: var(--color-surface); padding: var(--space-4);
      display: flex; flex-direction: column; gap: var(--space-3);
    }
    .np-section > h3 {
      margin: 0; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--color-muted); font-weight: 700;
    }
    details.np-section > summary {
      list-style: none; cursor: pointer; font-size: var(--text-xs); text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--color-muted); font-weight: 700;
      display: flex; align-items: center; gap: var(--space-2);
    }
    details.np-section > summary::-webkit-details-marker { display: none; }
    details.np-section > summary::before { content: '▸'; font-size: 10px; }
    details.np-section[open] > summary { margin-bottom: var(--space-3); }
    details.np-section[open] > summary::before { content: '▾'; }

    .np-field { display: flex; flex-direction: column; gap: 5px; }
    .np-field > label { font-size: var(--text-xs); color: var(--color-muted); font-weight: 600; }
    .np-field input, .np-field textarea, .np-field select {
      width: 100%; padding: 8px 11px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-body);
      background: var(--color-surface); color: var(--color-ink);
    }
    .np-field textarea { resize: vertical; }
    .np-2col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    @media (max-width: 640px) { .np-2col { grid-template-columns: 1fr; } }

    /* corps + aperçu côte à côte */
    .np-body-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); align-items: start; }
    @media (max-width: 860px) { .np-body-grid { grid-template-columns: 1fr; } }
    .np-body-grid textarea { min-height: 260px; line-height: 1.5; }
    .np-preview {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4); background: var(--color-cream);
      font-size: var(--text-sm); line-height: 1.65; min-height: 260px; overflow-wrap: anywhere;
    }
    .np-preview:empty::before { content: 'L\\'aperçu s\\'affiche ici.'; color: var(--color-muted); }
    .np-preview :is(h1,h2,h3,h4) { margin: 0.7em 0 0.3em; line-height: 1.25; }
    .np-preview h1 { font-size: 1.35em; }
    .np-preview h2 { font-size: 1.18em; }
    .np-preview h3 { font-size: 1.05em; }
    .np-preview p { margin: 0 0 0.7em; }
    .np-preview ul, .np-preview ol { margin: 0 0 0.7em; padding-left: 1.3em; }
    .np-preview a { color: var(--color-accent); }
    .np-preview img { border-radius: var(--radius-sm); max-width: 100%; }

    /* statut segmenté */
    .np-status { display: flex; gap: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; width: fit-content; max-width: 100%; }
    .np-status button {
      border: none; background: var(--color-surface); cursor: pointer; font: inherit;
      font-size: var(--text-sm); font-weight: 600; color: var(--color-muted);
      padding: 8px 18px; border-right: 1px solid var(--color-border);
    }
    .np-status button:last-child { border-right: none; }
    .np-status button.on { background: var(--color-accent); color: #fff; }
    .np-status-hint { font-size: var(--text-xs); color: var(--color-muted); }
    .np-archived-note {
      display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
      font-size: var(--text-sm); color: var(--color-ink-light);
      background: var(--color-cream); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
    }

    .np-check { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }

    /* images */
    .np-gallery { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .np-gallery figure { position: relative; margin: 0; }
    .np-gallery img { width: 96px; height: 72px; object-fit: cover; border-radius: var(--radius-sm); }
    .np-cover img { width: 100%; max-width: 320px; height: auto; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--radius-md); }
    .np-gallery button, .np-cover button {
      position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%;
      border: none; background: var(--color-ink); color: #fff; cursor: pointer; font-size: 12px; line-height: 1;
    }
    .np-cover { position: relative; width: fit-content; }
    .np-file { font-size: var(--text-xs); color: var(--color-muted); }

    /* barre d'action collante */
    .np-actionbar {
      position: sticky; bottom: 0; z-index: 2;
      display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center;
      padding: var(--space-3); margin: 0 calc(-1 * var(--space-1));
      background: var(--color-bg); border-top: 1px solid var(--color-border);
    }
    .np-actionbar .spacer { flex: 1; }

    /* ── Sources RSS ── */
    .np-feed { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
      padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); }
    .np-feed:last-of-type { border-bottom: none; }
    .np-feed-main { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 2px; }
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
      <!-- ═══ ÉDITEUR (écran dédié) ═══ -->
      @if (editing()) {
        <div class="np-editor">
          <div class="np-editor-head">
            <button class="np-back" (click)="cancel()">← Publications</button>
          </div>
          <h2 style="margin:0">{{ editingId() ? 'Modifier l\\'article' : 'Nouvel article' }}</h2>

          <!-- 1. Contenu -->
          <div class="np-section">
            <h3>Contenu</h3>
            <div class="np-2col">
              <div class="np-field">
                <label>Catégorie</label>
                <select [(ngModel)]="draft.category">
                  @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
                </select>
              </div>
              <div class="np-field">
                <label>Titre</label>
                <input type="text" [(ngModel)]="draft.title" placeholder="Titre de l'article" />
              </div>
            </div>

            <div class="np-field">
              <label>Résumé <span style="font-weight:400">— affiché sur les cartes du feed</span></label>
              <textarea rows="2" [(ngModel)]="draft.summary" placeholder="1 à 2 phrases d'accroche"></textarea>
            </div>

            <div class="np-field">
              <label>Contenu <span style="font-weight:400">— Markdown : # titre, **gras**, - liste, [lien](url)</span></label>
              <div class="np-body-grid">
                <textarea [(ngModel)]="draft.body" placeholder="# Titre&#10;&#10;Votre texte…"></textarea>
                <div class="np-preview" [innerHTML]="preview()"></div>
              </div>
            </div>

            <div class="np-field">
              <label>Image de couverture</label>
              @if (draft.coverImageUrl) {
                <div class="np-cover">
                  <img [src]="draft.coverImageUrl" alt="" />
                  <button type="button" (click)="draft.coverImageUrl = null">×</button>
                </div>
              }
              <input class="np-file" type="file" accept="image/*" (change)="upload($event, 'cover')" [disabled]="uploadBusy()" />
            </div>
          </div>

          <!-- 2. Diffusion -->
          <div class="np-section">
            <h3>Diffusion</h3>

            @if (draft.status === 'archived') {
              <div class="np-archived-note">
                <span>Cet article est archivé (invisible du public).</span>
                <button class="btn btn-outline btn-sm" (click)="setStatus('published')">Le republier</button>
              </div>
            } @else {
              <div class="np-field">
                <label>Statut</label>
                <div class="np-status">
                  @for (s of editorStatuses; track s.value) {
                    <button type="button" [class.on]="draft.status === s.value" (click)="setStatus(s.value)">{{ s.label }}</button>
                  }
                </div>
                <span class="np-status-hint">{{ statusHint() }}</span>
              </div>

              @if (draft.status === 'scheduled') {
                <div class="np-field" style="max-width:280px">
                  <label>Date de publication</label>
                  <input type="datetime-local" [ngModel]="publishedLocal()" (ngModelChange)="draft.publishedAt = toIso($event)" />
                </div>
              }
            }

            <div class="np-2col">
              <label class="np-check">
                <input type="checkbox" [(ngModel)]="draft.featured" /> Mettre à la une (carrousel d'accueil)
              </label>
              @if (draft.featured) {
                <div class="np-field">
                  <label>Ordre à la une <span style="font-weight:400">(0 = en premier)</span></label>
                  <input type="number" [(ngModel)]="draft.featuredOrder" min="0" placeholder="0" />
                </div>
              }
            </div>

            <label class="np-check">
              <input type="checkbox" [(ngModel)]="draft.notifyOnPublish" /> Notifier tous les membres (push) à la publication
            </label>
          </div>

          <!-- 3. Détails (repliable) -->
          <details class="np-section" [open]="detailsOpen()" (toggle)="detailsOpen.set($any($event.target).open)">
            <summary>Détails complémentaires</summary>

            <div class="np-2col">
              <div class="np-field">
                <label>Lieu</label>
                <input type="text" [(ngModel)]="draft.location" placeholder="Club, ville" />
              </div>
              @if (draft.category === 'evenement' || draft.category === 'tournoi') {
                <div class="np-field">
                  <label>Début</label>
                  <input type="datetime-local" [ngModel]="startsLocal()" (ngModelChange)="draft.startsAt = toIso($event)" />
                </div>
              }
            </div>

            @if (draft.category === 'evenement' || draft.category === 'tournoi') {
              <div class="np-field" style="max-width:280px">
                <label>Fin</label>
                <input type="datetime-local" [ngModel]="endsLocal()" (ngModelChange)="draft.endsAt = toIso($event)" />
              </div>
            }

            <div class="np-2col">
              <div class="np-field">
                <label>Libellé du bouton (CTA)</label>
                <input type="text" [(ngModel)]="draft.ctaLabel" placeholder="En savoir plus" />
              </div>
              <div class="np-field">
                <label>Lien du bouton</label>
                <input type="text" [(ngModel)]="draft.ctaUrl" placeholder="https://… ou /matchs" />
              </div>
            </div>

            @if (draft.category === 'partenariat') {
              <div class="np-field" style="max-width:280px">
                <label>Code promo</label>
                <input type="text" [(ngModel)]="draft.promoCode" placeholder="ATC20" />
              </div>
            }
            @if (draft.category === 'infos_tennis') {
              <div class="np-field" style="max-width:280px">
                <label>Source</label>
                <input type="text" [(ngModel)]="draft.source" placeholder="RFI, L'Équipe, ATP…" />
              </div>
            }

            <div class="np-field">
              <label>Galerie photos</label>
              @if (draft.gallery.length) {
                <div class="np-gallery">
                  @for (g of draft.gallery; track g) {
                    <figure><img [src]="g" alt="" /><button type="button" (click)="removeGallery(g)">×</button></figure>
                  }
                </div>
              }
              <input class="np-file" type="file" accept="image/*" (change)="upload($event, 'gallery')" [disabled]="uploadBusy()" />
            </div>
          </details>

          @if (msg()) { <p class="form-msg" [class.err]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }

          <div class="np-actionbar">
            <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            @if (editingId() && draft.status === 'published') {
              <button class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="quickStatus('archived')">Archiver</button>
            }
            <span class="spacer"></span>
            @if (editingId()) {
              <button class="btn btn-ghost btn-sm" style="color:var(--color-error)" [disabled]="busy()" (click)="remove()">Supprimer</button>
            }
          </div>
        </div>
      } @else {
        <!-- ═══ GESTION ═══ -->
        <div class="np-switch">
          <button [class.on]="mode() === 'publications'" (click)="mode.set('publications')">Publications</button>
          <button [class.on]="mode() === 'feeds'" (click)="mode.set('feeds')">Sources RSS</button>
        </div>

        @if (mode() === 'publications') {
          <p class="panel-hint">
            Les articles déjà créés. Un « Programmé » devient visible tout seul à sa date.
            Cliquez sur une ligne pour l'ouvrir, ou <strong>Nouvel article</strong> pour en créer un.
          </p>

          <div class="np-toolbar">
            <button class="btn btn-primary btn-sm" (click)="newPost()">Nouvel article</button>
            <span class="spacer"></span>
            <input class="np-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Rechercher…" />
          </div>
          <div class="np-filters">
            <button class="np-chip" [class.active]="statusFilter() === null" (click)="statusFilter.set(null)">Tous</button>
            @for (s of statuses; track s.value) {
              <button class="np-chip" [class.active]="statusFilter() === s.value" (click)="statusFilter.set(s.value)">{{ s.label }}</button>
            }
          </div>

          @if (loading()) {
            <p class="panel-loading">Chargement…</p>
          } @else if (visible().length === 0) {
            <p class="panel-empty">Aucun article{{ statusFilter() || search() ? ' pour ce filtre' : '' }}.</p>
          } @else {
            <div class="np-list">
              @for (p of visible(); track p.id) {
                <div class="np-row">
                  <button
                    class="np-fav" [class.on]="p.featured" [disabled]="favBusy() === p.id"
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
        } @else {
          <!-- ── Sources RSS ── -->
          <p class="panel-hint">
            Flux « Infos Tennis » agrégés automatiquement. Les articles importés arrivent en
            <strong>brouillon</strong> (à valider dans Publications) sauf si « auto-publier » est coché.
            Seuls le titre, un extrait et le lien vers la source sont repris.
          </p>

          <div class="admin-card card">
            <div class="admin-card-head">
              <strong>Flux configurés</strong>
              <button class="btn btn-outline btn-sm" [disabled]="syncing()" (click)="syncFeeds()">
                {{ syncing() ? 'Synchro…' : 'Synchroniser maintenant' }}
              </button>
            </div>
            @if (syncMsg()) { <p class="form-msg" [class.err]="!syncOk()" [class.ok]="syncOk()">{{ syncMsg() }}</p> }

            @if (feeds().length === 0) {
              <p class="panel-empty">Aucun flux. Ajoutez-en un ci-dessous.</p>
            }
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
          </div>
        }
      }
    </div>
  `,
})
export class NewsPanelComponent implements OnInit {
  private readonly svc = inject(NewsService);

  readonly categories = POST_CATEGORIES;
  readonly statuses = POST_STATUSES;
  readonly editorStatuses = EDITOR_STATUSES;
  readonly placeholder = '/assets/img/w/w-annonce.webp';

  readonly mode = signal<'publications' | 'feeds'>('publications');
  readonly posts = signal<AdminPost[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<PostStatus | null>(null);
  readonly search = signal('');
  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly detailsOpen = signal(false);
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
    const q = this.search().trim().toLowerCase();
    return this.posts().filter((p) => {
      if (f && p.status !== f) return false;
      if (q && !`${p.title} ${p.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  readonly publishedLocal = () => isoToLocal(this.draft.publishedAt);
  readonly startsLocal = () => isoToLocal(this.draft.startsAt);
  readonly endsLocal = () => isoToLocal(this.draft.endsAt);
  readonly toIso = (v: string) => localToIso(v);

  statusHint(): string {
    return EDITOR_STATUSES.find((s) => s.value === this.draft.status)?.hint ?? '';
  }

  hasDetails(): boolean {
    const d = this.draft;
    return Boolean(d.location || d.startsAt || d.endsAt || d.ctaLabel || d.ctaUrl || d.promoCode || d.source || d.gallery.length);
  }

  ngOnInit(): void {
    this.reload();
    this.loadFeeds();
  }

  private loadFeeds(): void {
    this.svc.listFeeds().subscribe({ next: (f) => this.feeds.set(f) });
  }

  setStatus(s: PostStatus): void {
    this.draft.status = s;
    if (s !== 'scheduled') this.draft.publishedAt = null;
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
    const src = (this.draft.body ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = src.split('\n');
    const out: string[] = [];
    let para: string[] = [];
    let list: 'ul' | 'ol' | null = null;

    const flushPara = () => {
      if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
    };
    const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };
    const inline = (s: string) =>
      s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, '$1<em>$2</em>')
        .replace(/\[(.+?)\]\((https?:\/\/[^)]+|\/[^)]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    for (const raw of lines) {
      const line = raw.trimEnd();
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      const li = /^[-*]\s+(.*)$/.exec(line);
      const oli = /^\d+\.\s+(.*)$/.exec(line);
      if (h) {
        flushPara(); flushList();
        const lvl = h[1].length + 1;
        out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      } else if (li) {
        flushPara();
        if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; }
        out.push(`<li>${inline(li[1])}</li>`);
      } else if (oli) {
        flushPara();
        if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; }
        out.push(`<li>${inline(oli[1])}</li>`);
      } else if (line.trim() === '') {
        flushPara(); flushList();
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara(); flushList();
    return out.join('');
  }

  private reload(): void {
    this.loading.set(true);
    this.svc.adminList().subscribe({
      next: (list) => { this.posts.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  categoryLabel(c: PostCategory): string { return this.categories.find((x) => x.value === c)?.label ?? c; }
  statusLabel(s: PostStatus): string { return this.statuses.find((x) => x.value === s)?.label ?? s; }

  newPost(): void {
    this.draft = emptyDraft();
    this.editingId.set(null);
    this.detailsOpen.set(false);
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
        this.detailsOpen.set(this.hasDetails());
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
      this.fail('Un article programmé doit avoir une date de publication.');
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
    if (!id || !confirm('Supprimer définitivement cet article ?')) return;
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
