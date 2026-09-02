import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// Service worker : socle PWA (installation sur l'écran d'accueil) + réception des
// notifications push. Enregistré en prod uniquement — évite d'interférer avec le
// rechargement à chaud du dev server.
if (environment.production && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch((err) => console.error('[SW] échec de l’enregistrement', err));
  });
}
