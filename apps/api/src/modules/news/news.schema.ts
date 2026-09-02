import { z } from 'zod';

export const CATEGORIES = ['tournoi', 'evenement', 'partenariat', 'infos_tennis', 'atc'] as const;
export const STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;

export type PostCategory = (typeof CATEGORIES)[number];
export type PostStatus = (typeof STATUSES)[number];

const nullableUrl = z
  .string()
  .max(600)
  .refine((v) => /^https:\/\//i.test(v) || v.startsWith('/'), 'Lien invalide (https:// ou chemin interne)')
  .nullish();

const isoDate = z.string().datetime({ offset: true }).nullish();

export const createPostSchema = z.object({
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES).default('draft'),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(3).max(400),
  body: z.string().trim().min(1).max(20_000),
  coverImageUrl: z.string().url().max(600).nullish(),
  gallery: z.array(z.string().url().max(600)).max(12).default([]),
  publishedAt: isoDate,
  startsAt: isoDate,
  endsAt: isoDate,
  location: z.string().trim().max(160).nullish(),
  ctaLabel: z.string().trim().max(40).nullish(),
  ctaUrl: nullableUrl,
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().min(0).max(999).nullish(),
  promoCode: z.string().trim().max(40).nullish(),
  source: z.string().trim().max(120).nullish(),
  notifyOnPublish: z.boolean().default(false),
});

export const updatePostSchema = createPostSchema.partial();

export const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export const adminListQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
export type UpdatePostDto = z.infer<typeof updatePostSchema>;
export type ListQueryDto = z.infer<typeof listQuerySchema>;
