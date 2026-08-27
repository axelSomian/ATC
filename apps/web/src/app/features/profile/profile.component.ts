import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { MembersService, type UpdateProfilePayload } from '../../core/services/members.service';
import { ReferenceService } from '../../core/services/reference.service';
import { CITIES_CI } from '@atc/shared';
import type { UserMe } from '../../core/models/user.model';
import type { LevelRef } from '../../core/models/reference.model';

const TIMES = [
  { value: 'matin', label: 'Matin (7h–12h)' },
  { value: 'midi', label: 'Midi (12h–14h)' },
  { value: 'apm', label: 'Après-midi (14h–18h)' },
  { value: 'soir', label: 'Soir (18h–21h)' },
  { value: 'weekend', label: 'Weekend' },
];

const COURTS = [
  'Club Ivoire', 'INSEP', 'Plateau', 'Cocody',
  'Marcory', 'Riviera', 'Yopougon', 'II Plateaux',
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly membersService = inject(MembersService);
  private readonly reference = inject(ReferenceService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly profile         = signal<UserMe | null>(null);
  readonly loading         = signal(true);
  readonly saving          = signal(false);
  readonly editing         = signal(false);
  readonly error           = signal('');
  readonly avatarPreview   = signal<string | null>(null);
  readonly uploadingAvatar = signal(false);

  readonly selectedCourts = signal<string[]>([]);
  readonly selectedTimes  = signal<string[]>([]);
  readonly selectedLevel  = signal(1);

  readonly dots = [1, 2, 3, 4, 5];
  readonly cities = CITIES_CI;
  readonly times  = TIMES;
  readonly courts = COURTS;
  readonly clubsByZone = this.reference.clubsByZone;
  readonly otherClub   = this.reference.otherClub;

  readonly levelLabel     = computed(() => this.reference.levelLabel(this.profile()?.level ?? 1));
  readonly editLevelLabel = computed(() => this.reference.levelLabel(this.selectedLevel()));
  readonly editLevelDef   = computed<LevelRef | undefined>(() => this.reference.levelDef(this.selectedLevel()));

  readonly form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    bio:     [''],
    age:     this.fb.control<number | null>(null),
    phone:   [''],
    city:    [''],
    clubId:  [''],
    racquet: [''],
  });

  ngOnInit(): void {
    this.membersService.getMe().subscribe({
      next: (data) => { this.profile.set(data); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger le profil.'); this.loading.set(false); },
    });
  }

  startEdit(): void {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      name: p.name, bio: p.bio ?? '', age: p.age ?? null,
      phone: p.phone ?? '', city: p.city ?? '', clubId: p.club?.id ?? '', racquet: p.racquet ?? '',
    });
    this.selectedLevel.set(p.level);
    this.selectedCourts.set([...p.preferredCourts]);
    this.selectedTimes.set([...p.preferredTimes]);
    this.editing.set(true);
    this.error.set('');
  }

  cancelEdit(): void { this.editing.set(false); this.error.set(''); this.avatarPreview.set(null); }

  triggerFileInput(): void { this.fileInput.nativeElement.click(); }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.uploadingAvatar.set(true);
    this.membersService.uploadAvatar(file).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.uploadingAvatar.set(false);
      },
      error: () => {
        this.avatarPreview.set(null);
        this.uploadingAvatar.set(false);
        this.error.set('Erreur lors du téléchargement de la photo.');
      },
    });
  }

  setLevel(v: number): void { this.selectedLevel.set(v); }

  toggleCourt(c: string): void {
    this.selectedCourts.update(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]);
  }

  toggleTime(t: string): void {
    this.selectedTimes.update(l => l.includes(t) ? l.filter(x => x !== t) : [...l, t]);
  }

  hasCourt(c: string): boolean { return this.selectedCourts().includes(c); }
  hasTime(t: string):  boolean { return this.selectedTimes().includes(t); }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const dto: UpdateProfilePayload = {
      name:    raw.name ?? undefined,
      bio:     raw.bio     || null,
      age:     raw.age     || null,
      phone:   raw.phone   || null,
      city:    raw.city    || null,
      clubId:  raw.clubId  || null,
      racquet: raw.racquet || null,
      level:   this.selectedLevel(),
      preferredCourts: this.selectedCourts(),
      preferredTimes:  this.selectedTimes(),
    };

    this.membersService.updateMe(dto).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.editing.set(false);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Erreur lors de la sauvegarde.');
        this.saving.set(false);
      },
    });
  }
}
