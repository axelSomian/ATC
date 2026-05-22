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
          select: { id: true },
        });
        if (!user) return done(null, false);
        return done(null, { id: user.id });
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
    (err: Error | null, user: { id: string } | false) => {
      if (err || !user) {
        res.status(401).json({ error: 'Non autorisé' });
        return;
      }
      req.user = user;
      next();
    },
  )(req, res, next);
}
