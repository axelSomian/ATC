/** Club renvoyé par l'API (relation User.club). */
export interface ClubRef {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
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
