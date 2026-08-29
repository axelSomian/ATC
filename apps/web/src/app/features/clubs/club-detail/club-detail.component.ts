import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ClubsService } from '../../../core/services/clubs.service';
import { ClubFavoritesService } from '../../../core/services/club-favorites.service';
import { MembersService } from '../../../core/services/members.service';
import { ReferenceService } from '../../../core/services/reference.service';
import type { ClubDetail } from '../../../core/models/reference.model';
import type { UserProfile } from '../../../core/models/user.model';

const PREVIEW_LIMIT = 12;

@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './club-detail.component.html',
  styleUrl: './club-detail.component.css',
})
export class ClubDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clubs = inject(ClubsService);
  private readonly members = inject(MembersService);
  private readonly reference = inject(ReferenceService);
  private readonly favs = inject(ClubFavoritesService);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly club = signal<ClubDetail | null>(null);

  readonly memberPreview = signal<UserProfile[]>([]);
  readonly memberTotal = signal(0);

  readonly dots = [1, 2, 3, 4, 5];
  readonly hasMoreMembers = computed(() => this.memberTotal() > this.memberPreview().length);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.clubs.get(slug).subscribe({
      next: (club) => {
        this.club.set(club);
        this.loading.set(false);
        this.loadMembers(slug);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notFound.set(err.status === 404);
      },
    });
  }

  private loadMembers(slug: string): void {
    this.members.listMembers({ club: slug, limit: PREVIEW_LIMIT }).subscribe({
      next: (page) => {
        this.memberPreview.set(page.data);
        this.memberTotal.set(page.total);
      },
    });
  }

  levelLabel(level: number): string {
    return this.reference.levelLabel(level);
  }

  initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  isFavorite(): boolean {
    const c = this.club();
    return c ? this.favs.has(c.slug) : false;
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const c = this.club();
    if (c) this.favs.toggle(c.slug);
  }
}
