import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { createQuickMatchSchema } from './quick-matches.schema.js';
import { challenge, respond, getMyQuickMatches } from './quick-matches.service.js';

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getMyQuickMatches(userId));
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto    = createQuickMatchSchema.parse(req.body);
    res.status(201).json(await challenge(userId, dto));
  } catch (err) { next(err); }
});

router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await respond(req.params.id, userId, 'accept'));
  } catch (err) { next(err); }
});

router.post('/:id/decline', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await respond(req.params.id, userId, 'decline'));
  } catch (err) { next(err); }
});

export default router;
