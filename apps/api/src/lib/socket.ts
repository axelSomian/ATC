import type { Server, Socket } from 'socket.io';
import { prisma } from './prisma.js';

let _io: Server | null = null;

export function setIo(io: Server): void {
  _io = io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  _io?.emit(event, data);
}

// ── Conversation ouverte à l'écran (pour la règle « push si pas dans la conv ») ──

const socketConversation = new Map<string, string>(); // socket.id -> conversationId

export function setSocketConversation(socketId: string, conversationId: string | null): void {
  if (conversationId) socketConversation.set(socketId, conversationId);
  else socketConversation.delete(socketId);
}

/** true si l'utilisateur a un onglet ouvert ET focalisé sur cette conversation. */
export function isUserInConversation(userId: string, conversationId: string): boolean {
  if (!_io) return false;
  for (const [, s] of _io.sockets.sockets) {
    const uid = (s.data as { userId?: string }).userId;
    if (uid === userId && socketConversation.get(s.id) === conversationId) return true;
  }
  return false;
}

// ── Présence (statut en ligne) ─────────────────────────────────────────────

function socketCountForUser(io: Server, userId: string): number {
  let n = 0;
  for (const [, s] of io.sockets.sockets) {
    if ((s.data as { userId?: string }).userId === userId) n++;
  }
  return n;
}

/** IDs des utilisateurs ayant au moins un socket connecté. */
export function onlineUserIds(io: Server): string[] {
  const ids = new Set<string>();
  for (const [, s] of io.sockets.sockets) {
    const uid = (s.data as { userId?: string }).userId;
    if (uid) ids.add(uid);
  }
  return [...ids];
}

/** Remet tout le monde hors-ligne (à appeler au démarrage, en cas de crash précédent). */
export async function resetPresence(): Promise<void> {
  await prisma.user.updateMany({ where: { online: true }, data: { online: false } }).catch(() => {});
}

/**
 * Gère le statut en ligne pour un socket qui vient de se connecter :
 * - envoie au nouveau client la liste des utilisateurs déjà en ligne
 * - passe l'utilisateur "online" et prévient les autres (si c'est son 1er socket)
 * - au disconnect, repasse "offline" si c'était son dernier socket
 */
export function handlePresence(io: Server, socket: Socket): void {
  const userId = (socket.data as { userId: string }).userId;

  socket.emit('presence:sync', onlineUserIds(io));

  if (socketCountForUser(io, userId) === 1) {
    prisma.user.update({ where: { id: userId }, data: { online: true } }).catch(() => {});
    socket.broadcast.emit('member:online', { userId });
  }

  socket.on('disconnect', () => {
    setSocketConversation(socket.id, null);
    if (socketCountForUser(io, userId) === 0) {
      prisma.user.update({ where: { id: userId }, data: { online: false } }).catch(() => {});
      io.emit('member:offline', { userId });
    }
  });
}
