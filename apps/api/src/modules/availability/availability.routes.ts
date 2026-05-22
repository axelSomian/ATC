import { Router } from 'express';
import { authenticate } from '../../middleware/passport.js';
import { weekQuerySchema, slotSchema } from './availability.schema.js';
import { getWeekSlots, upsertSlot, deleteSlot } from './availability.service.js';

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { week } = weekQuerySchema.parse(req.query);
    const weekStart = week ? new Date(week) : getThisMonday();
    weekStart.setHours(0, 0, 0, 0);
    res.json(await getWeekSlots(userId, weekStart));
  } catch (err) { next(err); }
});

router.put('/me/slot', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto = slotSchema.parse(req.body);
    res.json(await upsertSlot(userId, dto));
  } catch (err) { next(err); }
});

router.delete('/me/slot/:id', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    await deleteSlot(userId, req.params.id);
    res.json({ message: 'Créneau supprimé' });
  } catch (err) { next(err); }
});

function getThisMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

export default router;
