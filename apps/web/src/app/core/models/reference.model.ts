/** Club renvoyé par l'API (relation User.club). */
export interface ClubRef {
  id: string;
  slug: string;
  name: string;
  zone: string;
  location: string;
}

/** Niveau tel que stocké en base (éditable par un admin). */
export interface LevelRef {
  level: number; // 1..5
  code: string; // 'N1'..'N5'
  nom: string;
  profil: string;
  jeu: string;
}
