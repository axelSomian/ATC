import crypto from 'node:crypto';
import { AppError } from '../../middleware/error.js';

export const CURRENT_SEASON = '2026';
const DECOUVERTE_VALIDITY_DAYS = 90;

// Grille officielle Licence-Assurance FIT 2026 (Commission des Licences,
// doc fédération nov. 2026). La catégorie n'est jamais choisie librement par
// l'usager : elle est déduite du profil déclaré + de la date de naissance
// (« champ verrou »). Assurance incluse dans toutes les catégories.
export type LicenceProfile = 'joueur' | 'coach' | 'ecole' | 'decouverte';
export type LicenceCategory =
  | 'adulte'
  | 'jeunes'
  | 'coach'
  | 'ecole'
  | 'decouverte_jeunes'
  | 'decouverte_adultes';

export interface LicenceQuote {
  category: LicenceCategory;
  label: string;
  amount: number;
  validity: string;
}

/** Ordre d'affichage canonique des 6 catégories — réutilisé par l'admin et par le filtre de tournoi. */
export const LICENCE_CATEGORIES: LicenceCategory[] = [
  'adulte', 'jeunes', 'decouverte_adultes', 'decouverte_jeunes', 'ecole', 'coach',
];

const LABELS: Record<LicenceCategory, string> = {
  adulte: 'Adulte',
  jeunes: 'Jeunes',
  coach: 'Coach',
  ecole: 'Enfants – École de tennis',
  decouverte_jeunes: 'Découverte – Jeunes',
  decouverte_adultes: 'Découverte – Adultes',
};

export function ageAt(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear();
  const m = at.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birthDate.getDate())) age--;
  return age;
}

export function assertPlausibleBirthDate(birthDate: Date): void {
  const age = ageAt(birthDate);
  if (birthDate > new Date() || age > 100) {
    throw new AppError(400, 'Date de naissance invalide');
  }
}

/**
 * Déduit la catégorie (donc le tarif et la validité) de la grille FIT 2026 à
 * partir du profil déclaré par l'usager et de son âge. Seul le champ « Coach »
 * et « École » sont des déclarations (contrôlées a posteriori par la liste du
 * club, cf. doc fédération § 3) — l'âge reste la règle qui tranche sinon.
 */
export function resolveLicenceCategory(profile: LicenceProfile, birthDate: Date): LicenceQuote {
  assertPlausibleBirthDate(birthDate);
  const age = ageAt(birthDate);

  if (profile === 'coach') {
    return { category: 'coach', label: LABELS.coach, amount: 20000, validity: '1 an à partir du paiement' };
  }

  if (profile === 'ecole') {
    if (age > 14) {
      throw new AppError(400, 'La catégorie "Enfants – École de tennis" est réservée aux 14 ans et moins');
    }
    return { category: 'ecole', label: LABELS.ecole, amount: 1500, validity: '1 an à partir du paiement' };
  }

  if (profile === 'decouverte') {
    return age <= 18
      ? { category: 'decouverte_jeunes', label: LABELS.decouverte_jeunes, amount: 2500, validity: '3 mois (1 fois par saison)' }
      : { category: 'decouverte_adultes', label: LABELS.decouverte_adultes, amount: 10000, validity: '3 mois (1 fois par saison)' };
  }

  // profil === 'joueur' — licence complète, selon l'âge
  return age <= 18
    ? { category: 'jeunes', label: LABELS.jeunes, amount: 5000, validity: '1 an à partir du paiement' }
    : { category: 'adulte', label: LABELS.adulte, amount: 36000, validity: '1 an à partir du paiement' };
}

export function categoryLabel(category: LicenceCategory): string {
  return LABELS[category];
}

/** Découverte = 3 mois glissants depuis le paiement ; les autres catégories = 1 an glissant depuis le paiement. */
export function computeExpiresAt(category: LicenceCategory, paidAt: Date): Date {
  if (category === 'decouverte_jeunes' || category === 'decouverte_adultes') {
    return new Date(paidAt.getTime() + DECOUVERTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  }
  const expiresAt = new Date(paidAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  return expiresAt;
}

/** Numéro de licence lisible par un humain (affiché sur le document) — jamais utilisé pour l'authentification. */
export function generateLicenceNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I — moins d'ambiguïté à la lecture
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return `FIT-${CURRENT_SEASON}-${code}`;
}

/** Jeton opaque, haute entropie — seul identifiant encodé dans le QR / l'URL de vérification. */
export function generateVerificationCode(): string {
  return crypto.randomBytes(20).toString('hex');
}
