import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POST_CATEGORIES, type PostCard, type PostCategory } from '../../core/models/news.model';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [DatePipe, RouterLink],
  styles: [`
    .cat-chip { align-self: flex-start; font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--color-accent); background: var(--color-accent-alpha);
      padding: 3px 8px; border-radius: var(--radius-full); }
    .card-link { display: flex; flex-direction: column; text-decoration: none; color: var(--color-ink);
      background: var(--color-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); overflow: hidden; transition: box-shadow var(--transition), transform var(--transition); }
    .card-link:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .card-cover { aspect-ratio: 16 / 9; background: var(--color-cream) center/cover no-repeat; }
    .card-cover.placeholder { background:
      linear-gradient(135deg, var(--color-deep-forest), var(--color-accent)); }
    .card-body { padding: var(--space-3) var(--space-4) var(--space-4); display: flex; flex-direction: column; gap: 6px; }
    .card-title { font-weight: 650; font-size: var(--text-md); line-height: 1.3; }
    .card-summary { font-size: var(--text-sm); color: var(--color-muted); line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-meta { font-size: var(--text-xs); color: var(--color-muted); margin-top: 2px; }
    .card-cta { font-size: var(--text-xs); font-weight: 600; color: var(--color-accent); margin-top: 4px; }
  `],
  template: `
    <a class="card-link" [routerLink]="['/actualite', post.slug]">
      @if (post.coverImageUrl) {
        <span class="card-cover" [style.background-image]="'url(' + post.coverImageUrl + ')'"></span>
      } @else {
        <span class="card-cover placeholder"></span>
      }
      <span class="card-body">
        <span class="cat-chip">{{ catLabel(post.category) }}</span>
        <span class="card-title">{{ post.title }}</span>
        <span class="card-summary">{{ post.summary }}</span>
        <span class="card-meta">
          {{ (post.publishedAt || post.date) | date: 'd MMMM y' }}
          @if (post.startsAt) { · {{ post.startsAt | date: 'd MMM, HH:mm' }} }
          @if (post.location) { · {{ post.location }} }
        </span>
        @if (post.ctaLabel) { <span class="card-cta">{{ post.ctaLabel }} →</span> }
      </span>
    </a>
  `,
})
export class NewsCardComponent {
  @Input({ required: true }) post!: PostCard;
  catLabel = (c: PostCategory) => POST_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
