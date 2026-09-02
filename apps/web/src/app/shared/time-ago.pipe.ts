import { Pipe, PipeTransform } from '@angular/core';

/** Date → « il y a 3 h », « il y a 2 jours »… (français, court). */
@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "à l'instant";
    const m = Math.round(s / 60);
    if (m < 60) return `il y a ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const j = Math.round(h / 24);
    if (j < 7) return `il y a ${j} jour${j > 1 ? 's' : ''}`;
    const sem = Math.round(j / 7);
    if (j < 30) return `il y a ${sem} sem.`;
    const mo = Math.round(j / 30);
    if (mo < 12) return `il y a ${mo} mois`;
    return `il y a ${Math.round(mo / 12)} an${Math.round(mo / 12) > 1 ? 's' : ''}`;
  }
}
