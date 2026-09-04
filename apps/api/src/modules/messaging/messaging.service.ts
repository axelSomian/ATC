import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { emitToUser, isUserInConversation } from '../../lib/socket.js';
import { sendPushToUser } from '../../lib/webpush.js';
import { sendMessageReceived } from '../mailer/mailer.service.js';
import { bg } from '../../lib/bg.js';

// Anti-spam e-mail : au plus 1 e-mail « nouveau message » par (conversation, destinataire) / 15 min.
const emailCooldown = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Prévient le destinataire d'un message qu'il n'a pas vu passer :
 *  - push web s'il a un abonnement ;
 *  - sinon e-mail (débounce) s'il est hors ligne.
 */
async function notifyRecipient(recipientId: string, conversationId: string, senderName: string, preview: string) {
  if (isUserInConversation(recipientId, conversationId)) return; // il regarde la conv → rien

  const url = `/messages/${conversationId}`;
  const pushed = await sendPushToUser(recipientId, {
    title: senderName,
    body: preview.length > 120 ? `${preview.slice(0, 117)}…` : preview,
    url,
    tag: `conversation:${conversationId}`,
  });
  if (pushed > 0) return; // push délivré → pas d'e-mail

  // Repli e-mail : hors ligne, débounce 15 min.
  const key = `${conversationId}:${recipientId}`;
  if ((emailCooldown.get(key) ?? 0) > Date.now() - EMAIL_COOLDOWN_MS) return;

  const user = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { email: true, name: true, online: true },
  });
  if (!user?.email || user.online) return;

  emailCooldown.set(key, Date.now());
  const appUrl = `${process.env.CORS_ORIGIN ?? ''}${url}`;
  sendMessageReceived({ to: user.email, recipientName: user.name, senderName, appUrl });
}

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

/** Clé métier d'une conversation : les deux userId triés, joints par ':'. */
const pairKeyOf = (a: string, b: string) => [a, b].sort().join(':');

/**
 * Garantit qu'une conversation existe entre deux joueurs.
 * 1 conversation = 1 relation : si elle existe déjà, on la réutilise telle
 * quelle (historique conservé) ; on n'en crée jamais une seconde pour la paire.
 */
async function ensureConversation(userA: string, userB: string) {
  const pairKey = pairKeyOf(userA, userB);

  const existing = await prisma.conversation.findUnique({ where: { pairKey } });
  if (existing) return existing;

  try {
    const conv = await prisma.conversation.create({
      data: { pairKey, participants: { create: [{ userId: userA }, { userId: userB }] } },
    });
    emitToUser(userA, 'conversation:new', { id: conv.id });
    emitToUser(userB, 'conversation:new', { id: conv.id });
    return conv;
  } catch {
    // Course entre deux acceptations concurrentes : la contrainte unique a joué, on relit.
    return prisma.conversation.findUnique({ where: { pairKey } });
  }
}

/** Hook depuis dispos.service : à l'acceptation d'une demande sur une annonce. */
export function ensureConversationForDispo(hostId: string, guestId: string) {
  return ensureConversation(hostId, guestId);
}

/** Hook depuis quick-matches.service : à l'acceptation d'un défi direct. */
export function ensureConversationForQuick(challengerId: string, challengedId: string) {
  return ensureConversation(challengerId, challengedId);
}

/**
 * « Rappel du match » d'une conversation : le dernier match accepté entre les
 * deux joueurs (annonce ou défi direct). Calculé à la lecture — la conversation
 * n'est plus rattachée à un match précis.
 */
interface MatchCtxRow {
  source: 'dispo' | 'quick';
  source_id: string;
  mwhen: Date;
  mcourt: string;
  mtype: string;
  host_id: string;
  guest_id: string;
}

async function latestMatchContext(userA: string, userB: string): Promise<MatchContext | null> {
  const rows = await prisma.$queryRaw<MatchCtxRow[]>`
    SELECT * FROM (
      SELECT 'dispo' AS source, dp.id AS source_id, dp."when" AS mwhen,
             dp.court AS mcourt, dp.type AS mtype,
             dp."userId" AS host_id, mr."requesterId" AS guest_id
      FROM "DispoPost" dp
      JOIN "MatchRequest" mr ON mr."dispoPostId" = dp.id AND mr.status = 'accepted'
      WHERE dp."userId" IN (${userA}, ${userB})
        AND mr."requesterId" IN (${userA}, ${userB})
        AND dp."userId" <> mr."requesterId"
      UNION ALL
      SELECT 'quick' AS source, qm.id, qm."when", qm.court, qm.type,
             qm."challengerId" AS host_id, qm."challengedId" AS guest_id
      FROM "QuickMatch" qm
      WHERE qm.status = 'accepted'
        AND qm."challengerId" IN (${userA}, ${userB})
        AND qm."challengedId" IN (${userA}, ${userB})
    ) mm
    ORDER BY mm.mwhen DESC
    LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    source: r.source, sourceId: r.source_id, when: r.mwhen,
    court: r.mcourt ?? '', type: r.mtype ?? '',
    hostId: r.host_id ?? '', guestId: r.guest_id ?? '',
  };
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
  other_id: string | null;
  other_name: string | null;
  other_initials: string | null;
  other_avatar: string | null;
  other_level: number | null;
  last_body: string | null;
  last_created: Date | null;
  last_sender: string | null;
  unread: number;
  m_source: 'dispo' | 'quick' | null;
  m_source_id: string | null;
  m_when: Date | null;
  m_court: string | null;
  m_type: string | null;
  m_host: string | null;
  m_guest: string | null;
}

/**
 * Liste des conversations de l'utilisateur — **une seule requête** (perf : chaque
 * aller-retour Render↔Neon coûte ~100-200 ms, on ne peut pas se permettre les
 * 5 requêtes qu'imposerait un `include` Prisma imbriqué).
 */
export async function listConversations(userId: string) {
  const rows = await prisma.$queryRaw<ConvListRow[]>`
    SELECT
      c.id, c."lastMessageAt",
      ou.id            AS other_id,
      ou.name          AS other_name,
      ou.initials      AS other_initials,
      ou."avatarUrl"   AS other_avatar,
      ou.level         AS other_level,
      lm.body          AS last_body,
      lm."createdAt"   AS last_created,
      lm."senderId"    AS last_sender,
      COALESCE(uc.cnt, 0)::int AS unread,
      mc.source        AS m_source,
      mc.source_id     AS m_source_id,
      mc.mwhen         AS m_when,
      mc.mcourt        AS m_court,
      mc.mtype         AS m_type,
      mc.host_id       AS m_host,
      mc.guest_id      AS m_guest
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
    LEFT JOIN LATERAL (
      SELECT * FROM (
        SELECT 'dispo' AS source, dp.id AS source_id, dp."when" AS mwhen,
               dp.court AS mcourt, dp.type AS mtype,
               dp."userId" AS host_id, mr."requesterId" AS guest_id
        FROM "DispoPost" dp
        JOIN "MatchRequest" mr ON mr."dispoPostId" = dp.id AND mr.status = 'accepted'
        WHERE dp."userId" IN (${userId}, other."userId")
          AND mr."requesterId" IN (${userId}, other."userId")
          AND dp."userId" <> mr."requesterId"
        UNION ALL
        SELECT 'quick' AS source, qm.id, qm."when", qm.court, qm.type,
               qm."challengerId" AS host_id, qm."challengedId" AS guest_id
        FROM "QuickMatch" qm
        WHERE qm.status = 'accepted'
          AND qm."challengerId" IN (${userId}, other."userId")
          AND qm."challengedId" IN (${userId}, other."userId")
      ) mm
      ORDER BY mm.mwhen DESC
      LIMIT 1
    ) mc ON true
    ORDER BY c."lastMessageAt" DESC
  `;

  return rows.map((r) => {
    const match: MatchContext | null = r.m_source && r.m_when
      ? {
          source: r.m_source, sourceId: r.m_source_id ?? '', when: r.m_when,
          court: r.m_court ?? '', type: r.m_type ?? '',
          hostId: r.m_host ?? '', guestId: r.m_guest ?? '',
        }
      : null;

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
  p_user: string;
  u_id: string;
  u_name: string;
  u_initials: string;
  u_avatar: string | null;
  u_level: number;
}

export async function getConversation(userId: string, conversationId: string) {
  const rows = await prisma.$queryRaw<ConvDetailRow[]>`
    SELECT p."userId"     AS p_user,
      u.id           AS u_id,
      u.name         AS u_name,
      u.initials     AS u_initials,
      u."avatarUrl"  AS u_avatar,
      u.level        AS u_level
    FROM "ConversationParticipant" p
    JOIN "User" u ON u.id = p."userId"
    WHERE p."conversationId" = ${conversationId}
  `;
  if (rows.length === 0 || !rows.some((r) => r.p_user === userId)) {
    throw new AppError(404, 'Conversation introuvable');
  }

  const otherId = rows.find((r) => r.p_user !== userId)?.p_user;
  const match = otherId ? await latestMatchContext(userId, otherId) : null;

  return {
    id: conversationId,
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
  const [message, , , sender] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: userId, body: text } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  const senderName = sender?.name ?? 'Un joueur';
  for (const id of ids) {
    emitToUser(id, 'message:new', { conversationId, message });
    if (id !== userId) {
      bg(notifyRecipient(id, conversationId, senderName, text), 'notify.message', { conversationId, recipientId: id });
    }
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
    conv = await ensureConversation(dispo.userId, guestId);
  } else {
    const qm = await prisma.quickMatch.findUnique({ where: { id: sourceId } });
    if (!qm) throw new AppError(404, 'Match rapide introuvable');
    if (qm.status !== 'accepted') throw new AppError(400, "Le défi n'a pas encore été accepté");
    if (userId !== qm.challengerId && userId !== qm.challengedId) throw new AppError(403, 'Non autorisé');
    conv = await ensureConversation(qm.challengerId, qm.challengedId);
  }

  if (!conv) throw new AppError(500, 'Conversation indisponible');
  return getConversation(userId, conv.id);
}
