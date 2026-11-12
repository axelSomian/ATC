import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import {
  listTournaments, getTournament, registerForTournament, unregisterFromTournament, getPublishedBracket,
} from './tournaments.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await listTournaments(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getTournament(req.params.id, userId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/bracket', async (req, res, next) => {
  try {
    res.json(await getPublishedBracket(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/register', async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await registerForTournament(req.params.id, userId));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/register', async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await unregisterFromTournament(req.params.id, userId));
  } catch (err) {
    next(err);
  }
});

export default router;
