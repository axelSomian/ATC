/**
 * Sentry (suivi d'erreurs + alertes). Inerte si SENTRY_DSN n'est pas défini —
 * l'app tourne normalement sans compte Sentry.
 */
import * as Sentry from '@sentry/node';
import { log } from './logger.js';

const DSN = process.env.SENTRY_DSN;
export const sentryEnabled = Boolean(DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RENDER_GIT_COMMIT?.slice(0, 8),
    tracesSampleRate: 0, // pas de tracing perf pour l'instant (quota gratuit)
    sendDefaultPii: false,
  });
  log.info('sentry.enabled');
} else if (process.env.NODE_ENV === 'production') {
  log.warn('sentry.disabled', { reason: 'SENTRY_DSN manquant' });
}

/** Capture une erreur avec un contexte optionnel (route, userId, reqId…). */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext('atc', context);
    if (context?.['userId']) scope.setUser({ id: String(context['userId']) });
    Sentry.captureException(err);
  });
}

export { Sentry };
