import Parser from 'rss-parser';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';

const MAX_AGE_DAYS = 14;
const MAX_PER_FEED = 5;
const SYNC_TTL_MS = 6 * 60 * 60 * 1000; // fetch-on-read : au plus 1 synchro / 6 h

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url?: string; type?: string };
  'media:content'?: { $?: { url?: string; medium?: string; type?: string } };
};

const parser: Parser<unknown, FeedItem> = new Parser({
  timeout: 12_000,
  headers: { 'User-Agent': 'ATC-News/1.0 (+https://atc-web-ten.vercel.app)' },
  customFields: { item: [['media:content', 'media:content']] },
});

let lastSyncAttempt = 0;

// ── CRUD flux ──────────────────────────────────────────────────────────────

export function listFeeds() {
  return prisma.rssFeed.findMany({ orderBy: [{ createdAt: 'asc' }] });
}

export async function createFeed(dto: { url: string; label: string; autoPublish?: boolean }) {
  const exists = await prisma.rssFeed.findUnique({ where: { url: dto.url } });
  if (exists) throw new AppError(409, 'Ce flux existe déjà');
  return prisma.rssFeed.create({
    data: { url: dto.url, label: dto.label, autoPublish: dto.autoPublish ?? false },
  });
}

export async function updateFeed(id: string, dto: Partial<{ label: string; autoPublish: boolean; active: boolean }>) {
  return prisma.rssFeed.update({ where: { id }, data: dto }).catch(() => {
    throw new AppError(404, 'Flux introuvable');
  });
}

export async function deleteFeed(id: string) {
  await prisma.rssFeed.delete({ where: { id } }).catch(() => {
    throw new AppError(404, 'Flux introuvable');
  });
}

// ── Synchro ────────────────────────────────────────────────────────────────

function pickImage(item: FeedItem): string | null {
  if (item.enclosure?.url && (item.enclosure.type ?? '').startsWith('image')) return item.enclosure.url;
  const media = item['media:content']?.$;
  if (media?.url && (media.medium === 'image' || (media.type ?? '').startsWith('image'))) return media.url;
  const m = item.content?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function excerpt(item: FeedItem): string {
  const raw = (item.contentSnippet ?? item.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.length > 320 ? `${raw.slice(0, 317)}…` : raw;
}

function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${base || 'article'}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function syncFeed(feed: { id: string; url: string; label: string; autoPublish: boolean }): Promise<number> {
  let parsed;
  try {
    parsed = await parser.parseURL(feed.url);
  } catch (err) {
    await prisma.rssFeed.update({
      where: { id: feed.id },
      data: { lastSyncAt: new Date(), lastError: (err as Error).message.slice(0, 300) },
    });
    return 0;
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const items = (parsed.items ?? [])
    .filter((it) => it.title && it.link)
    .map((it) => ({ ...it, when: new Date(it.isoDate ?? it.pubDate ?? Date.now()) }))
    .filter((it) => it.when.getTime() >= cutoff)
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, MAX_PER_FEED);

  let created = 0;
  for (const it of items) {
    const externalId = (it.guid || it.link!).slice(0, 500);
    const dup = await prisma.post.findUnique({ where: { externalId } });
    if (dup) continue;

    const publish = feed.autoPublish;
    const data: Prisma.PostCreateInput = {
      category: 'infos_tennis',
      status: publish ? 'published' : 'draft',
      title: it.title!.slice(0, 160),
      slug: slugify(it.title!),
      summary: excerpt(it) || it.title!.slice(0, 160),
      // On ne republie PAS l'article : extrait + renvoi vers la source.
      body: `${excerpt(it)}\n\n[Lire l'article complet sur ${feed.label}](${it.link})`,
      coverImageUrl: pickImage(it),
      publishedAt: publish ? it.when : null,
      source: feed.label,
      sourceUrl: it.link,
      externalId,
      ctaLabel: "Lire l'article",
      ctaUrl: it.link,
    };
    try {
      await prisma.post.create({ data });
      created++;
    } catch {
      /* course sur externalId unique — ignoré */
    }
  }

  await prisma.rssFeed.update({
    where: { id: feed.id },
    data: { lastSyncAt: new Date(), lastError: null },
  });
  return created;
}

export async function syncAllFeeds(): Promise<{ feeds: number; imported: number }> {
  lastSyncAttempt = Date.now();
  const feeds = await prisma.rssFeed.findMany({ where: { active: true } });
  let imported = 0;
  for (const f of feeds) imported += await syncFeed(f);
  return { feeds: feeds.length, imported };
}

/** Déclenché à la lecture du feed public — au plus une fois toutes les 6 h. */
export function maybeSync(): void {
  if (Date.now() - lastSyncAttempt < SYNC_TTL_MS) return;
  lastSyncAttempt = Date.now();
  syncAllFeeds().catch(() => {});
}
