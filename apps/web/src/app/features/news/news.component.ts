import {
  AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import { NewsBookmarksService } from '../../core/services/news-bookmarks.service';
import { AuthStore } from '../../core/stores/auth.store';
import { POST_CATEGORIES, type PostCard, type PostCategory } from '../../core/models/news.model';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

interface Filter { value: PostCategory | null; label: string; icon: string; }

const G = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const CAT_ICONS: Record<string, string> = {
  all: `<svg viewBox="0 0 24 24" ${G}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  tournoi: `<svg viewBox="0 0 24 24" ${G}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  evenement: `<svg viewBox="0 0 24 24" ${G}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  partenariat: `<svg viewBox="0 0 24 24" ${G}><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3-3 3-4-4"/><path d="M11 4 8 7l-3-3"/><path d="m3 11 3-3"/></svg>`,
  infos_tennis: `<svg viewBox="0 0 24 24" ${G}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  atc: `<svg viewBox="0 0 24 24" ${G}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C15.5 3.8 18 5 20 5a1 1 0 0 1 1 1Z"/></svg>`,
};

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [DatePipe, RouterLink, TimeAgoPipe],
  styleUrl: './news.component.css',
  template: `
    <div class="news-page">
      <header class="news-head">
        <div>
          <h1>Actualité</h1>
          <p>Restez informé de tout ce qui se passe dans la communauté ATC et dans le monde du tennis.</p>
        </div>
        @if (isAdmin()) {
          <a routerLink="/admin" [queryParams]="{ tab: 'news' }" class="btn btn-primary btn-sm publish-btn">+ Publier une annonce</a>
        }
      </header>

      <nav class="cat-filters" aria-label="Filtrer par catégorie">
        @for (f of filters; track f.label) {
          <button class="cat-pill" [class.active]="category() === f.value" (click)="setCategory(f.value)">
            <span class="cat-ic" [innerHTML]="f.icon"></span>{{ f.label }}
          </button>
        }
      </nav>

      <div class="news-body">
        <main class="news-main">
          <!-- À la une -->
          @if (featured().length > 0) {
            <section class="featured" aria-label="À la une">
              <h2 class="sec-title">À la une</h2>
              <div class="hero-wrap">
                <div class="hero-track" #hero (scroll)="onHeroScroll()">
                  @for (p of featured(); track p.id) {
                    <a class="hero-card" [routerLink]="['/actualite', p.slug]"
                       [style.background-image]="bg(p.coverImageUrl)">
                      <span class="hero-veil"></span>
                      <span class="hero-body">
                        <span class="cat-chip light">{{ catLabel(p.category) }}</span>
                        <span class="hero-title">{{ p.title }}</span>
                        <span class="hero-summary">{{ p.summary }}</span>
                        <span class="hero-meta">
                          @if (p.startsAt) {
                            {{ p.startsAt | date: 'd MMM y' }}
                          } @else {
                            {{ p.date | date: 'd MMM y' }}
                          }
                          @if (p.location) {
                            <span class="hero-loc">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                              {{ p.location }}
                            </span>
                          }
                        </span>
                        <span class="hero-cta">{{ p.ctaLabel || 'En savoir plus' }}</span>
                      </span>
                    </a>
                  }
                </div>
                @if (featured().length > 1) {
                  <button class="hero-arrow prev" (click)="scrollHero(-1)" aria-label="Précédent">‹</button>
                  <button class="hero-arrow next" (click)="scrollHero(1)" aria-label="Suivant">›</button>
                  <div class="hero-dots">
                    @for (p of featured(); track p.id; let i = $index) {
                      <span class="hero-dot" [class.on]="i === heroIndex()" (click)="goHero(i)"></span>
                    }
                  </div>
                }
              </div>
            </section>
          }

          <!-- Feed -->
          <section class="feed-sec">
            <h2 class="sec-title">Dernières annonces</h2>
            @if (loading()) {
              <p class="news-hint">Chargement…</p>
            } @else if (feed().length === 0) {
              <p class="news-hint">Aucune publication pour l'instant.</p>
            } @else {
              <div class="feed">
                @for (p of feed(); track p.id) {
                  <article class="feed-row">
                    <a class="feed-thumb" [routerLink]="['/actualite', p.slug]"
                       [class.placeholder]="!p.coverImageUrl"
                       [style.background-image]="bg(p.coverImageUrl)"></a>
                    <div class="feed-main">
                      <div class="feed-top">
                        <span class="cat-chip">{{ catLabel(p.category) }}</span>
                        <span class="feed-age">{{ p.date | timeAgo }}</span>
                      </div>
                      <a class="feed-title" [routerLink]="['/actualite', p.slug]">{{ p.title }}</a>
                      <p class="feed-summary">{{ p.summary }}</p>
                      <div class="feed-bottom">
                        <span class="feed-meta">
                          @if (p.startsAt) { {{ p.startsAt | date: 'EEE d MMM y' }} · {{ p.startsAt | date: 'HH:mm' }} }
                          @else { {{ p.date | date: 'd MMM y' }} }
                          @if (p.location) { · {{ p.location }} }
                        </span>
                        <button class="bookmark" [class.on]="marks.has(p.id)" (click)="marks.toggle(p.id)"
                                [attr.aria-label]="marks.has(p.id) ? 'Retirer' : 'Enregistrer'">
                          <svg width="16" height="16" viewBox="0 0 24 24" [attr.fill]="marks.has(p.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      </div>
                      @if (feedCta(p); as cta) {
                        <a class="feed-cta" [routerLink]="['/actualite', p.slug]">{{ cta }} ›</a>
                      }
                    </div>
                  </article>
                }
              </div>
              @if (nextCursor()) {
                <button class="load-more" (click)="loadMore()" [disabled]="loadingMore()">
                  {{ loadingMore() ? 'Chargement…' : 'Charger plus d\\'annonces' }} ⌄
                </button>
              }
            }
          </section>
        </main>

        <aside class="news-side">
          @if (events().length > 0) {
            <section class="side-card">
              <div class="side-head">
                <h2>Événements à venir</h2>
                <a routerLink="/actualite/evenements" class="side-all">Voir tout</a>
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
                        <span class="event-when">
                          {{ (e.startsAt || e.date) | date: 'd MMM' }}@if (e.endsAt) { – {{ e.endsAt | date: 'd MMM y' }} }
                        </span>
                        @if (e.location) {
                          <span class="event-loc">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            {{ e.location }}
                          </span>
                        }
                      </span>
                    </a>
                  </li>
                }
              </ul>
              <a routerLink="/actualite/evenements" class="side-btn">Voir tous les événements</a>
            </section>
          }

          @if (partner(); as pt) {
            <a class="side-card partner" [routerLink]="['/actualite', pt.slug]"
               [style.background-image]="bg(pt.coverImageUrl)">
              <span class="partner-veil"></span>
              <span class="partner-inner">
                <span class="partner-tag">Partenaire du mois</span>
                <span class="partner-name">{{ pt.title }}</span>
                <span class="partner-desc">{{ pt.summary }}</span>
                @if (pt.promoCode) {
                  <span class="partner-code">Code <strong>{{ pt.promoCode }}</strong></span>
                }
                <span class="btn btn-light btn-sm">{{ pt.ctaLabel || 'Découvrir l\\'offre' }}</span>
              </span>
            </a>
          }

          @if (tennisNews().length > 0) {
            <section class="side-card">
              <div class="side-head">
                <h2>Actualités tennis</h2>
                <a routerLink="/actualite" class="side-all" (click)="setCategory('infos_tennis')">Voir tout</a>
              </div>
              <ul class="tn-list">
                @for (t of tennisNews(); track t.id) {
                  <li>
                    <a [routerLink]="['/actualite', t.slug]" class="tn-row">
                      <span class="tn-thumb" [class.placeholder]="!t.coverImageUrl" [style.background-image]="bg(t.coverImageUrl)"></span>
                      <span class="tn-info">
                        <span class="tn-title">{{ t.title }}</span>
                        <span class="tn-age">{{ t.date | timeAgo }}</span>
                      </span>
                    </a>
                  </li>
                }
              </ul>
              <a routerLink="/actualite" class="side-btn" (click)="setCategory('infos_tennis')">Voir toutes les actualités tennis</a>
            </section>
          }
        </aside>
      </div>
    </div>
  `,
})
export class NewsComponent implements OnInit, AfterViewInit {
  private readonly svc = inject(NewsService);
  private readonly store = inject(AuthStore);
  readonly marks = inject(NewsBookmarksService);

  @ViewChild('hero') heroEl?: ElementRef<HTMLDivElement>;

  readonly isAdmin = this.store.isAdmin;
  readonly filters: Filter[] = [
    { value: null, label: 'Tous', icon: CAT_ICONS['all'] },
    ...POST_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: CAT_ICONS[c.value] })),
  ];

  readonly featured = signal<PostCard[]>([]);
  readonly events = signal<PostCard[]>([]);
  readonly partner = signal<PostCard | null>(null);
  readonly tennisNews = signal<PostCard[]>([]);

  readonly feed = signal<PostCard[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly category = signal<PostCategory | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly heroIndex = signal(0);

  ngOnInit(): void {
    this.svc.featured().subscribe({ next: (f) => this.featured.set(f) });
    this.svc.upcomingEvents().subscribe({ next: (e) => this.events.set(e) });
    this.svc.partnerOfMonth().subscribe({ next: (p) => this.partner.set(p) });
    this.svc.feed({ category: 'infos_tennis', limit: 4 }).subscribe({ next: (r) => this.tennisNews.set(r.data) });
    this.reload();
  }

  ngAfterViewInit(): void { /* hero refs prêts */ }

  bg = (url: string | null) => (url ? `url(${url})` : 'none');
  catLabel = (c: PostCategory) => POST_CATEGORIES.find((x) => x.value === c)?.label ?? c;

  /** Libellé du lien « accès au détail » sous une ligne de feed (rien pour les événements). */
  feedCta(p: PostCard): string {
    if (p.category === 'evenement') return '';
    if (p.ctaLabel) return p.ctaLabel;
    switch (p.category) {
      case 'tournoi': return 'Voir le tournoi';
      case 'partenariat': return "Découvrir l'offre";
      case 'infos_tennis': return "Lire l'article complet";
      default: return 'En savoir plus';
    }
  }

  setCategory(c: PostCategory | null): void {
    if (this.category() === c) return;
    this.category.set(c);
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.svc.feed({ category: this.category() ?? undefined }).subscribe({
      next: (r) => { this.feed.set(r.data); this.nextCursor.set(r.nextCursor); this.loading.set(false); },
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

  // ── Carrousel à la une ──
  onHeroScroll(): void {
    const el = this.heroEl?.nativeElement;
    if (!el) return;
    this.heroIndex.set(Math.round(el.scrollLeft / el.clientWidth));
  }
  scrollHero(dir: 1 | -1): void {
    const el = this.heroEl?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  }
  goHero(i: number): void {
    const el = this.heroEl?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }
}
