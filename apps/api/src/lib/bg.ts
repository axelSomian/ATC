import { log } from './logger.js';
import { captureError } from './sentry.js';

/**
 * Exécute une promesse « fire-and-forget » en traçant l'échec au lieu de l'avaler.
 *   bg(sendPushToUser(id, payload), 'push.match_request', { userId: id });
 */
export function bg(promise: Promise<unknown>, label: string, context?: Record<string, unknown>): void {
  promise.catch((err) => {
    log.warn(`bg.failed`, { label, ...context, err });
    captureError(err, { bg: label, ...context });
  });
}
