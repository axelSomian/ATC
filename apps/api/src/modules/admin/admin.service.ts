import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { createNotification } from '../notifications/notifications.service.js';
import { applyEloUpdate } from '../matches/matches.service.js';
import { sendBroadcast, pushStats } from '../../lib/webpush.js';
import type {
  CreateClubDto,
  UpdateClubDto,
  UpdateLevelDto,
  ResolveMatchDto,
  SetRoleDto,
  BroadcastPushDto,
} from './admin.schema.js';

/* ─────────────────────────── Clubs ─────────────────────────── */

/** Tous les clubs (actifs et inactifs) pour l'admin. */
export function listAllClubs() {
  return prisma.club.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createClub(dto: CreateClubDto) {
  try {
    return await prisma.club.create({ data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'Un club avec ce slug existe déjà');
    }
    throw err;
  }
}

export async function updateClub(id: string, dto: UpdateClubDto) {
  try {
    return await prisma.club.update({ where: { id }, data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw new AppError(404, 'Club introuvable');
      if (err.code === 'P2002') throw new AppError(409, 'Un club avec ce slug existe déjà');
    }
    throw err;
  }
}

export async function setClubImage(id: string, imageUrl: string) {
  try {
    return await prisma.club.update({ where: { id }, data: { imageUrl } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Club introuvable');
    }
    throw err;
  }
}

export async function deleteClub(id: string) {
  const members = await prisma.user.count({ where: { clubId: id } });
  if (members > 0) {
    throw new AppError(
      409,
      `Ce club est rattaché à ${members} membre(s). Désactivez-le plutôt que de le supprimer.`,
    );
  }
  try {
    await prisma.club.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Club introuvable');
    }
    throw err;
  }
}

/* ─────────────────────────── Niveaux ─────────────────────────── */

export function listAllLevels() {
  return prisma.level.findMany({ orderBy: { level: 'asc' } });
}

export async function updateLevel(level: number, dto: UpdateLevelDto) {
  try {
    return await prisma.level.update({ where: { level }, data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Niveau introuvable');
    }
    throw err;
  }
}

/* ─────────────────────── Litiges de score ─────────────────────── */

const DISPUTE_PLAYER_SELECT = {
  id: true,
  name: true,
  initials: true,
  avatarUrl: true,
  level: true,
} as const;

export function listDisputedMatches() {
  return prisma.match.findMany({
    where: { status: 'disputed' },
    orderBy: { playedAt: 'desc' },
    include: {
      host: { select: DISPUTE_PLAYER_SELECT },
      guest: { select: DISPUTE_PLAYER_SELECT },
    },
  });
}

export async function resolveMatch(matchId: string, dto: ResolveMatchDto) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new AppError(404, 'Match introuvable');
  if (match.status !== 'disputed') {
    throw new AppError(409, 'Ce match n\'est pas en litige');
  }

  const winnerId = dto.winnerRole === 'host' ? match.hostId : match.guestId;

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'confirmed',
      winnerId,
      ...(dto.scoreHost !== undefined ? { scoreHost: dto.scoreHost } : {}),
      ...(dto.scoreGuest !== undefined ? { scoreGuest: dto.scoreGuest } : {}),
    },
  });

  // Le litige n'a jamais déclenché l'ELO — on l'applique maintenant.
  applyEloUpdate(match.hostId, match.guestId, winnerId).catch(() => {});

  for (const userId of [match.hostId, match.guestId]) {
    createNotification(userId, 'score_resolved', {
      matchId: match.id,
      court: match.court,
      playedAt: match.playedAt.toISOString(),
      won: winnerId === userId,
    }).catch(() => {});
  }

  return updated;
}

/* ─────────────────────────── Membres ─────────────────────────── */

export function listMembersForAdmin() {
  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      initials: true,
      level: true,
      role: true,
      online: true,
      joinedAt: true,
      club: { select: { id: true, name: true } },
    },
  });
}

/* ─────────────────────────── Notifications push ─────────────────────────── */

export function getPushStats() {
  return pushStats();
}

export async function broadcastPush(dto: BroadcastPushDto) {
  return sendBroadcast({ title: dto.title, body: dto.body, url: dto.url, tag: 'atc-annonce' });
}

export async function setMemberRole(targetId: string, adminId: string, dto: SetRoleDto) {
  if (targetId === adminId && dto.role !== 'admin') {
    throw new AppError(400, 'Vous ne pouvez pas retirer votre propre rôle administrateur');
  }
  try {
    return await prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: { id: true, name: true, role: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Membre introuvable');
    }
    throw err;
  }
}
