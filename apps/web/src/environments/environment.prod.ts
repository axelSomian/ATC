export const environment = {
  production: true,
  // Les appels HTTP restent en relatif "/api/v1" : Vercel les redirige vers l'API
  // via les "rewrites" de vercel.json (même origine => cookie refresh en first-party).
  //
  // Socket.IO NE PEUT PAS être proxifié par Vercel : il faut l'URL publique de l'API.
  socketUrl: 'https://atc-api-ws9f.onrender.com',
  // ID client OAuth Google (public). Même valeur que GOOGLE_CLIENT_ID côté API.
  // Vide = bouton « Continuer avec Google » masqué.
  googleClientId: '71404413466-brpgo6ilptts14hl6qojgvudggm1p5up.apps.googleusercontent.com',
  // Clé publique VAPID pour les notifications push (messagerie — Lot 2).
  // Vide = pas d'abonnement push, on s'appuie sur le badge in-app + l'e-mail.
  vapidPublicKey: '',
  // DSN Sentry (clé publique client, non secrète). Vide = suivi d'erreurs désactivé.
  sentryDsn: '',
};
