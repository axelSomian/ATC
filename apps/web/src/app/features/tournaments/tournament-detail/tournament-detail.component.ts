import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  TournamentsService,
  type Bracket,
  type BracketMatch,
  type Tournament,
  type TournamentDetail,
} from '../../../core/services/tournaments.service';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tournament-detail.component.html',
  styleUrl: './tournament-detail.component.css',
})
export class TournamentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(TournamentsService);

  readonly loading   = signal(true);
  readonly notFound  = signal(false);
  readonly pendingId = signal(false);

  readonly tournament     = signal<TournamentDetail | null>(null);
  readonly bracket        = signal<Bracket | null>(null);
  readonly bracketLoading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.svc.getOne(id).subscribe({
      next: (d) => {
        this.tournament.set(d);
        this.loading.set(false);
        if (d.bracketPublished) this.loadBracket(id);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notFound.set(err.status === 404);
      },
    });
  }

  private loadBracket(id: string): void {
    this.bracketLoading.set(true);
    this.svc.getBracket(id).subscribe({
      next: (b) => { this.bracket.set(b); this.bracketLoading.set(false); },
      error: () => this.bracketLoading.set(false),
    });
  }

  statusLabel(t: { status: Tournament['status'] }): string {
    switch (t.status) {
      case 'open':      return 'Inscriptions ouvertes';
      case 'upcoming':   return 'Bientôt ouvert';
      case 'closed':     return 'Inscriptions closes';
      case 'completed':  return 'Terminé';
    }
  }

  // Tableau en CSS Grid : chaque match du tour r occupe 2^r lignes, donc il est
  // centré exactement entre ses deux matchs d'origine. Une colonne étroite entre
  // deux tours porte les traits de liaison.
  matchColumn(round: number): number {
    return (round - 1) * 2 + 1;
  }

  connectorColumn(round: number): number {
    return round * 2;
  }

  matchGridRow(m: BracketMatch): string {
    const span = 2 ** m.round;
    return `${m.slot * span + 2} / span ${span}`;
  }

  bracketColumns(totalRounds: number): string {
    const cols: string[] = [];
    for (let r = 1; r <= totalRounds; r++) {
      cols.push('minmax(200px, 1fr)');
      if (r < totalRounds) cols.push('32px');
    }
    return cols.join(' ');
  }

  bracketRows(totalRounds: number): string {
    // Hauteur de ligne fixe : garantit que la jonction des traits tombe pile au
    // centre du match suivant, même si certains matchs affichent un score.
    return `auto repeat(${2 ** totalRounds}, 50px)`;
  }

  remaining(t: TournamentDetail): number | null {
    return t.maxPlayers != null ? Math.max(0, t.maxPlayers - t.participants.length) : null;
  }

  register(): void {
    const t = this.tournament();
    if (!t || this.pendingId()) return;
    this.pendingId.set(true);
    this.svc.register(t.id).subscribe({
      next: (d) => { this.tournament.set(d); this.pendingId.set(false); },
      error: () => this.pendingId.set(false),
    });
  }

  unregister(): void {
    const t = this.tournament();
    if (!t || this.pendingId()) return;
    this.pendingId.set(true);
    this.svc.unregister(t.id).subscribe({
      next: (d) => { this.tournament.set(d); this.pendingId.set(false); },
      error: () => this.pendingId.set(false),
    });
  }
}
