/**
 * Génère N rounds de matchs aléatoires entre les joueurs existants.
 * Usage : npx tsx prisma/extra-matches.ts [rounds]
 */
import { PrismaClient } from '@prisma/client';
import { computeElo, ratingToLevel } from '../src/modules/matches/elo.js';

const prisma = new PrismaClient();

const COURTS = ['Court Central', 'Court 2', 'Court 3', 'Court Annexe', 'Court Extérieur'];
const TYPES  = ['simple', 'simple', 'simple', 'double', 'mixte'];
const ROUNDS = parseInt(process.argv[2] ?? '10', 10);

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hostWinsRoll(ratingHost: number, ratingGuest: number): boolean {
  const expected = 1 / (1 + Math.pow(10, (ratingGuest - ratingHost) / 400));
  return Math.random() < expected;
}

function randomSetScore(winnerFirst: boolean): string {
  const patterns = ['6-0','6-1','6-2','6-3','6-4','7-5','7-6'];
  const weights  = [1, 2, 3, 4, 5, 3, 2];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < patterns.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const [w, l] = patterns[i].split('-');
      return winnerFirst ? `${w}-${l}` : `${l}-${w}`;
    }
  }
  return winnerFirst ? '6-3' : '3-6';
}

function generateScores(numSets: number, hostWins: boolean) {
  const goesToThree = numSets === 3 && Math.random() > 0.5;
  const sets: string[] = [];
  if (!goesToThree) {
    sets.push(randomSetScore(hostWins));
    sets.push(randomSetScore(hostWins));
  } else {
    const loserWinsSet1 = Math.random() > 0.5;
    sets.push(randomSetScore(loserWinsSet1 ? !hostWins : hostWins));
    sets.push(randomSetScore(loserWinsSet1 ?  hostWins : !hostWins));
    sets.push(randomSetScore(hostWins));
  }
  const scoreHost  = sets.join(' ');
  const scoreGuest = sets.map(s => s.split('-').reverse().join('-')).join(' ');
  return { scoreHost, scoreGuest };
}

function randomPastDate(maxDaysAgo = 90) {
  const daysAgo = randBetween(1, maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randBetween(8, 20), 0, 0, 0);
  return d;
}

// Shuffle en place
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  console.log(`🎾 Génération de ${ROUNDS} rounds supplémentaires…`);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, rating: true, ratingGames: true, bestRanking: true, ratingDelta: true },
  });

  const ratings: Record<string, { rating: number; games: number; bestRanking: number | null; lastDelta: number }> = {};
  for (const u of users) {
    ratings[u.id] = { rating: u.rating, games: u.ratingGames, bestRanking: u.bestRanking, lastDelta: u.ratingDelta };
  }

  let totalMatches = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    // Appariements aléatoires : chaque joueur joue 1 match par round
    const ids = shuffle(users.map(u => u.id));
    const pairs: [string, string][] = [];
    for (let i = 0; i < ids.length - 1; i += 2) {
      pairs.push([ids[i], ids[i + 1]]);
    }

    for (const [hostId, guestId] of pairs) {
      const rH = ratings[hostId];
      const rG = ratings[guestId];

      const hostWins = hostWinsRoll(rH.rating, rG.rating);
      const numSets  = rand([2, 2, 3]);
      const { scoreHost, scoreGuest } = generateScores(numSets, hostWins);
      const winnerId = hostWins ? hostId : guestId;

      await prisma.match.create({
        data: {
          hostId, guestId,
          playedAt:   randomPastDate(60),
          court:      rand(COURTS),
          type:       rand(TYPES),
          scoreHost, scoreGuest, winnerId,
          status:     'confirmed',
          recordedBy: winnerId,
        },
      });

      // ELO en mémoire
      const hResult = computeElo(rH.rating, rH.games, rG.rating, hostWins);
      const gResult = computeElo(rG.rating, rG.games, rH.rating, !hostWins);

      ratings[hostId]  = { rating: hResult.newRating, games: rH.games + 1, bestRanking: rH.bestRanking, lastDelta: hResult.delta };
      ratings[guestId] = { rating: gResult.newRating, games: rG.games + 1, bestRanking: rG.bestRanking, lastDelta: gResult.delta };

      totalMatches++;
    }
  }

  // Mise à jour BDD + bestRanking
  console.log('📊 Mise à jour ratings et bestRanking…');
  const sorted = Object.entries(ratings)
    .sort(([, a], [, b]) => b.rating - a.rating);

  await Promise.all(
    users.map(u => {
      const r = ratings[u.id];
      const newRank = sorted.findIndex(([id]) => id === u.id) + 1;
      const newBest = r.bestRanking === null || newRank < r.bestRanking ? newRank : r.bestRanking;
      return prisma.user.update({
        where: { id: u.id },
        data: {
          rating:      r.rating,
          ratingGames: r.games,
          ratingDelta: r.lastDelta,
          level:       ratingToLevel(r.rating),
          bestRanking: newBest,
        },
      });
    })
  );

  console.log(`✅ ${totalMatches} matchs ajoutés`);
  console.log('');
  console.log('📋 Classement final :');
  for (const [id, r] of sorted) {
    const u = users.find(u => u.id === id)!;
    const rank = sorted.findIndex(([i]) => i === id) + 1;
    console.log(`  #${String(rank).padStart(2)} ${u.name.padEnd(25)} ${r.rating} pts  (${r.games} matchs)`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
