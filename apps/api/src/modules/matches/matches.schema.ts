import { z } from 'zod';

export const myMatchesQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MyMatchesQueryDto = z.infer<typeof myMatchesQuerySchema>;

export const recordMatchSchema = z.object({
  sourceType:  z.enum(['dispo', 'quick']),
  sourceId:    z.string().min(1),
  scoreHost:   z.string().min(1),
  scoreGuest:  z.string().min(1),
  winnerRole:  z.enum(['host', 'guest']),
});

export const validateMatchSchema = z.object({
  action: z.enum(['confirm', 'dispute']),
});

export type RecordMatchDto   = z.infer<typeof recordMatchSchema>;
export type ValidateMatchDto = z.infer<typeof validateMatchSchema>;
