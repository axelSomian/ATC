import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { prisma } from '../lib/prisma.js';
import type { Request, Response, NextFunction } from 'express';

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    },
    async (payload: { sub: string }, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, role: true },
        });
        if (!user) return done(null, false);
        return done(null, { id: user.id, role: user.role });
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: { id: string; role: string } | false) => {
      if (err || !user) {
        res.status(401).json({ error: 'Non autorisé' });
        return;
      }
      req.user = user;
      next();
    },
  )(req, res, next);
}

/** À chaîner après `authenticate` : réserve la route aux comptes admin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    return;
  }
  next();
}
