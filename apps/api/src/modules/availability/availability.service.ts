import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import type { SlotDto } from './availability.schema.js';

export async function getWeekSlots(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return prisma.availability.findMany({
    where: { userId, startsAt: { gte: weekStart, lt: weekEnd } },
    orderBy: { startsAt: 'asc' },
  });
}

export async function upsertSlot(userId: string, dto: SlotDto) {
  const existing = await prisma.availability.findFirst({
    where: { userId, startsAt: new Date(dto.startsAt) },
  });

  if (existing) {
    return prisma.availability.update({
      where: { id: existing.id },
      data: { status: dto.status },
    });
  }

  return prisma.availability.create({
    data: {
      userId,
      startsAt: new Date(dto.startsAt),
      endsAt:   new Date(dto.endsAt),
      status:   dto.status,
    },
  });
}

export async function deleteSlot(userId: string, slotId: string) {
  const slot = await prisma.availability.findUnique({ where: { id: slotId } });
  if (!slot || slot.userId !== userId) throw new AppError(404, 'Créneau introuvable');
  await prisma.availability.delete({ where: { id: slotId } });
}
