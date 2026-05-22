import { z } from 'zod';

export const createDispoSchema = z.object({
  when:     z.string().datetime(),
  duration: z.coerce.number().int().min(30).max(300),
  court:    z.string().min(2).max(100),
  type:     z.enum(['simple', 'double', 'mixte']),
  note:     z.string().max(300).optional().nullable(),
});

export const disposQuerySchema = z.object({
  date:  z.string().optional(),
  type:  z.enum(['simple', 'double', 'mixte']).optional(),
  court: z.string().optional(),
  level: z.coerce.number().int().min(1).max(5).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateDispoDto  = z.infer<typeof createDispoSchema>;
export type DisposQueryDto  = z.infer<typeof disposQuerySchema>;
