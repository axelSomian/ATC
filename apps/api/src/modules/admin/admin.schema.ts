import { z } from 'zod';

/** Slug : minuscules, chiffres, tirets. */
const slug = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres, tirets)');

/** URL d'image optionnelle : '' / null / undefined => null, sinon URL http(s). */
const optionalImageUrl = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.string().url().max(500).nullable(),
);

/** Texte optionnel : '' / null / undefined => null, sinon chaîne trimmée bornée. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '') || v === null || v === undefined ? null : v,
    z.string().trim().max(max).nullable(),
  );

/** URL optionnelle (site web) : '' => null, sinon URL http(s). */
const optionalUrl = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.string().url().max(200).nullable(),
);

export const createClubSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  zone: z.string().trim().max(60).default(''),
  location: z.string().trim().max(160).default(''),
  address: optionalText(300).default(null),
  description: optionalText(2000).default(null),
  feesInfo: optionalText(1000).default(null),
  phone: optionalText(40).default(null),
  website: optionalUrl.default(null),
  imageUrl: optionalImageUrl.default(null),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const updateClubSchema = z.object({
  slug: slug.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  zone: z.string().trim().max(60).optional(),
  location: z.string().trim().max(160).optional(),
  address: optionalText(300).optional(),
  description: optionalText(2000).optional(),
  feesInfo: optionalText(1000).optional(),
  phone: optionalText(40).optional(),
  website: optionalUrl.optional(),
  imageUrl: optionalImageUrl.optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

/** Coordonnée optionnelle : '' / null / undefined => null, sinon nombre fini. */
const optionalCoord = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().finite().min(min).max(max).nullable(),
  );

export const createCourtSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(120),
  zone: z.string().trim().max(60).default(''),
  address: z.string().trim().max(200).default(''),
  lat: optionalCoord(-90, 90).default(null),
  lng: optionalCoord(-180, 180).default(null),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const updateCourtSchema = z.object({
  slug: slug.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  zone: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  lat: optionalCoord(-90, 90).optional(),
  lng: optionalCoord(-180, 180).optional(),
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
export type CreateCourtDto = z.infer<typeof createCourtSchema>;
export type UpdateCourtDto = z.infer<typeof updateCourtSchema>;
export type UpdateLevelDto = z.infer<typeof updateLevelSchema>;
export type ResolveMatchDto = z.infer<typeof resolveMatchSchema>;
export type SetRoleDto = z.infer<typeof setRoleSchema>;
