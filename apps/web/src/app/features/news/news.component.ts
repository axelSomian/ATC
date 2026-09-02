import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import { POST_CATEGORIES, type PostCard, type PostCategory } from '../../core/models/news.model';
import { NewsCardComponent } from './news-card.component';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [DatePipe, RouterLink, NewsCardComponent],
  styleUrl: './news.component.css',
  template: `
    <div class="news-page">
      <header class="news-head">
        <h1>Actualité</h1>
        <p>Tournois, événements, partenariats et infos tennis de la communauté ATC.</p>
      </header>

      <!-- À la une -->
      @if (featured().length > 0) {
        <section class="featured" aria-label="À la une">
          <div class="featured-track">
            @for (p of featured(); track p.id) {
              <a class="featured-card" [routerLink]="['/actualite', p.slug]"
                 [style.background-image]="bg(p.coverImageUrl)">
                <span class="featured-veil"></span>
                <span class="featured-body">
                  <span class="cat-chip light">{{ catLabel(p.category) }}</span>
                  <span class="featured-title">{{ p.title }}</span>
                  <span class="featured-summary">{{ p.summary }}</span>
                  <span class="featured-meta">
                    {{ p.date | date: 'd MMM y' }}
                    @if (p.startsAt) { · {{ p.startsAt | date: 'd MMM, HH:mm' }} }
                    @if (p.location) { · {{ p.location }} }
                  </span>
                  <span class="featured-cta">{{ p.ctaLabel || 'En savoir plus' }} →</span>
                </span>
              </a>
            }
          </div>
        </section>
      }

      <div class="news-body">
        <main class="news-main">
          <!-- Filtres catégories -->
          <nav class="cat-filters" aria-label="Filtrer par catégorie">
            <button class="cat-pill" [class.active]="category() === null" (click)="setCategory(null)">Tous</button>
            @for (c of allCategories; track c.value) {
              <button class="cat-pill" [class.active]="category() === c.value" (click)="setCategory(c.value)">
                {{ c.label }}
              </button>
            }
          </nav>

          @if (loading()) {
            <p class="news-hint">Chargement…</p>
          } @else if (feed().length === 0) {
            <p class="news-hint">Aucune publication pour l'instant.</p>
          } @else {
            <div class="feed">
              @for (p of feed(); track p.id) {
                <app-news-card [post]="p" />
              }
            </div>
            @if (nextCursor()) {
              <button class="load-more" (click)="loadMore()" [disabled]="loadingMore()">
                {{ loadingMore() ? 'Chargement…' : 'Charger plus d\\'actualités' }}
              </button>
            }
          }
        </main>

        <aside class="news-side">
          @if (events().length > 0) {
            <section class="side-card">
              <div class="side-head">
                <h2>Prochains événements</h2>
                <a routerLink="/actualite/evenements" class="side-all">Tout voir</a>
              </div>
              <ul class="event-list">
                @for (e of events(); track e.id) {
                  <li>
                    <a [routerLink]="['/actualite', e.slug]" class="event-row">
                      <span class="event-date">
                        <span class="event-day">{{ (e.startsAt || e.date) | date: 'd' }}</span>
                        <span class="event-mon">{{ (e.startsAt || e.date) | date: 'MMM' }}</span>
                      </span>
                      <span class="event-info">
                        <span class="event-name">{{ e.title }}</span>
                        <span class="event-loc">
                          @if (e.startsAt) { {{ e.startsAt | date: 'HH:mm' }} }
                          @if (e.location) { · {{ e.location }} }
                        </span>
                      </span>
                    </a>
                  </li>
                }
              </ul>
            </section>
          }

          @if (partner(); as pt) {
            <section class="side-card partner">
              <span class="partner-tag">Partenaire du mois</span>
              @if (pt.coverImageUrl) { <img class="partner-img" [src]="pt.coverImageUrl" [alt]="pt.title" /> }
              <h2>{{ pt.title }}</h2>
              <p>{{ pt.summary }}</p>
              @if (pt.promoCode) {
                <p class="partner-code">Code <strong>{{ pt.promoCode }}</strong></p>
              }
              <a [routerLink]="['/actualite', pt.slug]" class="btn btn-primary btn-sm">
                {{ pt.ctaLabel || 'Découvrir l\\'offre' }}
              </a>
            </section>
          }
        </aside>
      </div>
    </div>
  `,
})
export class NewsComponent implements OnInit {
  private readonly svc = inject(NewsService);

  readonly allCategories = POST_CATEGORIES;

  readonly featured = signal<PostCard[]>([]);
  readonly events = signal<PostCard[]>([]);
  readonly partner = signal<PostCard | null>(null);

  readonly feed = signal<PostCard[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly category = signal<PostCategory | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);

  ngOnInit(): void {
    this.svc.featured().subscribe({ next: (f) => this.featured.set(f) });
    this.svc.upcomingEvents().subscribe({ next: (e) => this.events.set(e) });
    this.svc.partnerOfMonth().subscribe({ next: (p) => this.partner.set(p) });
    this.reload();
  }

  bg = (url: string | null) => (url ? `url(${url})` : 'none');
  catLabel = (c: PostCategory) => this.allCategories.find((x) => x.value === c)?.label ?? c;

  setCategory(c: PostCategory | null): void {
    if (this.category() === c) return;
    this.category.set(c);
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.svc.feed({ category: this.category() ?? undefined }).subscribe({
      next: (r) => {
        this.feed.set(r.data);
        this.nextCursor.set(r.nextCursor);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor) return;
    this.loadingMore.set(true);
    this.svc.feed({ category: this.category() ?? undefined, cursor }).subscribe({
      next: (r) => {
        this.feed.update((list) => [...list, ...r.data]);
        this.nextCursor.set(r.nextCursor);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
