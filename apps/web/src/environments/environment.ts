export const environment = {
  production: false,
  // Les appels HTTP passent par le proxy dev (proxy.conf.json) en relatif "/api/v1".
  // Socket.IO ne peut pas être proxifié : on cible directement l'API locale.
  socketUrl: 'http://localhost:3000',
};
