import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { bg } from '../../lib/bg.js';
import { createNotification } from '../notifications/notifications.service.js';
import {
  BADGES,
  HAUT_FAIT_CODES,
  computeBadges,
  type EngineMatch,
  type HautFaitCode,
} from './badges.engine.js';

const ENGINE_MATCH_SELECT = {
  id: true,
  playedAt: true,
  hostId: true,
  guestId: true,
  winnerId: true,
  scoreHost: true,
  court: true,
  wasDisputed: true,
  hostRatingBefore: true,
  guestRatingBefore: true,
} as const;

async function confirmedMatchesOf(userId: string): Promise<EngineMatch[]> {
  return prisma.match.findMany({
    where: { status: 'confirmed', OR: [{ hostId: userId }, { guestId: userId }] },
    select: ENGINE_MATCH_SELECT,
    orderBy: { playedAt: 'asc' },
  });
}

/**
 * Recalcule les hauts faits d'un joueur et insère ceux qui viennent d'être
 * débloqués (insert-only : on ne retire jamais un haut fait). Renvoie les codes
 * nouvellement débloqués — l'appelant déclenche la notif.
 */
export async function syncAchievements(userId: string, now: Date = new Date()): Promise<HautFaitCode[]> {
  const matches = await confirmedMatchesOf(userId);
  const { achievements } = computeBadges(userId, matches, now);
  if (achievements.length === 0) return [];

  const existing = new Set(
    (await prisma.achievement.findMany({ where: { userId }, select: { code: true } })).map((a) => a.code),
  );

  const fresh = achievements.filter((a) => !existing.has(a.code));
  if (fresh.length === 0) return [];

  await prisma.achievement.createMany({
    data: fresh.map((a) => ({
      userId,
      code: a.code,
      context: (a.context ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });

  return fresh.map((a) => a.code);
}

/** Écrit le haut fait « Palier franchi » au moment exact où le niveau change. */
export async function recordLevelUp(userId: string, from: number, to: number): Promise<boolean> {
  if (to <= from) return false;
  try {
    await prisma.achievement.create({
      data: { userId, code: 'passage_niveau', context: { from, to } },
    });
    notifyUnlock(userId, 'passage_niveau');
    return true;
  } catch {
    // unique (userId, code) déjà présent — le palier a déjà été fêté.
    return false;
  }
}

/** Notif in-app + push pour un badge débloqué. */
export function notifyUnlock(userId: string, code: HautFaitCode): void {
  const meta = BADGES[code];
  bg(
    createNotification(userId, 'badge_unlocked', { code, label: meta.label, description: meta.description }),
    'notification.badge_unlocked',
    { userId, code },
  );
}

/** Recalcule + notifie les hauts faits fraîchement débloqués (post-confirmation de match). */
export async function refreshAndNotify(userId: string, now: Date = new Date()): Promise<void> {
  const fresh = await syncAchievements(userId, now);
  for (const code of fresh) notifyUnlock(userId, code);
}

export interface BadgesPayload {
  series: {
    code: string;
    label: string;
    description: string;
    value: number;
    target: number;
    earned: boolean;
  }[];
  achievements: {
    code: string;
    label: string;
    description: string;
    earned: boolean;
    unlockedAt: string | null;
  }[];
  earnedCount: number;
  totalCount: number;
}

/** Vue badges d'un joueur (profil : soi-même ou un autre membre — même contenu). */
export async function getBadges(userId: string, now: Date = new Date()): Promise<BadgesPayload> {
  // Rafraîchit d'abord pour que l'affichage soit à jour même sans match récent.
  await syncAchievements(userId, now).catch(() => {});

  const [matches, rows] = await Promise.all([
    confirmedMatchesOf(userId),
    prisma.achievement.findMany({ where: { userId }, select: { code: true, unlockedAt: true } }),
  ]);

  const unlocked = new Map(rows.map((r) => [r.code, r.unlockedAt]));
  const { series } = computeBadges(userId, matches, now);

  const seriesOut = series.map((s) => ({
    code: s.code,
    label: BADGES[s.code].label,
    description: BADGES[s.code].description,
    value: s.value,
    target: s.target,
    earned: s.earned,
  }));

  const achievementsOut = HAUT_FAIT_CODES.map((code) => {
    const at = unlocked.get(code);
    return {
      code,
      label: BADGES[code].label,
      description: BADGES[code].description,
      earned: at !== undefined,
      unlockedAt: at ? at.toISOString() : null,
    };
  });

  const earnedCount = achievementsOut.filter((a) => a.earned).length + seriesOut.filter((s) => s.earned).length;

  return {
    series: seriesOut,
    achievements: achievementsOut,
    earnedCount,
    totalCount: seriesOut.length + achievementsOut.length,
  };
}
