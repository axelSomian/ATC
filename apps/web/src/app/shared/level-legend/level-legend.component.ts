import { Component, inject, signal } from '@angular/core';
import { ReferenceService } from '../../core/services/reference.service';

/** Panneau dépliable « Comprendre les niveaux » (annuaire, classement). */
@Component({
  selector: 'app-level-legend',
  standalone: true,
  templateUrl: './level-legend.component.html',
  styleUrl: './level-legend.component.css',
})
export class LevelLegendComponent {
  private readonly reference = inject(ReferenceService);

  readonly levels = this.reference.levels;
  readonly open = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }
}
