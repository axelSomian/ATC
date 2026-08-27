import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { recordMatchSchema, validateMatchSchema, myMatchesQuerySchema } from './matches.schema.js';
import { getMyStats, getMyMatches, recordMatch, validateMatch } from './matches.service.js';

const router = Router();

router.get('/me/stats', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getMyStats(userId));
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto    = myMatchesQuerySchema.parse(req.query);
    res.json(await getMyMatches(userId, dto));
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto    = recordMatchSchema.parse(req.body);
    res.status(201).json(await recordMatch(userId, dto));
  } catch (err) { next(err); }
});

router.patch('/:id/validate', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto    = validateMatchSchema.parse(req.body);
    res.json(await validateMatch(req.params['id'], userId, dto));
  } catch (err) { next(err); }
});

export default router;
