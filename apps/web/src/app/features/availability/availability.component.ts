import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { AvailabilityService } from '../../core/services/availability.service';
import type { AvailabilitySlot } from '../../core/models/availability.model';

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
const MONTH_FULL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function getMonday(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [],
  templateUrl: './availability.component.html',
  styleUrl: './availability.component.css',
})
export class AvailabilityComponent implements OnInit {
  private readonly svc = inject(AvailabilityService);

  readonly weekStart = signal<Date>(getMonday());
  readonly slots     = signal<AvailabilitySlot[]>([]);
  readonly loading   = signal(true);
  readonly toggling  = signal<Set<string>>(new Set());

  readonly hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  readonly weekDays = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart());
      d.setDate(d.getDate() + i);
      return d;
    }),
  );

  readonly weekLabel = computed(() => {
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const s = `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
    const e = `${end.getDate()} ${MONTH_FULL[end.getMonth()]} ${end.getFullYear()}`;
    return `${s} – ${e}`;
  });

  ngOnInit(): void { this.loadSlots(); }

  prevWeek(): void {
    this.weekStart.update(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    this.loadSlots();
  }

  nextWeek(): void {
    this.weekStart.update(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    this.loadSlots();
  }

  isToday(day: Date): boolean {
    const today = new Date();
    return day.getDate() === today.getDate()
      && day.getMonth() === today.getMonth()
      && day.getFullYear() === today.getFullYear();
  }

  getDayName(day: Date): string { return DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]; }

  slotFor(day: Date, hour: number): AvailabilitySlot | undefined {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    const prefix = this.toLocalISO(d).slice(0, 16);
    return this.slots().find(s => s.startsAt.slice(0, 16) === prefix);
  }

  isFree(day: Date, hour: number): boolean { return !!this.slotFor(day, hour); }

  isTogglingCell(day: Date, hour: number): boolean {
    return this.toggling().has(this.cellKey(day, hour));
  }

  toggleSlot(day: Date, hour: number): void {
    const key = this.cellKey(day, hour);
    if (this.toggling().has(key)) return;

    this.toggling.update(s => { const n = new Set(s); n.add(key); return n; });

    const existing = this.slotFor(day, hour);

    if (existing) {
      this.slots.update(s => s.filter(x => x.id !== existing.id));
      this.svc.deleteSlot(existing.id).subscribe({
        error: () => this.slots.update(s => [...s, existing]),
        complete: () => this.toggling.update(s => { const n = new Set(s); n.delete(key); return n; }),
      });
    } else {
      const startsAt = new Date(day); startsAt.setHours(hour, 0, 0, 0);
      const endsAt   = new Date(day); endsAt.setHours(hour + 1, 0, 0, 0);
      const temp: AvailabilitySlot = {
        id: `tmp-${startsAt.getTime()}`, userId: '',
        startsAt: this.toLocalISO(startsAt),
        endsAt:   this.toLocalISO(endsAt),
        status: 'free',
      };
      this.slots.update(s => [...s, temp]);
      this.svc.upsertSlot({ startsAt: this.toLocalISO(startsAt), endsAt: this.toLocalISO(endsAt), status: 'free' }).subscribe({
        next: (slot) => this.slots.update(s => s.map(x => x.id === temp.id ? slot : x)),
        error: () => this.slots.update(s => s.filter(x => x.id !== temp.id)),
        complete: () => this.toggling.update(s => { const n = new Set(s); n.delete(key); return n; }),
      });
    }
  }

  private loadSlots(): void {
    this.loading.set(true);
    const week = this.weekStart().toISOString().slice(0, 10);
    this.svc.getWeekSlots(week).subscribe({
      next: (data) => { this.slots.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private cellKey(day: Date, hour: number): string {
    return `${day.toDateString()}-${hour}`;
  }

  private toLocalISO(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00.000Z`;
  }
}
