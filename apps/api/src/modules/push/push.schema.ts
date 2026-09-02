import { z } from 'zod';

export const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  expirationTime: z.number().nullable().optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
export type UnsubscribeDto = z.infer<typeof unsubscribeSchema>;
