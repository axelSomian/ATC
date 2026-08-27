import { z } from 'zod';
import { phoneField } from '../../lib/phone.js';

// Un query param absent peut arriver en '', 'undefined' ou 'null' (sérialisation
// côté client) — on le ramène à undefined avant toute coercition.
const blankToUndefined = (v: unknown) =>
  v === '' || v === 'undefined' || v === 'null' || v == null ? undefined : v;

export const membersQuerySchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().optional()),
  level: z.preprocess((v) => {
    const n = Number(v);
    return v == null || v === '' || Number.isNaN(n) ? undefined : n;
  }, z.number().int().min(1).max(5).optional()),
  online: z.preprocess(blankToUndefined, z.string().optional()).transform((v) => v === 'true'),
  city: z.preprocess(blankToUndefined, z.string().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateMeSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: phoneField.optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  age: z.number().int().min(10).max(100).optional().nullable(),
  city: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
  racquet: z.string().optional().nullable(),
  preferredCourts: z.array(z.string()).optional(),
  preferredTimes: z.array(z.string()).optional(),
  level: z.number().int().min(1).max(5).optional(),
});

export type MembersQueryDto = z.infer<typeof membersQuerySchema>;
export type UpdateMeDto = z.infer<typeof updateMeSchema>;
