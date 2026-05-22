import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import type { MembersQueryDto, UpdateMeDto } from './members.schema.js';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  initials: true,
  avatarUrl: true,
  level: true,
  city: true,
  club: true,
  online: true,
  joinedAt: true,
} as const;

const PROFILE_SELECT = {
  ...PUBLIC_SELECT,
  bio: true,
  age: true,
  racquet: true,
  preferredCourts: true,
  preferredTimes: true,
} as const;

const ME_SELECT = {
  ...PROFILE_SELECT,
  email: true,
  phone: true,
} as const;

export async function listMembers(dto: MembersQueryDto) {
  const { q, level, online, city, page, limit } = dto;
  const skip = (page - 1) * limit;

  const where = {
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(level !== undefined ? { level } : {}),
    ...(online ? { online: true } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
  };

  const [total, members] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: PUBLIC_SELECT, skip, take: limit, orderBy: { joinedAt: 'desc' } }),
  ]);

  return { data: members, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getOwnProfile(userId: string) {
  const member = await prisma.user.findUnique({ where: { id: userId }, select: ME_SELECT });
  if (!member) throw new AppError(404, 'Membre introuvable');
  return member;
}

const PLAYER_SELECT_SMALL = {
  id: true, name: true, initials: true, avatarUrl: true, level: true,
} as const;

export async function getMemberById(id: string) {
  const [member, allConfirmed, recentMatches] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { ...PROFILE_SELECT, rating: true, ratingGames: true },
    }),
    prisma.match.findMany({
      where: { OR: [{ hostId: id }, { guestId: id }], status: 'confirmed' },
      select: { winnerId: true, playedAt: true },
      orderBy: { playedAt: 'desc' },
    }),
    prisma.match.findMany({
      where: { OR: [{ hostId: id }, { guestId: id }], status: 'confirmed' },
      orderBy: { playedAt: 'desc' },
      take: 10,
      select: {
        id: true, playedAt: true, court: true, type: true,
        scoreHost: true, scoreGuest: true, winnerId: true,
        hostId: true, guestId: true,
        host:  { select: PLAYER_SELECT_SMALL },
        guest: { select: PLAYER_SELECT_SMALL },
      },
    }),
  ]);

  if (!member) throw new AppError(404, 'Membre introuvable');

  const matchesPlayed = allConfirmed.length;
  const wins          = allConfirmed.filter(m => m.winnerId === id).length;
  const losses        = matchesPlayed - wins;
  const winRate       = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  // Série de victoires en cours (matchs déjà triés par date desc)
  let winStreak = 0;
  for (const m of allConfirmed) {
    if (m.winnerId === id) winStreak++;
    else break;
  }

  // Rang dans le classement (null si < 5 matchs confirmés)
  const rank = member.ratingGames >= 5
    ? await prisma.user.count({ where: { rating: { gt: member.rating }, ratingGames: { gte: 5 } } }) + 1
    : null;

  return { ...member, matchesPlayed, wins, losses, winRate, winStreak, rank, recentMatches };
}

export async function getRankings() {
  const users = await prisma.user.findMany({
    where: { ratingGames: { gte: 5 } },
    select: {
      id: true,
      name: true,
      initials: true,
      avatarUrl: true,
      level: true,
      rating: true,
      ratingGames: true,
      ratingDelta: true,
      matchesAsHost:  { where: { status: 'confirmed' }, select: { winnerId: true } },
      matchesAsGuest: { where: { status: 'confirmed' }, select: { winnerId: true } },
    },
    orderBy: { rating: 'desc' },
    take: 100,
  });

  return users.map((u, i) => {
    const all  = [...u.matchesAsHost, ...u.matchesAsGuest];
    const wins = all.filter(m => m.winnerId === u.id).length;
    const matchesPlayed = all.length;
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
    return {
      rank: i + 1,
      id:   u.id,
      name: u.name,
      initials:  u.initials,
      avatarUrl: u.avatarUrl,
      level:     u.level,
      rating:    u.rating,
      ratingDelta: u.ratingDelta,
      matchesPlayed,
      wins,
      losses: matchesPlayed - wins,
      winRate,
    };
  });
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: ME_SELECT,
  });
}

export async function updateMe(userId: string, dto: UpdateMeDto) {
  if (dto.phone) {
    const existing = await prisma.user.findFirst({
      where: { phone: dto.phone, id: { not: userId } },
    });
    if (existing) throw new AppError(409, 'Ce numéro est déjà utilisé');
  }

  return prisma.user.update({
    where: { id: userId },
    data: dto,
    select: PROFILE_SELECT,
  });
}
