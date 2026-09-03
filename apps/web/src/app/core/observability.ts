import { ErrorHandler, Provider } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environment';

let enabled = false;

/** À appeler une fois avant le bootstrap. Inerte si `sentryDsn` est vide. */
export function initObservability(): void {
  if (!environment.sentryDsn) return;
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
  enabled = true;
}

/** Fournit le ErrorHandler Sentry seulement s'il est configuré. */
export function observabilityProviders(): Provider[] {
  if (!environment.sentryDsn) return [];
  return [{ provide: ErrorHandler, useValue: Sentry.createErrorHandler() }];
}

/** Trace une requête HTTP échouée (utilisé par l'intercepteur). */
export function reportHttpError(info: { status: number; url: string; method: string }): void {
  if (!enabled) return;
  Sentry.addBreadcrumb({ category: 'http', level: 'error', message: `${info.method} ${info.url} → ${info.status}` });
  if (info.status >= 500 || info.status === 0) {
    Sentry.captureMessage(`HTTP ${info.status} ${info.method} ${info.url}`, 'error');
  }
}
