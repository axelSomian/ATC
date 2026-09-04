import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { log } from '../lib/logger.js';

/** Horodatage de la dernière requête HTTP réelle (hors /health) — sert au keep-alive DB. */
let lastActivityAt = Date.now();
export const getLastActivityAt = (): number => lastActivityAt;

/**
 * Une ligne de log par requête HTTP à sa fin :
 *   method, path, status, durée (ms), userId (si authentifié), ip, reqId.
 * Le reqId est renvoyé au client (en-tête + corps des 500) → un membre qui
 * signale un bug peut le donner pour retrouver la trace exacte.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();

  lastActivityAt = Date.now();
  const reqId = req.get('x-request-id') || randomUUID();
  (req as Request & { reqId: string }).reqId = reqId;
  res.setHeader('x-request-id', reqId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const userId = (req.user as { id?: string } | undefined)?.id ?? null;
    const fields = {
      reqId,
      method: req.method,
      path: req.baseUrl + req.path,
      status: res.statusCode,
      ms,
      userId,
      ip: req.ip,
    };
    if (res.statusCode >= 500) log.error('http.request', fields);
    else if (res.statusCode >= 400) log.warn('http.request', fields);
    else log.info('http.request', fields);
  });

  next();
}
