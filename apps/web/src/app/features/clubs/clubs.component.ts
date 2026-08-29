import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReferenceService } from '../../core/services/reference.service';

/**
 * Annuaire des clubs de la communauté, groupés par zone. Chaque club renvoie
 * vers la liste des membres qui y sont rattachés (`/members?club=<slug>`).
 * Source : `ReferenceService` (chargé au démarrage, `GET /api/v1/clubs`).
 */
@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.css',
})
export class ClubsComponent {
  private readonly reference = inject(ReferenceService);

  readonly search = signal('');

  readonly total = computed(() => this.reference.clubs().filter((c) => c.slug !== 'autre').length);

  readonly totalMembers = computed(() =>
    this.reference
      .clubs()
      .filter((c) => c.slug !== 'autre')
      .reduce((sum, c) => sum + (c.memberCount ?? 0), 0),
  );

  readonly groups = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.reference
      .clubsByZone()
      .map((g) => ({
        zone: g.zone,
        clubs: q
          ? g.clubs.filter(
              (c) => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q),
            )
          : g.clubs,
      }))
      .filter((g) => g.clubs.length > 0);
  });
}
