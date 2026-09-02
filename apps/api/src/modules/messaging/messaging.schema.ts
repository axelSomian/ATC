import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message vide')
    .max(2000, 'Message trop long (2000 caractères max)'),
});

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
});

export const bySourceParamsSchema = z.object({
  source: z.enum(['dispo', 'quick']),
  sourceId: z.string().min(1),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;
export type BySourceParamsDto = z.infer<typeof bySourceParamsSchema>;
