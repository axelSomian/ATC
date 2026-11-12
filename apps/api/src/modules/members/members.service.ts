import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { assertValidClub } from '../reference/reference.service.js';
import { getRankByTournamentPoints } from '../../lib/ranking.js';
import type { MembersQueryDto, UpdateMeDto } from './members.schema.js';

const CLUB_SELECT = {
  select: { id: true, slug: true, name: true, zone: true, location: true },
} as const;

const PUBLIC_SELECT = {
  id: true,
  name: true,
  initials: true,
  avatarUrl: true,
  level: true,
  city: true,
  club: CLUB_SELECT,
  online: true,
  joinedAt: true,
} as const;

const PROFILE_SELECT = {
  ...PUBLIC_SELECT,
  bio: true,
  age: true,
  gender: true,
  racquet: true,
  preferredCourts: true,
  preferredTimes: true,
  bestRanking: true,
} as const;

const ME_SELECT = {
  ...PROFILE_SELECT,
  email: true,
  phone: true,
} as const;

export async function listMembers(dto: MembersQueryDto) {
  const { q, level, online, city, club, page, limit } = dto;
  const skip = (page - 1) * limit;

  const where = {
    isGuest: false,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(level !== undefined ? { level } : {}),
    ...(online ? { online: true } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
    ...(club ? { club: { slug: club } } : {}),
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
  const [member, allConfirmed, recentMatches, rank] = await Promise.all([
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
    getRankByTournamentPoints(id),
  ]);

  if (!member) throw new AppError(404, 'Membre introuvable');

  const matchesPlayed = allConfirmed.length;
  const wins          = allConfirmed.filter((m: { winnerId: string }) => m.winnerId === id).length;
  const losses        = matchesPlayed - wins;
  const winRate       = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  // Série de victoires en cours (matchs déjà triés par date desc)
  let winStreak = 0;
  for (const m of allConfirmed) {
    if (m.winnerId === id) winStreak++;
    else break;
  }

  // Le rating brut ne sort jamais côté client — seuls niveau, classement et delta sont exposés.
  const { rating: _rating, ...memberPublic } = member;
  return { ...memberPublic, matchesPlayed, wins, losses, winRate, winStreak, rank, recentMatches };
}

// Classement fédéral (pivot nov. 2026) : uniquement les points de tournoi
// (TournamentResult) — les matchs amicaux (ELO/`rating`) n'y figurent plus.
export async function getRankings() {
  const grouped = await prisma.tournamentResult.groupBy({
    by: ['userId'],
    _sum: { points: true },
  });

  const totals = grouped
    .map((g: { userId: string; _sum: { points: number | null } }) => ({ userId: g.userId, points: g._sum.points ?? 0 }))
    .filter((t: { points: number }) => t.points > 0)
    .sort((a: { points: number }, b: { points: number }) => b.points - a.points)
    .slice(0, 100);

  if (totals.length === 0) return [];

  const ids = totals.map((t: { userId: string }) => t.userId);

  const [users, winCounts, hostCounts, guestCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids }, isGuest: false },
      select: { id: true, name: true, initials: true, avatarUrl: true, level: true },
    }),
    prisma.match.groupBy({
      by: ['winnerId'],
      where: { status: 'confirmed', winnerId: { in: ids } },
      _count: { id: true },
    }),
    prisma.match.groupBy({
      by: ['hostId'],
      where: { status: 'confirmed', hostId: { in: ids } },
      _count: { id: true },
    }),
    prisma.match.groupBy({
      by: ['guestId'],
      where: { status: 'confirmed', guestId: { in: ids } },
      _count: { id: true },
    }),
  ]);

  const usersMap = new Map(users.map((u) => [u.id, u]));
  const winsMap  = new Map<string, number>(winCounts.map( (r: { winnerId: string; _count: { id: number } }) => [r.winnerId, r._count.id]));
  const hostMap  = new Map<string, number>(hostCounts.map( (r: { hostId: string;   _count: { id: number } }) => [r.hostId,  r._count.id]));
  const guestMap = new Map<string, number>(guestCounts.map((r: { guestId: string;  _count: { id: number } }) => [r.guestId, r._count.id]));

  return totals
    .map((t: { userId: string; points: number }, i: number) => {
      const u = usersMap.get(t.userId);
      if (!u) return null;
      const wins          = winsMap.get(t.userId)  ?? 0;
      const matchesPlayed = (hostMap.get(t.userId) ?? 0) + (guestMap.get(t.userId) ?? 0);
      const winRate       = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
      return {
        rank: i + 1,
        id: u.id, name: u.name, initials: u.initials, avatarUrl: u.avatarUrl,
        level: u.level, points: t.points,
        matchesPlayed, wins, losses: matchesPlayed - wins, winRate,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
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

  if (dto.clubId !== undefined) await assertValidClub(dto.clubId);

  return prisma.user.update({
    where: { id: userId },
    data: dto,
    select: PROFILE_SELECT,
  });
}
