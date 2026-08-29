/**
 * Club = unique entité « lieu » de l'appli (fusion avec l'ancienne table Court).
 * Sert d'appartenance des membres, d'annuaire, et de lieu de jeu (carte).
 */
export interface ClubRef {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
  /** Photo du club (Cloudinary) — null/absent = placeholder. */
  imageUrl?: string | null;
  /** Position du lieu de jeu (carte). */
  lat?: number | null;
  lng?: number | null;
  /** Nombre de membres rattachés (renvoyé par GET /api/v1/clubs). */
  memberCount?: number;
}

/** Fiche club complète — GET /api/v1/clubs/:slug. */
export interface ClubDetail extends ClubRef {
  address: string | null;
  description: string | null;
  feesInfo: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  memberCount: number;
}

/** Niveau tel que stocké en base (éditable par un admin). */
export interface LevelRef {
  level: number; // 1..5
  code: string; // 'N1'..'N5'
  nom: string;
  profil: string;
  jeu: string;
}
