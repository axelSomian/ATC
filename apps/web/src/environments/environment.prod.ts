export const environment = {
  production: true,
  // Les appels HTTP restent en relatif "/api/v1" : Vercel les redirige vers l'API
  // via les "rewrites" de vercel.json (même origine => cookie refresh en first-party).
  //
  // Socket.IO NE PEUT PAS être proxifié par Vercel : il faut l'URL publique de l'API.
  // ⚠️ À REMPLACER après le 1er déploiement Render (ex: https://atc-api.onrender.com)
  socketUrl: 'https://REMPLACER-PAR-URL-RENDER.onrender.com',
};
