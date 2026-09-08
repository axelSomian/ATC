import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';
import { prisma } from '../../lib/prisma.js';
import { getBadges } from './badges.service.js';

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getBadges(userId));
  } catch (err) { next(err); }
});

router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const userId = req.params['userId'];
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new AppError(404, 'Membre introuvable');
    res.json(await getBadges(userId));
  } catch (err) { next(err); }
});

export default router;
