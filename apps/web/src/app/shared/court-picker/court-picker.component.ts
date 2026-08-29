import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

/** Centre d'Abidjan — position de départ quand le terrain n'a pas encore de point. */
const ABIDJAN: L.LatLngTuple = [5.345, -4.014];
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

export interface PickedPoint {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Carte interactive pour placer un terrain : recherche d'adresse (Nominatim /
 * OpenStreetMap, sans clé), clic sur la carte ou repère déplaçable. Émet la
 * position (et l'adresse trouvée par géocodage inverse) via `picked`.
 */
@Component({
  selector: 'app-court-picker',
  standalone: true,
  imports: [],
  templateUrl: './court-picker.component.html',
  styleUrl: './court-picker.component.css',
})
export class CourtPickerComponent implements AfterViewInit, OnDestroy {
  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);

  readonly picked = output<PickedPoint>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: L.Map;
  private marker?: L.Marker;

  readonly query = signal('');
  readonly searching = signal(false);
  readonly results = signal<GeoResult[]>([]);
  readonly current = signal<{ lat: number; lng: number } | null>(null);

  readonly currentLabel = computed(() => {
    const c = this.current();
    return c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : 'Aucun point placé';
  });

  ngAfterViewInit(): void {
    const hasPoint = this.lat() != null && this.lng() != null;
    const start: L.LatLngTuple = hasPoint ? [this.lat()!, this.lng()!] : ABIDJAN;

    this.map = L.map(this.mapEl().nativeElement).setView(start, hasPoint ? 16 : 12);
    L.tileLayer(TILES, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    if (hasPoint) this.place(this.lat()!, this.lng()!, false);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.place(e.latlng.lat, e.latlng.lng, true));

    // Le conteneur vient peut-être d'apparaître (modale) → recalage des tuiles.
    setTimeout(() => this.map?.invalidateSize(), 80);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  async search(): Promise<void> {
    const q = this.query().trim();
    if (!q || this.searching()) return;
    this.searching.set(true);
    this.results.set([]);
    try {
      const url = `${NOMINATIM}/search?format=json&limit=6&countrycodes=ci&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
      this.results.set(data.map((d) => ({ label: d.display_name, lat: +d.lat, lng: +d.lon })));
    } catch {
      this.results.set([]);
    } finally {
      this.searching.set(false);
    }
  }

  choose(r: GeoResult): void {
    this.results.set([]);
    this.query.set('');
    this.map?.setView([r.lat, r.lng], 17);
    this.place(r.lat, r.lng, true, r.label);
  }

  private place(lat: number, lng: number, reverse: boolean, knownAddress?: string): void {
    const icon = L.divIcon({
      className: 'court-pin',
      html:
        '<svg viewBox="0 0 24 24" width="32" height="32" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">' +
        '<path style="fill:var(--color-accent)" d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/>' +
        '<circle cx="12" cy="9" r="2.6" style="fill:#fff"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 30],
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true, icon }).addTo(this.map!);
      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.place(p.lat, p.lng, true);
      });
    }

    const point: PickedPoint = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (knownAddress) point.address = knownAddress;
    this.current.set({ lat: point.lat, lng: point.lng });
    this.picked.emit(point);

    if (reverse && !knownAddress) this.reverseGeocode(point.lat, point.lng);
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const url = `${NOMINATIM}/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name && this.current()?.lat === lat && this.current()?.lng === lng) {
        this.picked.emit({ lat, lng, address: data.display_name });
      }
    } catch {
      /* l'adresse reste manuelle */
    }
  }
}
