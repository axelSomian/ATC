import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LicenceService, type LicenceVerification } from '../../core/services/licence.service';

/**
 * Page publique (pas d'auth) ouverte en scannant le QR code d'une licence —
 * confirme l'authenticité du document sans exposer de donnée sensible
 * (CNI, photo ne sont jamais renvoyées par ce endpoint).
 */
@Component({
  selector: 'app-licence-verify',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './licence-verify.component.html',
  styleUrl: './licence-verify.component.css',
})
export class LicenceVerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly licenceSvc = inject(LicenceService);

  readonly loading = signal(true);
  readonly result = signal<LicenceVerification | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.licenceSvc.verify(code).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.error ?? 'Document introuvable ou invalide');
        this.loading.set(false);
      },
    });
  }
}
