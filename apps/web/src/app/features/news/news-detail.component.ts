import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import { POST_CATEGORIES, type PostCategory, type PostDetail } from '../../core/models/news.model';

const CTA_DEFAULT: Record<PostCategory, string> = {
  tournoi: 'Voir le tournoi',
  evenement: "Voir l'événement",
  partenariat: "Découvrir l'offre",
  infos_tennis: "Lire l'article",
  atc: 'En savoir plus',
};

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  styleUrl: './news-detail.component.css',
  template: `
    <div class="detail-page">
      <a routerLink="/actualite" class="back">← Actualité</a>

      @if (loading()) {
        <p class="hint">Chargement…</p>
      } @else if (error()) {
        <p class="hint">{{ error() }}</p>
      } @else if (post()) {
        @if (post(); as p) {
        <article class="article">
          @if (p.coverImageUrl) {
            <img class="hero" [src]="p.coverImageUrl" [alt]="p.title" />
          }
          <span class="cat-chip">{{ catLabel(p.category) }}</span>
          <h1>{{ p.title }}</h1>
          <p class="meta">
            {{ (p.publishedAt || p.date) | date: 'EEEE d MMMM y' }}
            @if (p.source) { · {{ p.source }} }
          </p>

          @if (p.startsAt || p.location) {
            <div class="event-bar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              @if (p.startsAt) {
                <span>{{ p.startsAt | date: 'd MMM y, HH:mm' }}</span>
                @if (p.endsAt) { <span>→ {{ p.endsAt | date: 'd MMM, HH:mm' }}</span> }
              }
              @if (p.location) { <span class="dot">·</span><span>{{ p.location }}</span> }
            </div>
          }

          <div class="body" [innerHTML]="p.bodyHtml"></div>

          @if (p.gallery.length > 0) {
            <div class="gallery">
              @for (g of p.gallery; track g) { <img [src]="g" alt="" loading="lazy" /> }
            </div>
          }

          <div class="actions">
            @if (p.ctaUrl) {
              @if (isInternal(p.ctaUrl)) {
                <button class="btn btn-primary btn-sm" (click)="goInternal(p.ctaUrl)">{{ ctaLabel(p) }}</button>
              } @else {
                <a [href]="p.ctaUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">{{ ctaLabel(p) }}</a>
              }
            }
            <button class="btn btn-outline btn-sm" (click)="share(p)">Partager</button>
          </div>
          @if (shareMsg()) { <p class="share-msg">{{ shareMsg() }}</p> }
        </article>
        }
      }
    </div>
  `,
})
export class NewsDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(NewsService);

  readonly post = signal<PostDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly shareMsg = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug');
      if (slug) this.load(slug);
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.detail(slug).subscribe({
      next: (p) => { this.post.set(p); this.loading.set(false); },
      error: () => { this.error.set('Actualité introuvable ou plus disponible.'); this.loading.set(false); },
    });
  }

  catLabel = (c: PostCategory) => POST_CATEGORIES.find((x) => x.value === c)?.label ?? c;
  ctaLabel = (p: PostDetail) => p.ctaLabel || CTA_DEFAULT[p.category];
  isInternal = (url: string) => url.startsWith('/');
  goInternal = (url: string) => this.router.navigateByUrl(url);

  async share(p: PostDetail): Promise<void> {
    const url = `${location.origin}/actualite/${p.slug}`;
    const data = { title: p.title, text: p.summary, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      this.shareMsg.set('Lien copié ✓');
      setTimeout(() => this.shareMsg.set(''), 2500);
    } catch {
      /* annulé par l'utilisateur */
    }
  }
}
