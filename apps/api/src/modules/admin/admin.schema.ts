import { z } from 'zod';

/** Slug : minuscules, chiffres, tirets. */
const slug = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres, tirets)');

export const createClubSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  zone: z.string().trim().max(60).default(''),
  location: z.string().trim().max(160).default(''),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const updateClubSchema = z.object({
  slug: slug.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  zone: z.string().trim().max(60).optional(),
  location: z.string().trim().max(160).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const updateLevelSchema = z.object({
  code: z.string().trim().min(1).max(8).optional(),
  nom: z.string().trim().min(1).max(60).optional(),
  profil: z.string().trim().min(1).max(400).optional(),
  jeu: z.string().trim().min(1).max(400).optional(),
});

export const resolveMatchSchema = z.object({
  winnerRole: z.enum(['host', 'guest']),
  scoreHost: z.string().trim().max(40).optional(),
  scoreGuest: z.string().trim().max(40).optional(),
});

export const setRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

export type CreateClubDto = z.infer<typeof createClubSchema>;
export type UpdateClubDto = z.infer<typeof updateClubSchema>;
export type UpdateLevelDto = z.infer<typeof updateLevelSchema>;
export type ResolveMatchDto = z.infer<typeof resolveMatchSchema>;
export type SetRoleDto = z.infer<typeof setRoleSchema>;
