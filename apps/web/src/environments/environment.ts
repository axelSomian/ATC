export const environment = {
  production: false,
  // Les appels HTTP passent par le proxy dev (proxy.conf.json) en relatif "/api/v1".
  // Socket.IO ne peut pas être proxifié : on cible directement l'API locale.
  socketUrl: 'http://localhost:3000',
  // ID client OAuth Google (public). Même valeur que GOOGLE_CLIENT_ID côté API.
  // Vide = bouton « Continuer avec Google » masqué.
  googleClientId: '71404413466-brpgo6ilptts14hl6qojgvudggm1p5up.apps.googleusercontent.com',
  // Clé publique VAPID pour les notifications push (messagerie — Lot 2).
  // Vide = pas d'abonnement push, on s'appuie sur le badge in-app + l'e-mail.
  vapidPublicKey: '',
};
