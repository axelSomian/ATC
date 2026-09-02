import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { emitToUser } from '../../lib/socket.js';

// ── Contexte « rappel du match » ───────────────────────────────────────────

export interface MatchContext {
  source: 'dispo' | 'quick';
  sourceId: string;
  when: Date;
  court: string;
  type: string;
  hostId: string;
  guestId: string;
}

// ── Création (appelée à l'acceptation d'une proposition de match) ───────────

async function ensureConversation(
  link: { dispoPostId?: string; quickMatchId?: string },
  userA: string,
  userB: string,
) {
  const where = link.dispoPostId
    ? { dispoPostId: link.dispoPostId }
    : { quickMatchId: link.quickMatchId! };

  const existing = await prisma.conversation.findUnique({ where });
  if (existing) return existing;

  try {
    const conv = await prisma.conversation.create({
      data: { ...link, participants: { create: [{ userId: userA }, { userId: userB }] } },
    });
    emitToUser(userA, 'conversation:new', { id: conv.id });
    emitToUser(userB, 'conversation:new', { id: conv.id });
    return conv;
  } catch {
    // Course entre deux acceptations concurrentes : la contrainte unique a joué, on relit.
    return prisma.conversation.findUnique({ where });
  }
}

/** Hook depuis dispos.service : à l'acceptation d'une demande sur une annonce. */
export function ensureConversationForDispo(dispoPostId: string, hostId: string, guestId: string) {
  return ensureConversation({ dispoPostId }, hostId, guestId);
}

/** Hook depuis quick-matches.service : à l'acceptation d'un défi direct. */
export function ensureConversationForQuick(quickMatchId: string, challengerId: string, challengedId: string) {
  return ensureConversation({ quickMatchId }, challengerId, challengedId);
}

// ── Contrôle d'accès ──────────────────────────────────────────────────────

async function assertParticipant(userId: string, conversationId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p) throw new AppError(404, 'Conversation introuvable');
  return p;
}

/** Vérifie l'appartenance ET renvoie les IDs des participants (cibles des emits). */
async function participantIdsOrThrow(userId: string, conversationId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  if (rows.length === 0 || !rows.some((r) => r.userId === userId)) {
    throw new AppError(404, 'Conversation introuvable');
  }
  return rows.map((r) => r.userId);
}

// ── Lecture ──────────────────────────────────────────────────────────────

interface ConvListRow {
  id: string;
  lastMessageAt: Date;
  dispoPostId: string | null;
  quickMatchId: string | null;
  other_id: string | null;
  other_name: string | null;
  other_initials: string | null;
  other_avatar: string | null;
  other_level: number | null;
  last_body: string | null;
  last_created: Date | null;
  last_sender: string | null;
  unread: number;
  dp_host: string | null;
  dp_when: Date | null;
  dp_court: string | null;
  dp_type: string | null;
  qm_host: string | null;
  qm_guest: string | null;
  qm_when: Date | null;
  qm_court: string | null;
  qm_type: string | null;
}

/**
 * Liste des conversations de l'utilisateur — **une seule requête** (perf : chaque
 * aller-retour Render↔Neon coûte ~100-200 ms, on ne peut pas se permettre les
 * 5 requêtes qu'imposerait un `include` Prisma imbriqué).
 */
export async function listConversations(userId: string) {
  const rows = await prisma.$queryRaw<ConvListRow[]>`
    SELECT
      c.id, c."lastMessageAt", c."dispoPostId", c."quickMatchId",
      ou.id            AS other_id,
      ou.name          AS other_name,
      ou.initials      AS other_initials,
      ou."avatarUrl"   AS other_avatar,
      ou.level         AS other_level,
      lm.body          AS last_body,
      lm."createdAt"   AS last_created,
      lm."senderId"    AS last_sender,
      COALESCE(uc.cnt, 0)::int AS unread,
      dp."userId"      AS dp_host,
      dp."when"        AS dp_when,
      dp.court         AS dp_court,
      dp.type          AS dp_type,
      qm."challengerId" AS qm_host,
      qm."challengedId" AS qm_guest,
      qm."when"        AS qm_when,
      qm.court         AS qm_court,
      qm.type          AS qm_type
    FROM "Conversation" c
    JOIN "ConversationParticipant" me
      ON me."conversationId" = c.id AND me."userId" = ${userId}
    LEFT JOIN LATERAL (
      SELECT op."userId"
      FROM "ConversationParticipant" op
      WHERE op."conversationId" = c.id AND op."userId" <> ${userId}
      LIMIT 1
    ) other ON true
    LEFT JOIN "User" ou ON ou.id = other."userId"
    LEFT JOIN LATERAL (
      SELECT m.body, m."createdAt", m."senderId"
      FROM "Message" m
      WHERE m."conversationId" = c.id
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM "Message" m
      WHERE m."conversationId" = c.id
        AND m."senderId" <> ${userId}
        AND m."createdAt" > me."lastReadAt"
    ) uc ON true
    LEFT JOIN "DispoPost"  dp ON dp.id = c."dispoPostId"
    LEFT JOIN "QuickMatch" qm ON qm.id = c."quickMatchId"
    ORDER BY c."lastMessageAt" DESC
  `;

  return rows.map((r) => {
    let match: MatchContext | null = null;
    if (r.dispoPostId && r.dp_when) {
      match = {
        source: 'dispo', sourceId: r.dispoPostId, when: r.dp_when,
        court: r.dp_court ?? '', type: r.dp_type ?? '',
        hostId: r.dp_host ?? '', guestId: r.other_id ?? '',
      };
    } else if (r.quickMatchId && r.qm_when) {
      match = {
        source: 'quick', sourceId: r.quickMatchId, when: r.qm_when,
        court: r.qm_court ?? '', type: r.qm_type ?? '',
        hostId: r.qm_host ?? '', guestId: r.qm_guest ?? '',
      };
    }

    return {
      id: r.id,
      otherUser: r.other_id
        ? {
            id: r.other_id,
            name: r.other_name ?? '',
            initials: r.other_initials ?? '',
            avatarUrl: r.other_avatar,
            level: r.other_level ?? 1,
          }
        : null,
      lastMessage: r.last_created
        ? { body: r.last_body ?? '', createdAt: r.last_created, senderId: r.last_sender ?? '' }
        : null,
      unread: r.unread,
      lastMessageAt: r.lastMessageAt,
      match,
    };
  });
}

export async function getUnreadTotal(userId: string) {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId} AND m."createdAt" > p."lastReadAt"
  `;
  return { unread: rows[0]?.count ?? 0 };
}

interface ConvDetailRow {
  id: string;
  dispoPostId: string | null;
  quickMatchId: string | null;
  p_user: string;
  u_id: string;
  u_name: string;
  u_initials: string;
  u_avatar: string | null;
  u_level: number;
  dp_host: string | null;
  dp_when: Date | null;
  dp_court: string | null;
  dp_type: string | null;
  qm_host: string | null;
  qm_guest: string | null;
  qm_when: Date | null;
  qm_court: string | null;
  qm_type: string | null;
}

export async function getConversation(userId: string, conversationId: string) {
  // Une seule requête : participants (2 lignes) + contexte match.
  const rows = await prisma.$queryRaw<ConvDetailRow[]>`
    SELECT c.id, c."dispoPostId", c."quickMatchId",
      p."userId"     AS p_user,
      u.id           AS u_id,
      u.name         AS u_name,
      u.initials     AS u_initials,
      u."avatarUrl"  AS u_avatar,
      u.level        AS u_level,
      dp."userId"    AS dp_host, dp."when" AS dp_when, dp.court AS dp_court, dp.type AS dp_type,
      qm."challengerId" AS qm_host, qm."challengedId" AS qm_guest, qm."when" AS qm_when, qm.court AS qm_court, qm.type AS qm_type
    FROM "Conversation" c
    JOIN "ConversationParticipant" p ON p."conversationId" = c.id
    JOIN "User" u ON u.id = p."userId"
    LEFT JOIN "DispoPost"  dp ON dp.id = c."dispoPostId"
    LEFT JOIN "QuickMatch" qm ON qm.id = c."quickMatchId"
    WHERE c.id = ${conversationId}
  `;
  if (rows.length === 0 || !rows.some((r) => r.p_user === userId)) {
    throw new AppError(404, 'Conversation introuvable');
  }

  const first = rows[0];
  let match: MatchContext | null = null;
  if (first.dispoPostId && first.dp_when) {
    const guestId = rows.find((r) => r.p_user !== first.dp_host)?.p_user ?? '';
    match = {
      source: 'dispo', sourceId: first.dispoPostId, when: first.dp_when,
      court: first.dp_court ?? '', type: first.dp_type ?? '',
      hostId: first.dp_host ?? '', guestId,
    };
  } else if (first.quickMatchId && first.qm_when) {
    match = {
      source: 'quick', sourceId: first.quickMatchId, when: first.qm_when,
      court: first.qm_court ?? '', type: first.qm_type ?? '',
      hostId: first.qm_host ?? '', guestId: first.qm_guest ?? '',
    };
  }

  return {
    id: first.id,
    participants: rows.map((r) => ({
      id: r.u_id, name: r.u_name, initials: r.u_initials, avatarUrl: r.u_avatar, level: r.u_level,
    })),
    match,
  };
}

export async function listMessages(userId: string, conversationId: string, before?: string) {
  await assertParticipant(userId, conversationId);

  const take = 30;
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return { data: page.reverse(), hasMore };
}

// ── Écriture ─────────────────────────────────────────────────────────────

export async function sendMessage(userId: string, conversationId: string, body: string) {
  const text = body.trim();
  if (!text) throw new AppError(400, 'Message vide');
  const ids = await participantIdsOrThrow(userId, conversationId);

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: userId, body: text } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
  ]);

  for (const id of ids) {
    emitToUser(id, 'message:new', { conversationId, message });
  }
  return message;
}

export async function markRead(userId: string, conversationId: string) {
  const ids = await participantIdsOrThrow(userId, conversationId);

  const now = new Date();
  await prisma.$transaction([
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
    prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: now },
    }),
  ]);

  for (const id of ids) {
    if (id !== userId) {
      emitToUser(id, 'message:read', { conversationId, readerId: userId, readAt: now });
    }
  }
  return { ok: true };
}

// ── Accès depuis le match concerné (bouton « Discuter ») ───────────────────

export async function getConversationBySource(
  userId: string,
  source: 'dispo' | 'quick',
  sourceId: string,
) {
  let conv: { id: string } | null;

  if (source === 'dispo') {
    const dispo = await prisma.dispoPost.findUnique({
      where: { id: sourceId },
      include: { requests: { where: { status: 'accepted' }, select: { requesterId: true } } },
    });
    if (!dispo) throw new AppError(404, 'Annonce introuvable');
    const guestId = dispo.requests[0]?.requesterId;
    if (!guestId) throw new AppError(400, 'Aucun adversaire confirmé pour ce match');
    if (userId !== dispo.userId && userId !== guestId) throw new AppError(403, 'Non autorisé');
    conv = await ensureConversation({ dispoPostId: sourceId }, dispo.userId, guestId);
  } else {
    const qm = await prisma.quickMatch.findUnique({ where: { id: sourceId } });
    if (!qm) throw new AppError(404, 'Match rapide introuvable');
    if (qm.status !== 'accepted') throw new AppError(400, "Le défi n'a pas encore été accepté");
    if (userId !== qm.challengerId && userId !== qm.challengedId) throw new AppError(403, 'Non autorisé');
    conv = await ensureConversation({ quickMatchId: sourceId }, qm.challengerId, qm.challengedId);
  }

  if (!conv) throw new AppError(500, 'Conversation indisponible');
  return getConversation(userId, conv.id);
}
