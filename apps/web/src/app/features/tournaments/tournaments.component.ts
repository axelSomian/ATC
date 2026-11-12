import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentsService, type Tournament } from '../../core/services/tournaments.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [DatePipe, RouterLink, EmptyStateComponent],
  templateUrl: './tournaments.component.html',
  styleUrl: './tournaments.component.css',
})
export class TournamentsComponent implements OnInit {
  private readonly svc = inject(TournamentsService);

  readonly tournaments = signal<Tournament[]>([]);
  readonly loading      = signal(true);
  readonly pendingId     = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.svc.getAll().subscribe({
      next: (t) => { this.tournaments.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(t: Tournament): string {
    switch (t.status) {
      case 'open':      return 'Inscriptions ouvertes';
      case 'upcoming':   return 'Bientôt ouvert';
      case 'closed':     return 'Inscriptions closes';
      case 'completed':  return 'Terminé';
    }
  }

  register(t: Tournament, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.pendingId()) return;
    this.pendingId.set(t.id);
    this.svc.register(t.id).subscribe({
      next: () => { this.pendingId.set(null); this.load(); },
      error: () => this.pendingId.set(null),
    });
  }

  unregister(t: Tournament, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.pendingId()) return;
    this.pendingId.set(t.id);
    this.svc.unregister(t.id).subscribe({
      next: () => { this.pendingId.set(null); this.load(); },
      error: () => this.pendingId.set(null),
    });
  }
}
