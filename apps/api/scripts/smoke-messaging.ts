/**
 * Smoke test end-to-end de la messagerie contre le serveur local
 * (qui pointe sur la vraie base eu-central-1). Crée 2 users + 1 conversation,
 * exerce les endpoints, nettoie tout à la fin.
 *
 *   1) démarrer l'API :  npx tsx --env-file=.env src/server.ts
 *   2) dans un autre shell :  npx tsx --env-file=.env <path>/smoke-messaging.ts
 */
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const BASE = 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();
const SECRET = process.env.JWT_ACCESS_SECRET!;

const tag = `smoke_${randomUUID().slice(0, 8)}`;
let ok = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${extra ? '  — ' + extra : ''}`);
  cond ? ok++ : fail++;
}

async function api(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* */ }
  return { status: res.status, json: json as any };
}

async function main() {
  const a = await prisma.user.create({ data: { email: `${tag}_a@atc.local`, name: 'Smoke A', initials: 'SA', level: 3 } });
  const b = await prisma.user.create({ data: { email: `${tag}_b@atc.local`, name: 'Smoke B', initials: 'SB', level: 3 } });
  const c = await prisma.user.create({ data: { email: `${tag}_c@atc.local`, name: 'Smoke C', initials: 'SC', level: 3 } });
  const conv = await prisma.conversation.create({
    data: { participants: { create: [{ userId: a.id }, { userId: b.id }] } },
  });

  const tokA = jwt.sign({ sub: a.id }, SECRET, { expiresIn: '5m' });
  const tokB = jwt.sign({ sub: b.id }, SECRET, { expiresIn: '5m' });
  const tokC = jwt.sign({ sub: c.id }, SECRET, { expiresIn: '5m' });

  try {
    // ACL : C n'est pas participant
    check('GET /conversations/:id refusé pour non-participant', (await api(tokC, 'GET', `/conversations/${conv.id}`)).status === 404);
    check('POST message refusé pour non-participant', (await api(tokC, 'POST', `/conversations/${conv.id}/messages`, { body: 'hack' })).status === 404);

    // A envoie
    const send1 = await api(tokA, 'POST', `/conversations/${conv.id}/messages`, { body: '  Salut Sarah  ' });
    check('POST message A -> 201', send1.status === 201);
    check('body trimé', send1.json?.body === 'Salut Sarah', JSON.stringify(send1.json?.body));

    // Validation Zod
    check('POST message vide -> 400', (await api(tokA, 'POST', `/conversations/${conv.id}/messages`, { body: '   ' })).status === 400);
    check('POST message > 2000 -> 400', (await api(tokA, 'POST', `/conversations/${conv.id}/messages`, { body: 'x'.repeat(2001) })).status === 400);

    // B envoie
    await api(tokB, 'POST', `/conversations/${conv.id}/messages`, { body: 'Coucou' });

    // B liste : voit 2 messages, non-lus depuis son point de vue = 0 (il a lu en envoyant)
    const msgsB = await api(tokB, 'GET', `/conversations/${conv.id}/messages`);
    check('GET messages -> 200, 2 messages, ordre chrono', msgsB.status === 200 && msgsB.json?.data?.length === 2 && msgsB.json.data[0].body === 'Salut Sarah');

    // A liste ses conversations : unread = 1 (le "Coucou" de B)
    const convsA = await api(tokA, 'GET', '/conversations');
    const row = convsA.json?.find((x: any) => x.id === conv.id);
    check('GET /conversations : unread=1 pour A', row?.unread === 1, `unread=${row?.unread}`);
    check('GET /conversations : otherUser = B', row?.otherUser?.id === b.id);
    check('GET /conversations : lastMessage = "Coucou"', row?.lastMessage?.body === 'Coucou');

    // A marque lu
    check('POST /read -> 200', (await api(tokA, 'POST', `/conversations/${conv.id}/read`)).status === 200);
    const convsA2 = await api(tokA, 'GET', '/conversations');
    check('unread repasse à 0 après /read', convsA2.json?.find((x: any) => x.id === conv.id)?.unread === 0);

    // readAt posé sur le message de B
    const msgsA = await api(tokA, 'GET', `/conversations/${conv.id}/messages`);
    const coucou = msgsA.json?.data?.find((m: any) => m.body === 'Coucou');
    check('readAt posé sur le message lu', coucou?.readAt != null);

    // unread-count global
    const uc = await api(tokB, 'GET', '/conversations/unread-count');
    check('GET /unread-count -> 200', uc.status === 200 && typeof uc.json?.unread === 'number');

    // push : endpoint clé publique
    const vk = await fetch(`${BASE}/push/vapid-public-key`).then((r) => r.json());
    check('GET /push/vapid-public-key', typeof vk.key === 'string' && vk.key.length > 20);

    // push : subscribe (nécessite la table PushSubscription)
    const sub = await api(tokA, 'POST', '/push/subscribe', {
      endpoint: `https://example.com/push/${tag}`,
      keys: { p256dh: 'BOnSbBP0test', auth: 'authtest123' },
    });
    check('POST /push/subscribe -> 201 (table existe)', sub.status === 201, `status=${sub.status}`);
    if (sub.status === 201) {
      const n = await prisma.pushSubscription.count({ where: { endpoint: `https://example.com/push/${tag}` } });
      check('abonnement enregistré en base', n === 1);
      await api(tokA, 'POST', '/push/unsubscribe', { endpoint: `https://example.com/push/${tag}` });
      check('unsubscribe supprime', (await prisma.pushSubscription.count({ where: { endpoint: `https://example.com/push/${tag}` } })) === 0);
    }
  } finally {
    await prisma.pushSubscription.deleteMany({ where: { userId: { in: [a.id, b.id, c.id] } } }).catch(() => {});
    await prisma.message.deleteMany({ where: { conversationId: conv.id } });
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [a.id, b.id, c.id] } } });
    await prisma.$disconnect();
  }

  console.log(`\n${ok} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
