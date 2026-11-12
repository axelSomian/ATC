import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../core/services/admin.service';
import type { AdminOverview } from '../../../core/models/admin.model';

const DAY_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const STATUS_COLOR: Record<string, string> = {
  upcoming: 'neutral',
  open: 'positive',
  closed: 'warning',
  completed: 'muted',
};

/**
 * Vue d'ensemble : tableau de bord chiffré de la fédération, façon
 * tableau de score (gros chiffres tabulaires) + quelques graphiques
 * de répartition/activité construits en CSS pur (pas de dépendance
 * de charting pour ce volume de données).
 */
@Component({
  selector: 'app-overview-panel',
  standalone: true,
  imports: [],
  styleUrl: '../admin-shared.css',
  styles: [`
    .charts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
    @media (max-width: 860px) { .charts-grid { grid-template-columns: 1fr; } }

    .chart-card {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);
      padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
      background: var(--color-surface);
    }
    .chart-head { display: flex; flex-direction: column; gap: 1px; }
    .chart-head strong { font-size: var(--text-sm); }
    .chart-head span { font-size: var(--text-xs); color: var(--color-muted); }

    /* ── Activité (barres verticales) ── */
    .vbar-bars { display: flex; align-items: flex-end; gap: 3px; height: 92px; }
    .vbar-col { flex: 1; height: 100%; display: flex; align-items: flex-end; min-width: 0; }
    .vbar {
      width: 100%; max-width: 22px; margin: 0 auto; min-height: 2px;
      background: var(--color-ink); border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
    }
    .vbar-labels { display: flex; gap: 3px; }
    .vbar-label-col {
      flex: 1; text-align: center; font-size: 9px; color: var(--color-muted);
      font-variant-numeric: tabular-nums; min-width: 0;
    }

    /* ── Répartitions (barres horizontales) ── */
    .hbar-chart { display: flex; flex-direction: column; gap: 8px; }
    .hbar-row { display: grid; grid-template-columns: 96px 1fr 26px; align-items: center; gap: var(--space-2); }
    .hbar-label {
      font-size: var(--text-xs); color: var(--color-ink-light);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .hbar-track { height: 9px; background: var(--color-cream); border-radius: var(--radius-full); overflow: hidden; }
    .hbar-fill { height: 100%; border-radius: var(--radius-full); min-width: 3px; background: var(--color-ink); transition: width 0.3s ease; }
    .hbar-fill.positive { background: var(--color-positive); }
    .hbar-fill.warning   { background: var(--color-warning); }
    .hbar-fill.muted     { background: var(--color-ink-light); }
    .hbar-fill.neutral   { background: var(--color-muted); }
    .hbar-count { font-size: var(--text-xs); color: var(--color-muted); text-align: right; font-variant-numeric: tabular-nums; }
  `],
  template: `
    <div class="panel">
      @if (data(); as d) {
        <div class="kpi-board">
          <div class="kpi">
            <span class="kpi-label">Membres</span>
            <span class="kpi-value">{{ d.membersCount }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Licences actives</span>
            <span class="kpi-value">{{ d.licencesActive }}</span>
            <span class="kpi-hint">{{ formatFcfa(d.licencesRevenue) }} collectés</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Tournois</span>
            <span class="kpi-value">{{ d.tournamentsTotal }}</span>
            <span class="kpi-hint">{{ d.tournamentsOpen }} ouvert{{ d.tournamentsOpen > 1 ? 's' : '' }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Inscriptions tournois</span>
            <span class="kpi-value">{{ d.tournamentRegistrationsTotal }}</span>
          </div>
        </div>

        <div class="kpi-board secondary">
          <div class="kpi">
            <span class="kpi-label">Clubs actifs</span>
            <span class="kpi-value">{{ d.clubsCount }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Matchs confirmés</span>
            <span class="kpi-value">{{ d.matchesConfirmed }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Abonnés push</span>
            <span class="kpi-value">{{ d.pushSubscriptions }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Actualités publiées</span>
            <span class="kpi-value">{{ d.newsPublished }}</span>
          </div>
        </div>

        <!-- ═══ Activité : matchs confirmés, 14 derniers jours ═══ -->
        <div class="chart-card">
          <div class="chart-head">
            <strong>Activité</strong>
            <span>Matchs confirmés — 14 derniers jours</span>
          </div>
          @if (totalOf(d.matchesPerDay) === 0) {
            <p class="panel-empty">Aucun match confirmé sur cette période.</p>
          } @else {
            <div class="vbar-bars">
              @for (p of d.matchesPerDay; track p.date) {
                <div class="vbar-col" [title]="dayLong(p.date) + ' — ' + p.count + ' match' + (p.count === 1 ? '' : 's')">
                  <div class="vbar" [style.height.%]="pct(p.count, maxOf(d.matchesPerDay))"></div>
                </div>
              }
            </div>
            <div class="vbar-labels">
              @for (p of d.matchesPerDay; track p.date) {
                <span class="vbar-label-col">{{ dayShort(p.date) }}</span>
              }
            </div>
          }
        </div>

        <div class="charts-grid">
          <!-- ── Répartition des niveaux ── -->
          <div class="chart-card">
            <div class="chart-head">
              <strong>Répartition des niveaux</strong>
              <span>Membres par niveau (1 à 5)</span>
            </div>
            <div class="hbar-chart">
              @for (l of d.levelDistribution; track l.level) {
                <div class="hbar-row" [title]="'Niveau ' + l.level + ' — ' + l.count">
                  <span class="hbar-label">Niveau {{ l.level }}</span>
                  <div class="hbar-track"><div class="hbar-fill" [style.width.%]="pct(l.count, maxOf(d.levelDistribution))"></div></div>
                  <span class="hbar-count">{{ l.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- ── Tournois par statut ── -->
          <div class="chart-card">
            <div class="chart-head">
              <strong>Tournois</strong>
              <span>Répartition par statut</span>
            </div>
            <div class="hbar-chart">
              @for (s of d.tournamentsByStatus; track s.status) {
                <div class="hbar-row" [title]="s.label + ' — ' + s.count">
                  <span class="hbar-label">{{ s.label }}</span>
                  <div class="hbar-track"><div class="hbar-fill" [class]="statusColor(s.status)" [style.width.%]="pct(s.count, maxOf(d.tournamentsByStatus))"></div></div>
                  <span class="hbar-count">{{ s.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- ── Licences par catégorie ── -->
          <div class="chart-card">
            <div class="chart-head">
              <strong>Licences</strong>
              <span>Par catégorie FIT</span>
            </div>
            @if (d.licencesByCategory.length === 0) {
              <p class="panel-empty">Aucune licence payée pour l'instant.</p>
            } @else {
              <div class="hbar-chart">
                @for (c of d.licencesByCategory; track c.category) {
                  <div class="hbar-row" [title]="c.label + ' — ' + c.count">
                    <span class="hbar-label">{{ c.label }}</span>
                    <div class="hbar-track"><div class="hbar-fill" [style.width.%]="pct(c.count, maxOf(d.licencesByCategory))"></div></div>
                    <span class="hbar-count">{{ c.count }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (loading()) {
        <p class="panel-loading">Chargement…</p>
      }
    </div>
  `,
})
export class OverviewPanelComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly data = signal<AdminOverview | null>(null);

  constructor() {
    this.adminService.getOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  formatFcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  }

  maxOf(rows: { count: number }[]): number {
    return Math.max(1, ...rows.map((r) => r.count));
  }

  totalOf(rows: { count: number }[]): number {
    return rows.reduce((sum, r) => sum + r.count, 0);
  }

  pct(count: number, max: number): number {
    return max > 0 ? Math.round((count / max) * 100) : 0;
  }

  statusColor(status: string): string {
    return STATUS_COLOR[status] ?? '';
  }

  dayShort(iso: string): string {
    return DAY_SHORT.format(new Date(`${iso}T00:00:00`));
  }

  dayLong(iso: string): string {
    return DAY_LONG.format(new Date(`${iso}T00:00:00`));
  }
}
