/* ATC — service worker minimal.
 *
 * Rôle actuel :
 *   1. socle PWA installable (couplé à manifest.webmanifest) ;
 *   2. affichage des notifications push reçues.
 *
 * Hors périmètre pour l'instant (arrive avec la messagerie — « Lot 2 ») :
 *   - l'abonnement push VAPID (registration.pushManager.subscribe) côté app ;
 *   - l'envoi des push côté API (web-push).
 *
 * Volontairement AUCUN cache ici : pas de stratégie offline tant qu'elle n'est pas
 * définie, pour éviter de servir des bundles Angular hashés périmés.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through réseau : on laisse le navigateur gérer, on n'intercepte rien.
self.addEventListener('fetch', () => {});

// ── Notifications push ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Abidjan Tennis Community', body: event.data.text() };
  }

  const title = payload.title || 'Abidjan Tennis Community';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    tag: payload.tag,                 // ex. "conversation:<id>" → regroupe les notifs
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Fenêtre déjà ouverte → on la focalise et on la navigue vers la cible.
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(target).catch(() => {});
            return client.focus();
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
      }),
  );
});
