export enum UserLevel {
  Debutant = 1,
  Intermediaire = 2,
  Confirme = 3,
  Avance = 4,
  Expert = 5,
}

export enum MatchType {
  Simple = 'simple',
  Double = 'double',
  Mixte = 'mixte',
}

export enum MatchRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
}

export enum AvailabilityStatus {
  Free = 'free',
  Busy = 'busy',
  Matched = 'matched',
}

export enum NotificationType {
  MatchRequest = 'match_request',
  MatchConfirmed = 'match_confirmed',
  News = 'news',
}

export const CITIES_CI = [
  'Abidjan - Plateau',
  'Abidjan - Cocody',
  'Abidjan - Yopougon',
  'Abidjan - Treichville',
  'Abidjan - Marcory',
  'Abidjan - Koumassi',
  'Abidjan - Abobo',
  'Abidjan - Riviera',
  'Abidjan - II Plateaux',
  'Bouaké',
  'Yamoussoukro',
  'San-Pédro',
] as const;

export type CityCI = (typeof CITIES_CI)[number];
