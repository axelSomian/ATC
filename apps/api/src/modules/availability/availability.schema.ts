import { z } from 'zod';

export const weekQuerySchema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const slotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt:   z.string().datetime(),
  status:   z.enum(['free', 'busy']).default('free'),
});

export type SlotDto = z.infer<typeof slotSchema>;
