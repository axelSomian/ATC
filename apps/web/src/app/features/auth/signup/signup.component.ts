import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { CITIES_CI } from '@atc/shared';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Confirmé',
  4: 'Avancé',
  5: 'Expert',
};

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
  private readonly router = inject(Router);

  readonly cities = CITIES_CI;
  readonly levels = [1, 2, 3, 4, 5];
  readonly levelLabels = LEVEL_LABELS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    city: [''],
  });

  readonly loading = signal(false);
  readonly error = signal('');

  setLevel(level: number): void {
    this.form.patchValue({ level });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    this.authService.signup(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Erreur lors de la création du compte');
        this.loading.set(false);
      },
    });
  }
}
