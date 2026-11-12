import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  constructor() {
    const router = inject(Router);
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        take(1),
      )
      .subscribe(() => {
        const splash = document.getElementById('boot-splash');
        if (!splash) return;
        splash.classList.add('is-hidden');
        setTimeout(() => splash.remove(), 400);
      });
  }
}
