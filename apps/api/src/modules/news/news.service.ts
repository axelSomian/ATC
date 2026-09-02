import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { sendBroadcast } from '../../lib/webpush.js';
import type { CreatePostDto, ListQueryDto, UpdatePostDto } from './news.schema.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'post'}-${suffix}`;
}

/** Un post est visible du public s'il est publié, ou programmé et la date atteinte. */
function publicWhere(extra: Prisma.PostWhereInput = {}): Prisma.PostWhereInput {
  return {
    AND: [
      { OR: [{ status: 'published' }, { status: 'scheduled', publishedAt: { lte: new Date() } }] },
      extra,
    ],
  };
}

const CARD_SELECT = {
  id: true, slug: true, category: true, title: true, summary: true,
  coverImageUrl: true, publishedAt: true, createdAt: true,
  startsAt: true, endsAt: true, location: true,
  ctaLabel: true, ctaUrl: true, promoCode: true, featured: true,
} as const;

type Card = Prisma.PostGetPayload<{ select: typeof CARD_SELECT }>;
function toCard(p: Card) {
  return { ...p, date: p.publishedAt ?? p.createdAt };
}

// ── Lecture publique ───────────────────────────────────────────────────────

export async function listPublic({ category, cursor, limit }: ListQueryDto) {
  const rows = await prisma.post.findMany({
    where: publicWhere(category ? { category } : {}),
    select: CARD_SELECT,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit).map(toCard);
  return { data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null };
}

export async function getPublicBySlug(slug: string) {
  const post = await prisma.post.findFirst({ where: publicWhere({ slug }) });
  if (!post) throw new AppError(404, 'Actualité introuvable');
  return { ...post, date: post.publishedAt ?? post.createdAt, bodyHtml: renderMarkdown(post.body) };
}

export async function listFeatured() {
  const rows = await prisma.post.findMany({
    where: publicWhere({ featured: true }),
    select: CARD_SELECT,
    orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
    take: 8,
  });
  return rows.map(toCard);
}

export async function listUpcomingEvents(limit = 3) {
  const now = new Date();
  const rows = await prisma.post.findMany({
    where: publicWhere({
      category: 'evenement',
      OR: [{ endsAt: { gte: now } }, { AND: [{ endsAt: null }, { startsAt: { gte: now } }] }],
    }),
    select: CARD_SELECT,
    orderBy: [{ startsAt: 'asc' }],
    take: limit,
  });
  return rows.map(toCard);
}

export async function getPartnerOfMonth() {
  const row = await prisma.post.findFirst({
    where: publicWhere({ category: 'partenariat', featured: true }),
    select: CARD_SELECT,
    orderBy: [{ featuredOrder: 'asc' }, { publishedAt: 'desc' }],
  });
  return row ? toCard(row) : null;
}

// ── Administration ─────────────────────────────────────────────────────────

export function adminList(filter: { status?: string; category?: string }) {
  return prisma.post.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
  });
}

export async function adminGet(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new AppError(404, 'Publication introuvable');
  return post;
}

/** Un post « en ligne maintenant » = publié, ou programmé dont la date est passée. */
function isLiveNow(status: string, publishedAt: Date | null): boolean {
  if (status === 'published') return true;
  return status === 'scheduled' && !!publishedAt && publishedAt.getTime() <= Date.now();
}

/** Champs date : ISO string (ou null) -> Date (ou null), clé absente -> non touchée. */
function dateFields(dto: UpdatePostDto): Prisma.PostUpdateInput {
  const out: Prisma.PostUpdateInput = {};
  if ('startsAt' in dto) out.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
  if ('endsAt' in dto) out.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
  return out;
}

export async function adminCreate(dto: CreatePostDto) {
  if (dto.status === 'scheduled' && !dto.publishedAt) {
    throw new AppError(400, 'Une publication programmée doit avoir une date de publication');
  }
  const post = await prisma.post.create({
    data: {
      category: dto.category,
      status: dto.status,
      title: dto.title,
      slug: slugify(dto.title),
      summary: dto.summary,
      body: dto.body,
      coverImageUrl: dto.coverImageUrl ?? null,
      gallery: dto.gallery,
      publishedAt: normalizePublishedAt(dto.status, dto.publishedAt),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      location: dto.location ?? null,
      ctaLabel: dto.ctaLabel ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      featured: dto.featured,
      featuredOrder: dto.featuredOrder ?? null,
      promoCode: dto.promoCode ?? null,
      source: dto.source ?? null,
      notifyOnPublish: dto.notifyOnPublish,
    },
  });
  await maybeNotify(post);
  return post;
}

export async function adminUpdate(id: string, dto: UpdatePostDto) {
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Publication introuvable');

  const { publishedAt, startsAt, endsAt, ...rest } = dto;
  const nextStatus = dto.status ?? current.status;
  const resolvedPublishedAt = publishedAt ?? current.publishedAt?.toISOString() ?? null;
  if (nextStatus === 'scheduled' && !resolvedPublishedAt) {
    throw new AppError(400, 'Une publication programmée doit avoir une date de publication');
  }
  const nextPublishedAt =
    dto.status !== undefined || publishedAt !== undefined
      ? normalizePublishedAt(nextStatus, resolvedPublishedAt)
      : undefined;

  const post = await prisma.post.update({
    where: { id },
    data: {
      ...rest,
      ...dateFields(dto),
      ...(nextPublishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
    },
  });
  await maybeNotify(post);
  return post;
}

export async function adminRemove(id: string) {
  await prisma.post.delete({ where: { id } }).catch(() => {
    throw new AppError(404, 'Publication introuvable');
  });
}

function normalizePublishedAt(status: string, iso: string | null | undefined): Date | null {
  if (iso) return new Date(iso);
  // Publié sans date fournie -> maintenant. Brouillon/archivé/programmé -> null.
  return status === 'published' ? new Date() : null;
}

async function maybeNotify(post: { id: string; title: string; summary: string; slug: string; status: string; publishedAt: Date | null; notifyOnPublish: boolean; notifiedAt: Date | null }) {
  if (!post.notifyOnPublish || post.notifiedAt) return;
  if (!isLiveNow(post.status, post.publishedAt)) return; // programmé futur : push différé (non géré sans cron)
  await prisma.post.update({ where: { id: post.id }, data: { notifiedAt: new Date() } });
  sendBroadcast({
    title: post.title.slice(0, 80),
    body: post.summary.length > 140 ? `${post.summary.slice(0, 137)}…` : post.summary,
    url: `/actualite/${post.slug}`,
    tag: `news:${post.id}`,
  }).catch(() => {});
}
