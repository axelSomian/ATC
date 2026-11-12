import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import type {
  AdminMember,
  AdminTournament,
  Bracket,
  BracketMatch,
  BracketPlayer,
  TournamentGenderRule,
  TournamentPayload,
  TournamentRegistrant,
  TournamentStatus,
} from '../../../core/models/admin.model';
import type { LicenceCategory } from '../../../core/services/licence.service';

const LICENCE_CATEGORY_OPTIONS: { value: LicenceCategory; label: string }[] = [
  { value: 'adulte', label: 'Adulte' },
  { value: 'jeunes', label: 'Jeunes' },
  { value: 'decouverte_adultes', label: 'Découverte – Adultes' },
  { value: 'decouverte_jeunes', label: 'Découverte – Jeunes' },
  { value: 'ecole', label: 'Enfants – École de tennis' },
  { value: 'coach', label: 'Coach' },
];

interface EditableRegistrant extends TournamentRegistrant {
  _points: number;
  _position: number | null;
}

function emptyDraft(): TournamentPayload {
  return {
    name: '',
    description: null,
    location: null,
    startDate: '',
    endDate: '',
    registrationDeadline: null,
    genderRule: null,
    minLevel: null,
    maxLevel: null,
    maxPlayers: null,
    allowedLicenceCategories: [],
  };
}

const STATUS_LABEL: Record<TournamentStatus, string> = {
  upcoming: 'À venir',
  open: 'Inscriptions ouvertes',
  closed: 'Inscriptions closes',
  completed: 'Terminé',
};

const STATUS_DOT: Record<TournamentStatus, string> = {
  upcoming: '',
  open: 'on',
  closed: 'warn',
  completed: 'off',
};

const STATUSES: TournamentStatus[] = ['upcoming', 'open', 'closed', 'completed'];

@Component({
  selector: 'app-tournaments-panel',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  styleUrl: '../admin-shared.css',
  styles: [`
    .tp-licence-categories { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); }

    .tp-registrants { display: flex; flex-direction: column; gap: var(--space-2); }
    .tp-reg-row { display: grid; grid-template-columns: 1fr 90px 90px auto; gap: var(--space-2); align-items: center; }
    .tp-reg-row label { font-size: var(--text-sm); }
    @media (max-width: 480px) { .tp-reg-row { grid-template-columns: 1fr; } }

    .tp-add-registrant {
      display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-3); background: var(--color-cream); border-radius: var(--radius-md);
    }
    .tp-add-row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .tp-add-row input {
      flex: 1; min-width: 160px; padding: 7px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-body);
      background: var(--color-surface); color: var(--color-ink);
    }
    .tp-member-matches { display: flex; flex-direction: column; gap: 2px; }
    .tp-member-match {
      display: flex; justify-content: space-between; gap: var(--space-2);
      padding: 6px 10px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-surface); cursor: pointer; font: inherit; text-align: left;
    }
    .tp-member-match:hover:not(:disabled) { border-color: var(--color-accent); }
    .tp-member-match:disabled { opacity: 0.5; cursor: not-allowed; }

    .tp-bracket { display: flex; gap: var(--space-3); overflow-x: auto; padding-bottom: var(--space-2); }
    .tp-round { display: flex; flex-direction: column; gap: var(--space-2); min-width: 190px; flex-shrink: 0; }
    .tp-round-label { font-size: var(--text-xs); color: var(--color-muted); font-weight: 600; }
    .tp-match {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      padding: var(--space-2) var(--space-3); background: var(--color-surface);
    }
    .tp-slot { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-sm); }
    .tp-slot-pending { color: var(--color-muted); font-size: var(--text-sm); }
    .tp-vs { font-size: 10px; color: var(--color-muted); }
    .tp-winner { font-weight: 700; color: var(--color-ink); }
    .tp-match-edit { display: flex; flex-direction: column; gap: var(--space-2); }
    .tp-match-edit input {
      padding: 6px 9px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      font-size: var(--text-sm); font-family: var(--font-body); background: var(--color-surface);
    }
    .tp-match .btn { width: 100%; justify-content: center; }

    .tp-swap-row { display: flex; flex-direction: column; gap: 3px; margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px dashed var(--color-border-light); }
    .tp-swap-select {
      width: 100%; padding: 4px 6px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      font-size: 11px; font-family: var(--font-body); background: var(--color-surface); color: var(--color-ink);
    }
  `],
  template: `
    @if (!editing()) {
      <div class="panel">
        <!-- ═══ LISTE ═══ -->
        <div class="admin-toolbar">
          <button class="btn btn-primary btn-sm" (click)="newTournament()">Nouveau tournoi</button>
          <span class="spacer"></span>
        </div>
        <div class="admin-filters">
          <button class="admin-chip" [class.active]="statusFilter() === null" (click)="statusFilter.set(null)">Tous</button>
          @for (s of statuses; track s) {
            <button class="admin-chip" [class.active]="statusFilter() === s" (click)="statusFilter.set(s)">{{ statusLabel(s) }}</button>
          }
        </div>

        @if (loading()) {
          <p class="panel-loading">Chargement…</p>
        } @else if (visible().length === 0) {
          <p class="panel-empty">Aucun tournoi{{ statusFilter() ? ' pour ce filtre' : '' }}.</p>
        } @else {
          <div class="admin-table">
            @for (t of visible(); track t.id) {
              <button class="admin-table-row" (click)="edit(t)">
                <div class="admin-row-main">
                  <div class="admin-row-title">{{ t.name }}</div>
                  <div class="admin-row-meta">
                    <span class="status-text"><span class="status-dot" [class]="statusDot(t.status)"></span>{{ statusLabel(t.status) }}</span>
                    @if (rulesLabel(t)) { <span>{{ rulesLabel(t) }}</span> }
                    <span>{{ t.startDate | slice:0:10 }} → {{ t.endDate | slice:0:10 }}</span>
                    @if (t.location) { <span>{{ t.location }}</span> }
                  </div>
                </div>
                <span class="admin-row-side">{{ t._count.registrations }}@if (t.maxPlayers) { / {{ t.maxPlayers }} } inscrit{{ t._count.registrations === 1 ? '' : 's' }}</span>
                <span class="admin-row-chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <!-- ═══ FICHE TOURNOI (page complète — le tableau a besoin de place) ═══ -->
      <div class="admin-editor">
        <div class="admin-editor-head">
          <button class="admin-back" (click)="cancel()">← Tournois</button>
        </div>
        <h2>{{ editingId() ? (draft.name || 'Tournoi') : 'Nouveau tournoi' }}</h2>

        <div class="admin-section">
              <strong>Informations</strong>
              <div class="field-row">
                <label>Nom</label>
                <input type="text" [(ngModel)]="draft.name" placeholder="Open fédéral de Cocody" />
                <label>Lieu</label>
                <input type="text" [(ngModel)]="draft.location" placeholder="Golf Club, Abidjan" />
                <label>Début</label>
                <input type="date" [(ngModel)]="draft.startDate" />
                <label>Fin</label>
                <input type="date" [(ngModel)]="draft.endDate" />
                <label>Date limite d'inscription</label>
                <input type="date" [(ngModel)]="draft.registrationDeadline" />
                <label>Nombre max de joueurs</label>
                <input type="number" min="2" max="256" [(ngModel)]="draft.maxPlayers" placeholder="Illimité" />
                @if (editingId()) {
                  <label>Statut</label>
                  <select [(ngModel)]="draft.status">
                    @for (s of statuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
                  </select>
                }
              </div>
              <label class="field-block-label">Description</label>
              <textarea rows="2" [(ngModel)]="draft.description" placeholder="Format, catégories, dotation…"></textarea>
            </div>

            <div class="admin-section">
              <strong>Règles d'éligibilité (optionnel)</strong>
              <div class="field-row">
                <label>Genre</label>
                <select [(ngModel)]="draft.genderRule">
                  <option [ngValue]="null">Mixte</option>
                  <option value="femme">Femmes uniquement</option>
                  <option value="homme">Hommes uniquement</option>
                </select>
                <label>Niveau min</label>
                <select [(ngModel)]="draft.minLevel">
                  <option [ngValue]="null">—</option>
                  @for (l of levels; track l) { <option [ngValue]="l">{{ l }}</option> }
                </select>
                <label>Niveau max</label>
                <select [(ngModel)]="draft.maxLevel">
                  <option [ngValue]="null">—</option>
                  @for (l of levels; track l) { <option [ngValue]="l">{{ l }}</option> }
                </select>
              </div>
              <div class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" (click)="applyPreset('feminin')">Préremplir « Féminin »</button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="applyPreset('debutant')">Préremplir « Débutants »</button>
              </div>

              <label class="field-block-label">Licence requise (aucune case cochée = pas de restriction)</label>
              <div class="tp-licence-categories">
                @for (opt of licenceCategoryOptions; track opt.value) {
                  <label class="admin-chip" [class.active]="isLicenceCategorySelected(opt.value)">
                    <input
                      type="checkbox"
                      style="display:none"
                      [checked]="isLicenceCategorySelected(opt.value)"
                      (change)="toggleLicenceCategory(opt.value)"
                    />
                    {{ opt.label }}
                  </label>
                }
              </div>
            </div>

            @if (editingId()) {
              <div class="admin-section">
                <div class="admin-card-head">
                  <strong>Inscrits</strong>
                  <span class="text-muted" style="font-size:var(--text-sm)">
                    {{ registrants().length }}@if (draft.maxPlayers) { / {{ draft.maxPlayers }} } inscrit{{ registrants().length === 1 ? '' : 's' }}
                  </span>
                </div>

                <div class="tp-add-registrant">
                  <div class="tp-add-row">
                    <input type="text" [(ngModel)]="guestName" placeholder="Nom du joueur (sans compte)" maxlength="80" />
                    <button class="btn btn-outline btn-sm" [disabled]="registrantBusy() || !guestName.trim()" (click)="addGuest()">
                      Ajouter sans compte
                    </button>
                  </div>
                  <div class="tp-add-row">
                    <input type="text" [ngModel]="memberQuery()" (ngModelChange)="memberQuery.set($event)" placeholder="Inscrire un membre existant…" />
                  </div>
                  @if (memberMatches().length > 0) {
                    <div class="tp-member-matches">
                      @for (m of memberMatches(); track m.id) {
                        <button class="tp-member-match" [disabled]="registrantBusy()" (click)="addExistingMember(m)">
                          <span>{{ m.name }}</span>
                          <span class="text-muted" style="font-size:var(--text-xs)">{{ m.email }}</span>
                        </button>
                      }
                    </div>
                  }
                  @if (registrantMsg()) { <p class="form-msg" [class.err]="!registrantOk()" [class.ok]="registrantOk()">{{ registrantMsg() }}</p> }
                </div>

                @if (registrantsLoading()) {
                  <p class="panel-loading">Chargement des inscrits…</p>
                } @else if (registrants().length === 0) {
                  <p class="panel-empty">Aucun inscrit pour l'instant.</p>
                } @else {
                  <div class="tp-registrants">
                    @for (r of registrants(); track r.user.id) {
                      <div class="tp-reg-row">
                        <label>
                          {{ r.user.name }}
                          @if (r.user.isGuest) { <span class="admin-badge" style="margin-left:4px">Sans compte</span> }
                        </label>
                        <input type="number" min="0" [(ngModel)]="r._points" placeholder="Points" />
                        <input type="number" min="1" [(ngModel)]="r._position" placeholder="Place" />
                        <button class="btn btn-ghost btn-sm" [disabled]="registrantBusy()" (click)="removeRegistrant(r)">Retirer</button>
                      </div>
                    }
                  </div>
                  @if (resultsMsg()) { <p class="form-msg" [class.err]="!resultsOk()" [class.ok]="resultsOk()">{{ resultsMsg() }}</p> }
                  <div class="row-actions">
                    <button class="btn btn-primary btn-sm" [disabled]="savingResults()" (click)="saveResults()">
                      {{ savingResults() ? 'Enregistrement…' : 'Enregistrer les résultats (clôture)' }}
                    </button>
                  </div>
                }
              </div>
            }

            @if (editingId()) {
              <div class="admin-section">
                <div class="admin-card-head">
                  <strong>Tableau</strong>
                  @if (bracket()?.generated) {
                    <div class="row-actions">
                      <span class="status-text">
                        <span class="status-dot" [class.on]="bracketPublished()"></span>
                        {{ bracketPublished() ? 'Publié — visible des joueurs' : 'Brouillon — non visible des joueurs' }}
                      </span>
                      <button class="btn btn-outline btn-sm" [disabled]="bracketBusy()" (click)="togglePublish()">
                        {{ bracketPublished() ? 'Dépublier' : 'Publier le tableau' }}
                      </button>
                      <button class="btn btn-ghost btn-sm" [disabled]="bracketBusy()" (click)="regenerateBracket()">Relancer le tirage</button>
                    </div>
                  }
                </div>

                @if (bracketLoading()) {
                  <p class="panel-loading">Chargement du tableau…</p>
                } @else if (!bracket()?.generated) {
                  <p class="panel-hint">
                    Tire au hasard qui affronte qui parmi les inscrits, et fait avancer automatiquement
                    les vainqueurs au tour suivant.
                    @if (registrants().length < 2) { Il faut au moins 2 inscrits pour tirer un tableau. }
                  </p>
                  @if (bracketMsg()) { <p class="form-msg" [class.err]="!bracketOk()" [class.ok]="bracketOk()">{{ bracketMsg() }}</p> }
                  <div class="row-actions">
                    <button class="btn btn-primary btn-sm" [disabled]="bracketBusy() || registrants().length < 2" (click)="doGenerateBracket()">
                      {{ bracketBusy() ? 'Tirage…' : 'Générer le tableau (tirage au sort)' }}
                    </button>
                  </div>
                } @else {
                  @if (bracket()!.champion) {
                    <p class="form-msg ok">🏆 Vainqueur du tournoi : {{ bracket()!.champion!.name }}</p>
                  }
                  @if (bracketMsg()) { <p class="form-msg" [class.err]="!bracketOk()" [class.ok]="bracketOk()">{{ bracketMsg() }}</p> }

                  <div class="tp-bracket">
                    @for (round of bracket()!.rounds; track round.round) {
                      <div class="tp-round">
                        <div class="tp-round-label">{{ round.label }}</div>
                        @for (m of round.matches; track m.id) {
                          <div class="tp-match">
                            @if (matchEditing() === m.id) {
                              <div class="tp-match-edit">
                                <input type="text" [(ngModel)]="scoreDraft" placeholder="Score (ex : 6-4 6-3)" maxlength="40" />
                                <button class="btn btn-outline btn-sm" [disabled]="matchBusy()" (click)="pickWinner(m, m.playerA!.id)">Victoire {{ m.playerA!.name }}</button>
                                <button class="btn btn-outline btn-sm" [disabled]="matchBusy()" (click)="pickWinner(m, m.playerB!.id)">Victoire {{ m.playerB!.name }}</button>
                                <button class="btn btn-ghost btn-sm" [disabled]="matchBusy()" (click)="matchEditing.set(null)">Annuler</button>
                              </div>
                            } @else if (!m.playerA && !m.playerB) {
                              <div class="tp-slot-pending">À déterminer</div>
                            } @else if (!m.playerA || !m.playerB) {
                              <div class="tp-slot">
                                <span class="tp-winner">{{ (m.playerA ?? m.playerB)!.name }}</span>
                                <span class="text-muted" style="font-size:var(--text-xs)">qualifié d'office</span>
                              </div>
                            } @else if (m.winner) {
                              <div class="tp-slot">
                                <span [class.tp-winner]="m.winner.id === m.playerA.id">{{ m.playerA.name }}</span>
                                <span class="tp-vs">vs</span>
                                <span [class.tp-winner]="m.winner.id === m.playerB.id">{{ m.playerB.name }}</span>
                                @if (m.scoreText) { <span class="text-muted" style="font-size:var(--text-xs)">{{ m.scoreText }}</span> }
                                <button class="btn btn-ghost btn-sm" (click)="startEditMatch(m)">Modifier</button>
                              </div>
                            } @else {
                              <div class="tp-slot">
                                <span>{{ m.playerA.name }}</span>
                                <span class="tp-vs">vs</span>
                                <span>{{ m.playerB.name }}</span>
                                <button class="btn btn-outline btn-sm" (click)="startEditMatch(m)">Saisir le résultat</button>
                              </div>
                              @if (round.round === 1) {
                                <div class="tp-swap-row">
                                  <span class="text-muted" style="font-size:var(--text-xs)">Échanger :</span>
                                  <select class="tp-swap-select" [ngModel]="m.playerA.id" (ngModelChange)="swapPlayer(m.playerA.id, $event)">
                                    @for (p of round1Players(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                                  </select>
                                  <select class="tp-swap-select" [ngModel]="m.playerB.id" (ngModelChange)="swapPlayer(m.playerB.id, $event)">
                                    @for (p of round1Players(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                                  </select>
                                </div>
                              }
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

        @if (msg()) { <p class="form-msg" [class.err]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }

        <div class="admin-editor-actions">
          <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          <span class="spacer"></span>
          @if (editingId()) {
            <button class="btn btn-ghost btn-sm" style="color:var(--color-error)" [disabled]="busy()" (click)="remove()">Supprimer</button>
          }
        </div>
      </div>
    }
  `,
})
export class TournamentsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly levels = [1, 2, 3, 4, 5];
  readonly statuses = STATUSES;
  readonly licenceCategoryOptions = LICENCE_CATEGORY_OPTIONS;

  readonly tournaments = signal<AdminTournament[]>([]);
  readonly loading     = signal(true);
  readonly statusFilter = signal<TournamentStatus | null>(null);

  readonly visible = computed(() => {
    const f = this.statusFilter();
    return f ? this.tournaments().filter((t) => t.status === f) : this.tournaments();
  });

  readonly editing   = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly busy      = signal(false);
  readonly msg        = signal('');
  readonly ok         = signal(false);

  draft: TournamentPayload = emptyDraft();

  readonly registrants        = signal<EditableRegistrant[]>([]);
  readonly registrantsLoading = signal(false);
  readonly savingResults      = signal(false);
  readonly resultsMsg         = signal<string | null>(null);
  readonly resultsOk          = signal(false);

  readonly bracket          = signal<Bracket | null>(null);
  readonly bracketLoading   = signal(false);
  readonly bracketBusy      = signal(false);
  readonly bracketMsg       = signal('');
  readonly bracketOk        = signal(false);
  readonly bracketPublished = signal(false);
  readonly matchEditing     = signal<string | null>(null);
  readonly matchBusy        = signal(false);
  scoreDraft = '';

  readonly round1Players = computed<BracketPlayer[]>(() => {
    const b = this.bracket();
    const round1 = b?.rounds.find((r) => r.round === 1);
    if (!round1) return [];
    const seen = new Map<string, BracketPlayer>();
    for (const m of round1.matches) {
      if (m.playerA) seen.set(m.playerA.id, m.playerA);
      if (m.playerB) seen.set(m.playerB.id, m.playerB);
    }
    return [...seen.values()].sort((a, b2) => a.name.localeCompare(b2.name));
  });

  readonly allMembers      = signal<AdminMember[]>([]);
  readonly registrantBusy  = signal(false);
  readonly registrantMsg   = signal('');
  readonly registrantOk    = signal(false);
  guestName = '';
  readonly memberQuery = signal('');

  readonly memberMatches = computed(() => {
    const q = this.memberQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    const registeredIds = new Set(this.registrants().map((r) => r.user.id));
    return this.allMembers()
      .filter((m) => !registeredIds.has(m.id) && m.name.toLowerCase().includes(q))
      .slice(0, 6);
  });

  ngOnInit(): void {
    this.load();
    this.admin.listMembers().subscribe({ next: (list) => this.allMembers.set(list) });
  }

  private load(): void {
    this.loading.set(true);
    this.admin.listTournaments().subscribe({
      next: (list) => { this.tournaments.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: TournamentStatus): string {
    return STATUS_LABEL[s];
  }

  statusDot(s: TournamentStatus): string {
    return STATUS_DOT[s];
  }

  rulesLabel(t: AdminTournament): string | null {
    const parts: string[] = [];
    if (t.genderRule) parts.push(t.genderRule === 'femme' ? 'Féminin' : 'Masculin');
    if (t.minLevel != null && t.maxLevel != null) parts.push(`Niveau ${t.minLevel}-${t.maxLevel}`);
    else if (t.minLevel != null) parts.push(`Niveau ${t.minLevel}+`);
    else if (t.maxLevel != null) parts.push(`Niveau ${t.maxLevel} max`);
    if (t.allowedLicenceCategories.length) {
      const labels = t.allowedLicenceCategories.map((c) => LICENCE_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? c);
      parts.push(`Licence ${labels.join('/')}`);
    }
    return parts.length ? parts.join(' · ') : null;
  }

  applyPreset(preset: 'feminin' | 'debutant'): void {
    if (preset === 'feminin') this.draft.genderRule = 'femme';
    if (preset === 'debutant') { this.draft.minLevel = null; this.draft.maxLevel = 2; }
  }

  isLicenceCategorySelected(category: LicenceCategory): boolean {
    return (this.draft.allowedLicenceCategories ?? []).includes(category);
  }

  toggleLicenceCategory(category: LicenceCategory): void {
    const current = this.draft.allowedLicenceCategories ?? [];
    this.draft.allowedLicenceCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
  }

  newTournament(): void {
    this.draft = emptyDraft();
    this.editingId.set(null);
    this.msg.set('');
    this.registrants.set([]);
    this.bracket.set(null);
    this.bracketPublished.set(false);
    this.matchEditing.set(null);
    this.guestName = '';
    this.memberQuery.set('');
    this.registrantMsg.set('');
    this.editing.set(true);
  }

  edit(t: AdminTournament): void {
    this.draft = {
      name: t.name,
      description: t.description,
      location: t.location,
      startDate: (t.startDate ?? '').slice(0, 10),
      endDate: (t.endDate ?? '').slice(0, 10),
      registrationDeadline: t.registrationDeadline ? t.registrationDeadline.slice(0, 10) : null,
      status: t.status,
      genderRule: t.genderRule,
      minLevel: t.minLevel,
      maxLevel: t.maxLevel,
      maxPlayers: t.maxPlayers,
      allowedLicenceCategories: [...t.allowedLicenceCategories],
    };
    this.editingId.set(t.id);
    this.msg.set('');
    this.resultsMsg.set(null);
    this.bracketMsg.set('');
    this.bracketPublished.set(t.bracketPublished);
    this.matchEditing.set(null);
    this.guestName = '';
    this.memberQuery.set('');
    this.registrantMsg.set('');
    this.editing.set(true);
    this.loadRegistrants(t.id);
    this.loadBracket(t.id);
  }

  cancel(): void {
    this.editing.set(false);
  }

  save(): void {
    if (!this.draft.name?.trim() || !this.draft.startDate || !this.draft.endDate) {
      this.fail("Nom, date de début et de fin sont obligatoires.");
      return;
    }
    this.busy.set(true);
    this.msg.set('');
    const payload: TournamentPayload = {
      ...this.draft,
      name: this.draft.name.trim(),
      description: this.draft.description?.trim() || null,
      location: this.draft.location?.trim() || null,
      registrationDeadline: this.draft.registrationDeadline || null,
    };
    const id = this.editingId();
    const req = id ? this.admin.updateTournament(id, payload) : this.admin.createTournament(payload);
    req.subscribe({
      next: (t) => {
        this.busy.set(false);
        this.ok.set(true);
        this.msg.set('Enregistré ✓');
        this.editingId.set(t.id);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Erreur lors de l\'enregistrement.'),
    });
  }

  remove(): void {
    const id = this.editingId();
    const t = this.tournaments().find((x) => x.id === id);
    if (!id || !confirm(`Supprimer « ${t?.name ?? 'ce tournoi'} » ?`)) return;
    this.busy.set(true);
    this.admin.deleteTournament(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.fail(err.error?.error ?? 'Suppression impossible.'),
    });
  }

  private loadRegistrants(id: string): void {
    this.registrantsLoading.set(true);
    this.admin.getTournamentRegistrations(id).subscribe({
      next: (view) => {
        this.applyRegistrations(view);
        this.registrantsLoading.set(false);
      },
      error: () => this.registrantsLoading.set(false),
    });
  }

  saveResults(): void {
    const id = this.editingId();
    if (!id) return;
    this.savingResults.set(true);
    this.resultsMsg.set(null);
    const results = this.registrants().map((r) => ({
      userId: r.user.id,
      points: r._points,
      position: r._position,
    }));
    this.admin.setTournamentResults(id, results).subscribe({
      next: () => {
        this.savingResults.set(false);
        this.resultsOk.set(true);
        this.resultsMsg.set('Résultats enregistrés — tournoi clôturé ✓');
        this.load();
        this.loadRegistrants(id);
      },
      error: (err: HttpErrorResponse) => {
        this.savingResults.set(false);
        this.resultsOk.set(false);
        this.resultsMsg.set(err.error?.error ?? 'Erreur.');
      },
    });
  }

  addGuest(): void {
    const id = this.editingId();
    const name = this.guestName.trim();
    if (!id || !name) return;
    this.registrantBusy.set(true);
    this.registrantMsg.set('');
    this.admin.addTournamentRegistrant(id, { name }).subscribe({
      next: (view) => {
        this.applyRegistrations(view);
        this.registrantBusy.set(false);
        this.registrantOk.set(true);
        this.registrantMsg.set(`${name} ajouté ✓`);
        this.guestName = '';
      },
      error: (err: HttpErrorResponse) => this.registrantFail(err.error?.error ?? "Impossible d'ajouter ce joueur."),
    });
  }

  addExistingMember(m: AdminMember): void {
    const id = this.editingId();
    if (!id) return;
    this.registrantBusy.set(true);
    this.registrantMsg.set('');
    this.admin.addTournamentRegistrant(id, { userId: m.id }).subscribe({
      next: (view) => {
        this.applyRegistrations(view);
        this.registrantBusy.set(false);
        this.registrantOk.set(true);
        this.registrantMsg.set(`${m.name} inscrit ✓`);
        this.memberQuery.set('');
      },
      error: (err: HttpErrorResponse) => this.registrantFail(err.error?.error ?? "Impossible d'inscrire ce membre."),
    });
  }

  removeRegistrant(r: EditableRegistrant): void {
    const id = this.editingId();
    if (!id || !confirm(`Retirer « ${r.user.name} » du tournoi ?`)) return;
    this.registrantBusy.set(true);
    this.registrantMsg.set('');
    this.admin.removeTournamentRegistrant(id, r.user.id).subscribe({
      next: (view) => {
        this.applyRegistrations(view);
        this.registrantBusy.set(false);
        this.registrantOk.set(true);
        this.registrantMsg.set('Retiré ✓');
      },
      error: (err: HttpErrorResponse) => this.registrantFail(err.error?.error ?? 'Retrait impossible.'),
    });
  }

  private applyRegistrations(view: { registrations: TournamentRegistrant[] }): void {
    this.registrants.set(
      view.registrations.map((r) => ({
        ...r,
        _points: r.result?.points ?? 0,
        _position: r.result?.position ?? null,
      })),
    );
  }

  private registrantFail(m: string): void {
    this.registrantBusy.set(false);
    this.registrantOk.set(false);
    this.registrantMsg.set(m);
  }

  private loadBracket(id: string): void {
    this.bracketLoading.set(true);
    this.admin.getBracket(id).subscribe({
      next: (b) => { this.bracket.set(b); this.bracketLoading.set(false); },
      error: () => this.bracketLoading.set(false),
    });
  }

  doGenerateBracket(): void {
    const id = this.editingId();
    if (!id) return;
    this.bracketBusy.set(true);
    this.bracketMsg.set('');
    this.admin.generateBracket(id).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.bracketBusy.set(false);
        this.bracketOk.set(true);
        this.bracketMsg.set('Tableau tiré au sort ✓');
      },
      error: (err: HttpErrorResponse) => {
        this.bracketBusy.set(false);
        this.bracketOk.set(false);
        this.bracketMsg.set(err.error?.error ?? 'Erreur lors du tirage.');
      },
    });
  }

  regenerateBracket(): void {
    const id = this.editingId();
    if (!id || !confirm('Refaire le tirage ? Les scores déjà saisis seront perdus.')) return;
    this.bracketBusy.set(true);
    this.bracketMsg.set('');
    this.admin.generateBracket(id, true).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.bracketPublished.set(false);
        this.bracketBusy.set(false);
        this.bracketOk.set(true);
        this.bracketMsg.set('Tableau retiré au sort ✓');
      },
      error: (err: HttpErrorResponse) => {
        this.bracketBusy.set(false);
        this.bracketOk.set(false);
        this.bracketMsg.set(err.error?.error ?? 'Erreur lors du tirage.');
      },
    });
  }

  startEditMatch(m: BracketMatch): void {
    this.scoreDraft = m.scoreText ?? '';
    this.matchEditing.set(m.id);
  }

  pickWinner(m: BracketMatch, winnerId: string): void {
    const id = this.editingId();
    if (!id) return;
    this.matchBusy.set(true);
    this.admin.setMatchResult(id, m.id, { winnerId, scoreText: this.scoreDraft.trim() || null }).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.matchBusy.set(false);
        this.matchEditing.set(null);
        this.bracketOk.set(true);
        this.bracketMsg.set('Résultat enregistré ✓');
      },
      error: (err: HttpErrorResponse) => {
        this.matchBusy.set(false);
        this.bracketOk.set(false);
        this.bracketMsg.set(err.error?.error ?? 'Erreur lors de la saisie.');
      },
    });
  }

  swapPlayer(currentId: string, newId: string): void {
    const id = this.editingId();
    if (!id || !newId || newId === currentId) return;
    this.bracketBusy.set(true);
    this.bracketMsg.set('');
    this.admin.swapBracketPlayers(id, { userIdA: currentId, userIdB: newId }).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.bracketBusy.set(false);
        this.bracketOk.set(true);
        this.bracketMsg.set('Joueurs échangés ✓');
      },
      error: (err: HttpErrorResponse) => {
        this.bracketBusy.set(false);
        this.bracketOk.set(false);
        this.bracketMsg.set(err.error?.error ?? "Erreur lors de l'échange.");
      },
    });
  }

  togglePublish(): void {
    const id = this.editingId();
    if (!id) return;
    const next = !this.bracketPublished();
    this.bracketBusy.set(true);
    this.bracketMsg.set('');
    this.admin.setBracketPublished(id, next).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.bracketPublished.set(next);
        this.bracketBusy.set(false);
        this.bracketOk.set(true);
        this.bracketMsg.set(next ? 'Tableau publié ✓ — visible des joueurs.' : 'Tableau dépublié.');
      },
      error: (err: HttpErrorResponse) => {
        this.bracketBusy.set(false);
        this.bracketOk.set(false);
        this.bracketMsg.set(err.error?.error ?? 'Erreur.');
      },
    });
  }

  private fail(m: string): void {
    this.busy.set(false);
    this.ok.set(false);
    this.msg.set(m);
  }
}
