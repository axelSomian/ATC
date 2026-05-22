import { z } from 'zod';

export const createQuickMatchSchema = z.object({
  challengedId: z.string().min(1),
  when:         z.string().datetime(),
  court:        z.string().min(1),
  type:         z.enum(['simple', 'double', 'mixte']),
  note:         z.string().optional(),
});

export type CreateQuickMatchDto = z.infer<typeof createQuickMatchSchema>;
