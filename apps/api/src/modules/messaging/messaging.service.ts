import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { emitToUser } from '../../lib/socket.js';

const PLAYER_SELECT = {
  id: true, name: true, initials: true, avatarUrl: true, level: true,
} as const;

// ── Contexte « rappel du match » ───────────────────────────────────────────

interface ContextInput {
  dispoPost:
    | { id: string; userId: string; when: Date; court: string; type: string }
    | null;
  quickMatch:
    | { id: string; challengerId: string; challengedId: string; when: Date; court: string; type: string }
    | null;
  participants?: { userId: string }[];
}

export interface MatchContext {
  source: 'dispo' | 'quick';
  sourceId: string;
  when: Date;
  court: string;
  type: string;
  hostId: string;
  guestId: string;
}

function buildContext(c: ContextInput): MatchContext | null {
  if (c.dispoPost) {
    const d = c.dispoPost;
    const guestId = c.participants?.find((p) => p.userId !== d.userId)?.userId ?? '';
    return { source: 'dispo', sourceId: d.id, when: d.when, court: d.court, type: d.type, hostId: d.userId, guestId };
  }
  if (c.quickMatch) {
    const q = c.quickMatch;
    return { source: 'quick', sourceId: q.id, when: q.when, court: q.court, type: q.type, hostId: q.challengerId, guestId: q.challengedId };
  }
  return null;
}

const CONTEXT_INCLUDE = {
  dispoPost: { select: { id: true, userId: true, when: true, court: true, type: true } },
  quickMatch: { select: { id: true, challengerId: true, challengedId: true, when: true, court: true, type: true } },
} as const;

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

// ── Lecture ──────────────────────────────────────────────────────────────

export async function listConversations(userId: string) {
  const convs = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      ...CONTEXT_INCLUDE,
      participants: { select: { userId: true, user: { select: PLAYER_SELECT } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const unreadRows = await prisma.$queryRaw<{ conversationId: string; count: number }[]>`
    SELECT m."conversationId", COUNT(*)::int AS count
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId} AND m."createdAt" > p."lastReadAt"
    GROUP BY m."conversationId"
  `;
  const unreadBy = Object.fromEntries(unreadRows.map((r) => [r.conversationId, r.count]));

  return convs.map((c) => {
    const other = c.participants.find((p) => p.userId !== userId)?.user ?? null;
    const last = c.messages[0] ?? null;
    return {
      id: c.id,
      otherUser: other,
      lastMessage: last
        ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId }
        : null,
      unread: unreadBy[c.id] ?? 0,
      lastMessageAt: c.lastMessageAt,
      match: buildContext(c),
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

export async function getConversation(userId: string, conversationId: string) {
  await assertParticipant(userId, conversationId);

  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      ...CONTEXT_INCLUDE,
      participants: { select: { userId: true, user: { select: PLAYER_SELECT } } },
    },
  });
  if (!c) throw new AppError(404, 'Conversation introuvable');

  return {
    id: c.id,
    participants: c.participants.map((p) => p.user),
    match: buildContext(c),
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
  await assertParticipant(userId, conversationId);
  const text = body.trim();
  if (!text) throw new AppError(400, 'Message vide');

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: userId, body: text } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
  ]);

  const parts = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  for (const p of parts) {
    emitToUser(p.userId, 'message:new', { conversationId, message });
  }

  return message;
}

export async function markRead(userId: string, conversationId: string) {
  await assertParticipant(userId, conversationId);

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

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  });
  for (const o of others) {
    emitToUser(o.userId, 'message:read', { conversationId, readerId: userId, readAt: now });
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
