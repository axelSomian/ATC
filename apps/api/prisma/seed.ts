/**
 * Seed : 20 joueurs ATC + matchs simulés avec ELO réel.
 * Usage : npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computeElo, ratingToLevel } from '../src/modules/matches/elo.js';

const prisma = new PrismaClient();

// ── Données des joueurs ──────────────────────────────────────────────────────

const PLAYERS: { name: string; level: number; city: string }[] = [
  { name: 'Konan Yao',          level: 5, city: 'Cocody' },
  { name: 'Aya Kouassi',        level: 4, city: 'Plateau' },
  { name: 'Koffi Assoumou',     level: 4, city: 'Riviera' },
  { name: 'Adjoua Brou',        level: 3, city: 'Marcory' },
  { name: 'Kouame Ettien',      level: 5, city: 'II Plateaux' },
  { name: 'Amenan Soro',        level: 3, city: 'Yopougon' },
  { name: 'Gnagne Tape',        level: 2, city: 'Cocody' },
  { name: 'Akissi Daho',        level: 2, city: 'Plateau' },
  { name: 'Yao Amoikon',        level: 4, city: 'Riviera' },
  { name: 'Mawa Coulibaly',     level: 3, city: 'Marcory' },
  { name: 'Brou Yoboue',        level: 1, city: 'Abobo' },
  { name: 'Edwige Gnagne',      level: 2, city: 'Yopougon' },
  { name: 'Mamadou Traore',     level: 5, city: 'Cocody' },
  { name: 'Fatou Diallo',       level: 3, city: 'Riviera' },
  { name: 'Olivier Ehui',       level: 4, city: 'II Plateaux' },
  { name: 'Marina Kone',        level: 1, city: 'Koumassi' },
  { name: 'Pascal Niamke',      level: 3, city: 'Plateau' },
  { name: 'Sylvie Assi',        level: 2, city: 'Treichville' },
  { name: 'Rodrigue Ble',       level: 4, city: 'Cocody' },
  { name: 'Christelle Ouattara',level: 1, city: 'Marcory' },
];

// Noms alignés sur le catalogue de terrains (migration 20260829130000_courts)
// pour que la carte fonctionne sur les matchs de démo.
const COURTS = ['Club Ivoire', 'Plateau Tennis Club', 'INSEP', 'Cocody', 'Riviera'];
const TYPES  = ['simple', 'simple', 'simple', 'double', 'mixte'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Victoire probabiliste basée sur le rating ELO actuel
function hostWinsRoll(ratingHost: number, ratingGuest: number): boolean {
  const expected = 1 / (1 + Math.pow(10, (ratingGuest - ratingHost) / 400));
  return Math.random() < expected;
}

// Génère un score de set réaliste (ex: "6-3")
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

// Génère scoreHost / scoreGuest.
// Tennis best-of-3 : 2-0 (2 sets) ou 2-1 (3 sets). Jamais 1-1.
function generateScores(numSets: number, hostWins: boolean) {
  // numSets = 2 → toujours 2-0 | numSets = 3 → 50% 2-0, 50% 2-1
  const goesToThree = numSets === 3 && Math.random() > 0.5;
  const sets: string[] = []; // chaque entrée = "scoreHost-scoreGuest"

  if (!goesToThree) {
    // Vainqueur remporte les deux sets
    sets.push(randomSetScore(hostWins));
    sets.push(randomSetScore(hostWins));
  } else {
    // Le perdant gagne un set (set 1 ou set 2, aléatoire)
    const loserWinsSet1 = Math.random() > 0.5;
    sets.push(randomSetScore(loserWinsSet1 ? !hostWins : hostWins));
    sets.push(randomSetScore(loserWinsSet1 ?  hostWins : !hostWins));
    // Set décisif toujours remporté par le vainqueur
    sets.push(randomSetScore(hostWins));
  }

  const scoreHost  = sets.join(' ');
  const scoreGuest = sets.map(s => s.split('-').reverse().join('-')).join(' ');
  return { scoreHost, scoreGuest };
}

// Génère une date aléatoire dans les 90 derniers jours
function randomPastDate() {
  const daysAgo = randBetween(1, 90);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randBetween(8, 20), 0, 0, 0);
  return d;
}

// ── Seed principal ───────────────────────────────────────────────────────────

async function main() {
  console.log('🎾 Seed ATC démarré…');

  // 1. Hash du mot de passe commun
  const passwordHash = await bcrypt.hash('12345678', 12);
  console.log('🔑 Password hashé');

  // 2. Créer les 20 joueurs
  const users = await Promise.all(
    PLAYERS.map((p, i) =>
      prisma.user.create({
        data: {
          email:        `user${i + 1}@atc.ci`,
          name:         p.name,
          initials:     initials(p.name),
          passwordHash,
          level:        p.level,
          city:         p.city,
          rating:       1000,
          ratingGames:  0,
        },
      })
    )
  );
  console.log(`👥 ${users.length} joueurs créés`);

  // 3. Générer toutes les paires (round-robin complet)
  const pairs: [number, number][] = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      pairs.push([i, j]);
    }
  }
  // Mélanger les paires pour un ordre aléatoire
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  console.log(`🎲 ${pairs.length} matchs à simuler…`);

  // Rating en mémoire (évite N+1 queries)
  const ratings: Record<string, { rating: number; games: number; delta: number }> = {};
  for (const u of users) {
    ratings[u.id] = { rating: 1000, games: 0, delta: 0 };
  }

  // 4. Simuler chaque match
  let matchCount = 0;
  for (const [hi, gi] of pairs) {
    const host  = users[hi];
    const guest = users[gi];
    const rH = ratings[host.id];
    const rG = ratings[guest.id];

    const hostWins = hostWinsRoll(rH.rating, rG.rating);
    const numSets  = rand([2, 2, 3]); // majoritairement 2 sets
    const { scoreHost, scoreGuest } = generateScores(numSets, hostWins);
    const winnerId = hostWins ? host.id : guest.id;

    await prisma.match.create({
      data: {
        hostId:     host.id,
        guestId:    guest.id,
        playedAt:   randomPastDate(),
        court:      rand(COURTS),
        type:       rand(TYPES),
        scoreHost,
        scoreGuest,
        winnerId,
        status:     'confirmed',
        recordedBy: hostWins ? host.id : guest.id,
      },
    });

    // Appliquer ELO en mémoire
    const hResult = computeElo(rH.rating, rH.games, rG.rating, hostWins);
    const gResult = computeElo(rG.rating, rG.games, rH.rating, !hostWins);

    ratings[host.id]  = { rating: hResult.newRating, games: rH.games + 1, delta: hResult.delta };
    ratings[guest.id] = { rating: gResult.newRating, games: rG.games + 1, delta: gResult.delta };

    matchCount++;
  }

  // 5. Mettre à jour tous les ratings et levels en base
  console.log('📊 Mise à jour des ratings…');
  await Promise.all(
    users.map(u =>
      prisma.user.update({
        where: { id: u.id },
        data: {
          rating:      ratings[u.id].rating,
          ratingGames: ratings[u.id].games,
          ratingDelta: ratings[u.id].delta,
          level:       ratingToLevel(ratings[u.id].rating),
        },
      })
    )
  );

  console.log(`✅ ${matchCount} matchs créés`);
  console.log('');
  console.log('📋 Classement final :');
  const sorted = users
    .map(u => ({ name: u.name, rating: ratings[u.id].rating, games: ratings[u.id].games }))
    .sort((a, b) => b.rating - a.rating);
  sorted.forEach((p, i) => {
    console.log(`  #${String(i+1).padStart(2)} ${p.name.padEnd(25)} ${p.rating} pts  (${p.games} matchs)`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
