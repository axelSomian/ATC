import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import type { PostCard } from '../../core/models/news.model';
import { NewsCardComponent } from './news-card.component';

@Component({
  selector: 'app-news-events',
  standalone: true,
  imports: [RouterLink, NewsCardComponent],
  styles: [`
    .ev-page { max-width: 1000px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: var(--space-4); }
    .ev-page h1 { font-size: var(--text-2xl); font-weight: 700; margin: 0; }
    .back { align-self: flex-start; font-size: var(--text-sm); color: var(--color-muted); text-decoration: none; }
    .back:hover { color: var(--color-ink); }
    .hint { text-align: center; color: var(--color-muted); font-size: var(--text-sm); padding: var(--space-8) 0; }
    .grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
    @media (min-width: 560px) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr 1fr; } }
  `],
  template: `
    <div class="ev-page">
      <a routerLink="/actualite" class="back">← Actualité</a>
      <h1>Calendrier ATC</h1>
      @if (loading()) {
        <p class="hint">Chargement…</p>
      } @else if (events().length === 0) {
        <p class="hint">Aucun événement à venir pour l'instant.</p>
      } @else {
        <div class="grid">
          @for (e of events(); track e.id) { <app-news-card [post]="e" /> }
        </div>
      }
    </div>
  `,
})
export class NewsEventsComponent implements OnInit {
  private readonly svc = inject(NewsService);
  readonly events = signal<PostCard[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.svc.allEvents().subscribe({
      next: (e) => { this.events.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
