import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { createDispoSchema, disposQuerySchema } from './dispos.schema.js';
import {
  listDispos, getMyDispos, createDispo,
  deleteDispo, requestDispo, respondRequest, getUpcomingForUser,
} from './dispos.service.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = disposQuerySchema.parse(req.query);
    res.json(await listDispos(query));
  } catch (err) { next(err); }
});

router.get('/upcoming', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getUpcomingForUser(userId));
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getMyDispos(userId));
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto = createDispoSchema.parse(req.body);
    res.status(201).json(await createDispo(userId, dto));
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    await deleteDispo(userId, req.params.id);
    res.json({ message: 'Annonce supprimée' });
  } catch (err) { next(err); }
});

router.post('/:id/request', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.status(201).json(await requestDispo(req.params.id, userId));
  } catch (err) { next(err); }
});

router.post('/:id/requests/:reqId/accept', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await respondRequest(req.params.id, req.params.reqId, userId, 'accept'));
  } catch (err) { next(err); }
});

router.post('/:id/requests/:reqId/decline', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await respondRequest(req.params.id, req.params.reqId, userId, 'decline'));
  } catch (err) { next(err); }
});

export default router;
