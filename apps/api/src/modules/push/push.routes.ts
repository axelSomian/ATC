import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { vapidPublicKey, pushEnabled } from '../../lib/webpush.js';
import { subscribeSchema, unsubscribeSchema } from './push.schema.js';
import { saveSubscription, removeSubscription } from './push.service.js';

const router = Router();

// Clé publique VAPID — le front en a besoin pour `pushManager.subscribe`.
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: vapidPublicKey, enabled: pushEnabled });
});

router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto = subscribeSchema.parse(req.body);
    await saveSubscription(userId, dto);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { endpoint } = unsubscribeSchema.parse(req.body);
    await removeSubscription(userId, endpoint);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
