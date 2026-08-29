import { Component, HostListener, computed, inject } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { CourtMapService } from '../../core/services/court-map.service';

/**
 * Fenêtre carte d'un terrain : plan OpenStreetMap (sans clé API) + liens
 * d'itinéraire. Montée une seule fois dans le layout, pilotée par
 * `CourtMapService`. Repli sur une recherche Google Maps si le terrain
 * n'a pas de coordonnées renseignées.
 */
@Component({
  selector: 'app-court-map',
  standalone: true,
  imports: [],
  templateUrl: './court-map.component.html',
  styleUrl: './court-map.component.css',
})
export class CourtMapComponent {
  private readonly svc = inject(CourtMapService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly target = this.svc.target;
  readonly hasCoords = computed(() => {
    const t = this.target();
    return !!t && t.lat != null && t.lng != null;
  });

  /** URL de l'iframe OpenStreetMap centrée sur le terrain, avec marqueur. */
  readonly embedUrl = computed<SafeResourceUrl | ''>(() => {
    const t = this.target();
    if (!t || t.lat == null || t.lng == null) return '';
    const d = 0.008;
    const bbox = [t.lng - d, t.lat - d, t.lng + d, t.lat + d].map((n) => n.toFixed(5)).join('%2C');
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${t.lat.toFixed(5)}%2C${t.lng.toFixed(5)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  /** Lien itinéraire : ouvre Google Maps / Waze / Plans sur mobile. */
  readonly directionsUrl = computed(() => {
    const t = this.target();
    if (!t) return '';
    if (t.lat != null && t.lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`;
    }
    return this.searchUrl();
  });

  readonly osmUrl = computed(() => {
    const t = this.target();
    if (!t || t.lat == null || t.lng == null) return '';
    return `https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=16/${t.lat}/${t.lng}`;
  });

  searchUrl(): string {
    const t = this.target();
    if (!t) return '';
    const q = encodeURIComponent(`${t.name}${t.zone ? ', ' + t.zone : ''}, Abidjan, Côte d'Ivoire`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  close(): void {
    this.svc.close();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.target()) this.close();
  }
}
