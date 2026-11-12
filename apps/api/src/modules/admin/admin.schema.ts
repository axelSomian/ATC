import { z } from 'zod';
import { LICENCE_CATEGORIES, type LicenceCategory } from '../licence/licence.rules.js';

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

/** Coordonnée optionnelle : '' / null / undefined => null, sinon nombre fini. */
const optionalCoord = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().finite().min(min).max(max).nullable(),
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
  lat: optionalCoord(-90, 90).default(null),
  lng: optionalCoord(-180, 180).default(null),
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

export const setRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

export const broadcastPushSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(300),
  url: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? '/' : v),
    z.string().trim().max(200).regex(/^\//, 'Le lien doit commencer par /').default('/'),
  ),
});

/** '' / null / undefined => null, sinon la valeur (préprocesseur générique pour champs optionnels nullable). */
const optionalNullable = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), schema.nullable());

const genderRule = optionalNullable(z.enum(['homme', 'femme']));
const levelBound = optionalNullable(z.coerce.number().int().min(1).max(5));
const maxPlayers = optionalNullable(z.coerce.number().int().min(2).max(256));
const allowedLicenceCategories = z
  .array(z.enum(LICENCE_CATEGORIES as [LicenceCategory, ...LicenceCategory[]]))
  .max(LICENCE_CATEGORIES.length);

export const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(2000).default(null),
  location: optionalText(160).default(null),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.date().nullable(),
  ).default(null),
  genderRule: genderRule.default(null),
  minLevel: levelBound.default(null),
  maxLevel: levelBound.default(null),
  maxPlayers: maxPlayers.default(null),
  allowedLicenceCategories: allowedLicenceCategories.default([]),
});

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: optionalText(2000).optional(),
  location: optionalText(160).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  registrationDeadline: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.date().nullable(),
  ).optional(),
  status: z.enum(['upcoming', 'open', 'closed', 'completed']).optional(),
  genderRule: genderRule.optional(),
  minLevel: levelBound.optional(),
  maxLevel: levelBound.optional(),
  maxPlayers: maxPlayers.optional(),
  allowedLicenceCategories: allowedLicenceCategories.optional(),
});

export const addTournamentRegistrantSchema = z
  .object({
    userId: z.string().min(1).optional(),
    name: z.string().trim().min(2).max(80).optional(),
  })
  .refine((d) => Boolean(d.userId) !== Boolean(d.name), {
    message: "Fournir soit l'identifiant d'un membre existant, soit un nom pour un joueur sans compte.",
  });

export const setTournamentResultsSchema = z.object({
  results: z
    .array(
      z.object({
        userId: z.string().min(1),
        points: z.coerce.number().int().min(0).max(10000),
        position: z.coerce.number().int().min(1).max(1000).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export const generateBracketSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const setMatchResultSchema = z.object({
  winnerId: z.string().min(1),
  scoreText: optionalText(40).default(null),
});

export const swapBracketPlayersSchema = z.object({
  userIdA: z.string().min(1),
  userIdB: z.string().min(1),
});

export const setBracketPublishedSchema = z.object({
  published: z.boolean(),
});

export type CreateClubDto = z.infer<typeof createClubSchema>;
export type UpdateClubDto = z.infer<typeof updateClubSchema>;
export type UpdateLevelDto = z.infer<typeof updateLevelSchema>;
export type SetRoleDto = z.infer<typeof setRoleSchema>;
export type BroadcastPushDto = z.infer<typeof broadcastPushSchema>;
export type CreateTournamentDto = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentDto = z.infer<typeof updateTournamentSchema>;
export type AddTournamentRegistrantDto = z.infer<typeof addTournamentRegistrantSchema>;
export type SetTournamentResultsDto = z.infer<typeof setTournamentResultsSchema>;
export type GenerateBracketDto = z.infer<typeof generateBracketSchema>;
export type SetMatchResultDto = z.infer<typeof setMatchResultSchema>;
export type SwapBracketPlayersDto = z.infer<typeof swapBracketPlayersSchema>;
export type SetBracketPublishedDto = z.infer<typeof setBracketPublishedSchema>;
