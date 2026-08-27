import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { CITIES_CI } from '@atc/shared';
import type { LevelRef } from '../../../core/models/reference.model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly reference = inject(ReferenceService);
  private readonly router = inject(Router);

  readonly cities = CITIES_CI;
  readonly levels = [1, 2, 3, 4, 5];
  readonly clubsByZone = this.reference.clubsByZone;
  readonly otherClub = this.reference.otherClub;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    city: [''],
    clubId: [''],
  });

  readonly loading = signal(false);
  readonly error = signal('');

  levelName(level: number): string {
    return this.reference.levelLabel(level);
  }

  levelDef(level: number): LevelRef | undefined {
    return this.reference.levelDef(level);
  }

  setLevel(level: number): void {
    this.form.patchValue({ level });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    const raw = this.form.getRawValue();
    this.authService
      .signup({
        name: raw.name,
        email: raw.email,
        password: raw.password,
        level: raw.level,
        city: raw.city || undefined,
        clubId: raw.clubId || undefined,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.error ?? 'Erreur lors de la création du compte');
          this.loading.set(false);
        },
      });
  }
}
