import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { getNotifications, markRead, markAllRead } from './notifications.service.js';

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getNotifications(userId));
  } catch (err) { next(err); }
});

// /read-all avant /:id/read pour éviter le conflit de route
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    await markAllRead(userId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    await markRead(userId, req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
