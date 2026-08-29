/** Club renvoyé par l'API (relation User.club). */
export interface ClubRef {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
  /** Photo du club (Cloudinary) — null/absent = placeholder. */
  imageUrl?: string | null;
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
  memberCount: number;
}

/** Terrain / lieu de jeu (éditable par un admin), pour les sélecteurs et la carte. */
export interface CourtRef {
  id: string;
  slug: string;
  name: string;
  zone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

/** Niveau tel que stocké en base (éditable par un admin). */
export interface LevelRef {
  level: number; // 1..5
  code: string; // 'N1'..'N5'
  nom: string;
  profil: string;
  jeu: string;
}
