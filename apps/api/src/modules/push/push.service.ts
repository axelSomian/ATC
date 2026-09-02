import { prisma } from '../../lib/prisma.js';
import type { SubscribeDto } from './push.schema.js';

export async function saveSubscription(userId: string, dto: SubscribeDto) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: dto.endpoint },
    update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}
