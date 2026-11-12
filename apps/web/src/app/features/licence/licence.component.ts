import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, type ValidatorFn, type AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthStore } from '../../core/stores/auth.store';
import {
  LicenceService,
  type MyLicence,
  type LicenceQuote,
  type LicenceProfile,
  type Discipline,
} from '../../core/services/licence.service';
import { LicenceCardService, type LicenceActive } from '../../core/services/licence-card.service';

type PaymentMethod = 'wave' | 'cinetpay';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Au moins une discipline cochée. */
function atLeastOneDiscipline(): ValidatorFn {
  return (group: AbstractControl) => {
    const tennis = group.get('tennis')?.value;
    const padel = group.get('padel')?.value;
    return tennis || padel ? null : { required: true };
  };
}

@Component({
  selector: 'app-licence',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './licence.component.html',
  styleUrl: './licence.component.css',
})
export class LicenceComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly licenceSvc = inject(LicenceService);
  private readonly cardSvc = inject(LicenceCardService);
  private readonly fb = inject(FormBuilder);

  readonly fullName = computed(() => this.store.user()?.name ?? '');
  readonly nowIso = new Date().toISOString();

  readonly loading  = signal(true);
  readonly licence  = signal<MyLicence | null>(null);

  readonly form = this.fb.nonNullable.group({
    profile: this.fb.nonNullable.control<LicenceProfile>('joueur', Validators.required),
    birthDate: ['', Validators.required],
    birthPlace: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    disciplines: this.fb.nonNullable.group(
      { tennis: [true], padel: [false] },
      { validators: atLeastOneDiscipline() },
    ),
  });

  readonly quote      = signal<LicenceQuote | null>(null);
  readonly quoting    = signal(false);
  readonly quoteError = signal<string | null>(null);

  readonly cniFile    = signal<File | null>(null);
  readonly cniName    = signal<string | null>(null);
  readonly photoFile  = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly fileError  = signal<string | null>(null);

  readonly method   = signal<PaymentMethod>('wave');
  readonly paying   = signal(false);
  readonly error    = signal<string | null>(null);
  readonly downloading = signal(false);

  readonly canPay = computed(() => !!this.quote() && !!this.cniFile() && !!this.photoFile());

  ngOnInit(): void {
    this.licenceSvc.getMine().subscribe({
      next: (l) => { this.licence.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.form.valueChanges.subscribe(() => this.refreshQuote());
  }

  private refreshQuote(): void {
    const { profile, birthDate } = this.form.getRawValue();
    if (!profile || !birthDate) { this.quote.set(null); return; }
    this.quoting.set(true);
    this.quoteError.set(null);
    this.licenceSvc.quote(profile, birthDate).subscribe({
      next: (q) => { this.quote.set(q); this.quoting.set(false); },
      error: (err: HttpErrorResponse) => {
        this.quote.set(null);
        this.quoting.set(false);
        this.quoteError.set(err.error?.error ?? 'Date de naissance invalide pour ce profil.');
      },
    });
  }

  onCniChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.fileError.set(null);
    if (file && file.size > MAX_FILE_BYTES) {
      this.fileError.set('Le fichier dépasse 5 Mo.');
      this.cniFile.set(null);
      this.cniName.set(null);
      return;
    }
    this.cniFile.set(file);
    this.cniName.set(file?.name ?? null);
  }

  onPhotoChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.fileError.set(null);
    if (file && file.size > MAX_FILE_BYTES) {
      this.fileError.set('Le fichier dépasse 5 Mo.');
      this.photoFile.set(null);
      this.photoPreview.set(null);
      return;
    }
    this.photoFile.set(file);
    this.photoPreview.set(file ? URL.createObjectURL(file) : null);
  }

  pay(): void {
    const cni = this.cniFile();
    const photo = this.photoFile();
    if (this.paying() || !this.canPay() || this.form.invalid || !cni || !photo) return;
    this.error.set(null);
    this.paying.set(true);

    const raw = this.form.getRawValue();
    const disciplines: Discipline[] = [
      ...(raw.disciplines.tennis ? (['tennis'] as const) : []),
      ...(raw.disciplines.padel ? (['padel'] as const) : []),
    ];

    // Démo fédération : parcours de paiement simulé (aucun prestataire réel
    // branché) — court temps de traitement pour rester crédible, le résultat
    // (licence active, catégorie calculée côté serveur, document généré)
    // est bien persisté.
    setTimeout(() => {
      this.licenceSvc
        .pay({ profile: raw.profile, birthDate: raw.birthDate, birthPlace: raw.birthPlace, disciplines, cni, photo })
        .subscribe({
          next: (l) => { this.licence.set(l); this.paying.set(false); },
          error: (err: HttpErrorResponse) => {
            this.error.set(err.error?.error ?? 'Le paiement a échoué. Réessaie.');
            this.paying.set(false);
          },
        });
    }, 900);
  }

  async download(): Promise<void> {
    const l = this.licence();
    if (!l?.active || this.downloading()) return;
    this.downloading.set(true);
    try {
      await this.cardSvc.download(l as LicenceActive, this.fullName());
    } finally {
      this.downloading.set(false);
    }
  }
}
