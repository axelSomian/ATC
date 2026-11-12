import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { categoryLabel, type LicenceCategory } from '../licence/licence.rules.js';

const TOURNAMENT_SELECT = {
  id: true,
  name: true,
  description: true,
  location: true,
  startDate: true,
  endDate: true,
  registrationDeadline: true,
  status: true,
  genderRule: true,
  minLevel: true,
  maxLevel: true,
  maxPlayers: true,
  allowedLicenceCategories: true,
  bracketPublished: true,
} as const;

interface Rules {
  genderRule: string | null;
  minLevel: number | null;
  maxLevel: number | null;
  maxPlayers: number | null;
  allowedLicenceCategories: string[];
}

/** Libellé lisible des règles d'un tournoi (affiché aux joueurs), null si aucune restriction. */
function rulesLabel(t: Rules): string | null {
  const parts: string[] = [];
  if (t.genderRule) parts.push(t.genderRule === 'femme' ? 'Réservé aux femmes' : 'Réservé aux hommes');
  if (t.minLevel != null && t.maxLevel != null) parts.push(`Niveau ${t.minLevel}-${t.maxLevel}`);
  else if (t.minLevel != null) parts.push(`Niveau ${t.minLevel}+`);
  else if (t.maxLevel != null) parts.push(`Niveau ${t.maxLevel} max`);
  if (t.allowedLicenceCategories.length) {
    parts.push(`Licence ${t.allowedLicenceCategories.map((c) => categoryLabel(c as LicenceCategory)).join(' ou ')}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/** null = éligible, sinon le motif d'inéligibilité à afficher au joueur. */
function ineligibilityReason(
  t: Rules,
  user: { gender: string | null; level: number; licenceCategory: string | null },
  registrationsCount: number,
): string | null {
  if (t.genderRule && t.genderRule !== user.gender) {
    return `Réservé aux ${t.genderRule === 'femme' ? 'femmes' : 'hommes'} (renseigne ton genre dans ton profil)`;
  }
  if (t.minLevel != null && user.level < t.minLevel) return `Niveau ${t.minLevel} minimum requis`;
  if (t.maxLevel != null && user.level > t.maxLevel) return `Niveau ${t.maxLevel} maximum autorisé`;
  if (t.allowedLicenceCategories.length && !t.allowedLicenceCategories.includes(user.licenceCategory ?? '')) {
    const labels = t.allowedLicenceCategories.map((c) => categoryLabel(c as LicenceCategory)).join(', ');
    return `Réservé aux détenteurs d'une licence active : ${labels}`;
  }
  if (t.maxPlayers != null && registrationsCount >= t.maxPlayers) return 'Tournoi complet';
  return null;
}

async function getEligibilityContext(userId: string) {
  const [user, licence] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { gender: true, level: true } }),
    prisma.licence.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { paidAt: 'desc' },
      select: { category: true },
    }),
  ]);
  return { gender: user?.gender ?? null, level: user?.level ?? 1, licenceCategory: licence?.category ?? null };
}

export async function listTournaments(userId: string) {
  const [tournaments, user] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { startDate: 'asc' },
      select: {
        ...TOURNAMENT_SELECT,
        _count: { select: { registrations: true } },
        registrations: { where: { userId }, select: { userId: true } },
      },
    }),
    getEligibilityContext(userId),
  ]);

  return tournaments.map(({ registrations, _count, ...t }) => ({
    ...t,
    registrationsCount: _count.registrations,
    registered: registrations.length > 0,
    rulesLabel: rulesLabel(t),
    ineligibleReason: ineligibilityReason(t, user, _count.registrations),
  }));
}

export async function getTournament(id: string, userId: string) {
  const [tournament, user] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id },
      select: {
        ...TOURNAMENT_SELECT,
        registrations: {
          orderBy: { registeredAt: 'asc' },
          select: { userId: true, user: { select: { id: true, name: true, initials: true, avatarUrl: true, level: true } } },
        },
        results: {
          orderBy: { points: 'desc' },
          select: { userId: true, points: true, position: true, user: { select: { id: true, name: true, initials: true, avatarUrl: true } } },
        },
      },
    }),
    getEligibilityContext(userId),
  ]);
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');

  const { registrations, ...rest } = tournament;
  return {
    ...rest,
    registered: registrations.some((r) => r.userId === userId),
    participants: registrations.map((r) => r.user),
    rulesLabel: rulesLabel(tournament),
    ineligibleReason: ineligibilityReason(tournament, user, registrations.length),
  };
}

export async function registerForTournament(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');
  if (tournament.status !== 'open') throw new AppError(409, 'Les inscriptions ne sont pas ouvertes pour ce tournoi');
  if (tournament.registrationDeadline && tournament.registrationDeadline < new Date()) {
    throw new AppError(409, 'La date limite d\'inscription est dépassée');
  }

  const [user, registrationsCount] = await Promise.all([
    getEligibilityContext(userId),
    prisma.tournamentRegistration.count({ where: { tournamentId } }),
  ]);
  const reason = ineligibilityReason(tournament, user, registrationsCount);
  if (reason) throw new AppError(403, reason);

  try {
    await prisma.tournamentRegistration.create({ data: { tournamentId, userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'Vous êtes déjà inscrit à ce tournoi');
    }
    throw err;
  }
  return getTournament(tournamentId, userId);
}

export async function unregisterFromTournament(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');
  if (tournament.status === 'completed') throw new AppError(409, 'Ce tournoi est déjà terminé');

  await prisma.tournamentRegistration.deleteMany({ where: { tournamentId, userId } });
  return getTournament(tournamentId, userId);
}

/* ─────────────────────────── Tableau (bracket) ───────────────────────────
 * Lecture seule, partagée par l'admin (toujours autorisé) et par le public
 * (gatée par `bracketPublished` — voir getPublishedBracket). */

const PLAYER_SELECT = { id: true, name: true, initials: true, avatarUrl: true } as const;

function roundLabel(round: number, totalRounds: number): string {
  const distance = totalRounds - round;
  switch (distance) {
    case 0: return 'Finale';
    case 1: return 'Demi-finale';
    case 2: return 'Quart de finale';
    case 3: return 'Huitième de finale';
    case 4: return 'Seizième de finale';
    default: return `Tour ${round}`;
  }
}

/** Lecture du tableau — `generated: false` si aucun tirage n'a encore été fait. */
export async function getBracket(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { slot: 'asc' }],
    include: { playerA: { select: PLAYER_SELECT }, playerB: { select: PLAYER_SELECT }, winner: { select: PLAYER_SELECT } },
  });
  if (matches.length === 0) return { generated: false as const, totalRounds: 0, champion: null, rounds: [] };

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const rounds = Array.from({ length: totalRounds }, (_, i) => {
    const round = i + 1;
    return { round, label: roundLabel(round, totalRounds), matches: matches.filter((m) => m.round === round) };
  });
  const final = matches.find((m) => m.round === totalRounds);
  return { generated: true as const, totalRounds, champion: final?.winner ?? null, rounds };
}

/** Vue publique du tableau — ne renvoie les données que si l'admin l'a publié. */
export async function getPublishedBracket(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { bracketPublished: true } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');
  if (!tournament.bracketPublished) {
    return { published: false as const, generated: false as const, totalRounds: 0, champion: null, rounds: [] };
  }
  return { published: true as const, ...(await getBracket(tournamentId)) };
}
