import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from '../lib/logger.js';
import { captureError } from '../lib/sentry.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const reqId = (req as Request & { reqId?: string }).reqId;
  const userId = (req.user as { id?: string } | undefined)?.id ?? null;

  if (err instanceof AppError) {
    // Erreur métier attendue (4xx surtout) — on trace en warn, sans Sentry.
    if (err.statusCode >= 500) {
      log.error('app.error', { reqId, userId, path: req.originalUrl, status: err.statusCode, err });
      captureError(err, { reqId, userId, path: req.originalUrl });
    } else {
      log.warn('app.error', { reqId, userId, path: req.originalUrl, status: err.statusCode, message: err.message });
    }
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    log.warn('validation.error', { reqId, path: req.originalUrl, issues: err.errors.length });
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Erreur non prévue → 500, trace complète + Sentry.
  log.error('unhandled.error', { reqId, userId, method: req.method, path: req.originalUrl, err });
  captureError(err, { reqId, userId, method: req.method, path: req.originalUrl });
  return res.status(500).json({ error: 'Erreur interne du serveur', reqId });
}
