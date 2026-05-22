import type { Server } from 'socket.io';

let _io: Server | null = null;

export function setIo(io: Server): void {
  _io = io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  _io?.to(`user:${userId}`).emit(event, data);
}
