-- Messagerie : 1 conversation = 1 relation entre DEUX joueurs (et non 1 par match).
-- On ajoute `pairKey` (les 2 userId triés, joints par ':'), on fusionne les
-- conversations en double d'une même paire (la plus ancienne gagne), puis on
-- retire les liens 1:1 vers DispoPost / QuickMatch.

-- 1. Nouvelle colonne, d'abord nullable le temps du backfill.
ALTER TABLE "Conversation" ADD COLUMN "pairKey" TEXT;

-- 2. Backfill : clé = userId des participants triés puis joints par ':'.
UPDATE "Conversation" c
SET "pairKey" = sub.k
FROM (
  SELECT p."conversationId" AS cid,
         string_agg(p."userId", ':' ORDER BY p."userId") AS k
  FROM "ConversationParticipant" p
  GROUP BY p."conversationId"
) sub
WHERE c.id = sub.cid;

-- 3. Pour chaque paire, on garde la conversation la plus ancienne (créée en 1er).
CREATE TEMP TABLE conv_merge AS
SELECT c.id AS dup_id,
       first_value(c.id) OVER (
         PARTITION BY c."pairKey" ORDER BY c."createdAt", c.id
       ) AS keep_id
FROM "Conversation" c
WHERE c."pairKey" IS NOT NULL;

-- 4. Les messages des doublons sont rattachés à la conversation conservée.
UPDATE "Message" m
SET "conversationId" = cm.keep_id
FROM conv_merge cm
WHERE m."conversationId" = cm.dup_id
  AND cm.dup_id <> cm.keep_id;

-- 5. lastReadAt du survivant = le plus ancien des lastReadAt fusionnés
--    (ne jamais masquer de messages non lus).
UPDATE "ConversationParticipant" kp
SET "lastReadAt" = LEAST(kp."lastReadAt", agg.min_read)
FROM (
  SELECT cm.keep_id, p."userId", MIN(p."lastReadAt") AS min_read
  FROM "ConversationParticipant" p
  JOIN conv_merge cm ON cm.dup_id = p."conversationId"
  GROUP BY cm.keep_id, p."userId"
) agg
WHERE kp."conversationId" = agg.keep_id
  AND kp."userId" = agg."userId";

-- 6. Suppression des doublons (participants puis conversations).
DELETE FROM "ConversationParticipant" p
USING conv_merge cm
WHERE p."conversationId" = cm.dup_id
  AND cm.dup_id <> cm.keep_id;

DELETE FROM "Conversation" c
USING conv_merge cm
WHERE c.id = cm.dup_id
  AND cm.dup_id <> cm.keep_id;

-- 7. Conversations orphelines (0 ou 1 participant) → on nettoie.
DELETE FROM "Message" m
USING "Conversation" c
WHERE m."conversationId" = c.id AND c."pairKey" IS NULL;

DELETE FROM "ConversationParticipant" p
USING "Conversation" c
WHERE p."conversationId" = c.id AND c."pairKey" IS NULL;

DELETE FROM "Conversation" WHERE "pairKey" IS NULL;

-- 8. Recalcul de lastMessageAt sur les survivants (messages fusionnés).
UPDATE "Conversation" c
SET "lastMessageAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "Message" m WHERE m."conversationId" = c.id),
  c."createdAt"
);

-- 9. Retrait des liens 1:1 vers l'entité d'appariement.
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_dispoPostId_fkey";
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_quickMatchId_fkey";
DROP INDEX IF EXISTS "Conversation_dispoPostId_key";
DROP INDEX IF EXISTS "Conversation_quickMatchId_key";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "dispoPostId";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "quickMatchId";

-- 10. Contrainte finale : pairKey obligatoire et unique.
ALTER TABLE "Conversation" ALTER COLUMN "pairKey" SET NOT NULL;
CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");
