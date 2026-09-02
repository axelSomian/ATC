export type PostCategory = 'tournoi' | 'evenement' | 'partenariat' | 'infos_tennis' | 'atc';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'tournoi', label: 'Tournois' },
  { value: 'evenement', label: 'Événements' },
  { value: 'partenariat', label: 'Partenariats' },
  { value: 'infos_tennis', label: 'Infos Tennis' },
  { value: 'atc', label: 'ATC' },
];

export const POST_STATUSES: { value: PostStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Programmé' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
];

/** Carte du feed / à la une (sans le corps). */
export interface PostCard {
  id: string;
  slug: string;
  category: PostCategory;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  date: string;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  promoCode: string | null;
  featured: boolean;
}

export interface PostDetail extends PostCard {
  body: string;
  bodyHtml: string;
  gallery: string[];
  source: string | null;
}

export interface PostFeed {
  data: PostCard[];
  nextCursor: string | null;
}

/** Publication complète côté admin (corps = markdown brut). */
export interface AdminPost {
  id: string;
  category: PostCategory;
  status: PostStatus;
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  gallery: string[];
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  featured: boolean;
  featuredOrder: number | null;
  promoCode: string | null;
  source: string | null;
  notifyOnPublish: boolean;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RssFeed {
  id: string;
  url: string;
  label: string;
  autoPublish: boolean;
  active: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface AdminPostPayload {
  category: PostCategory;
  status: PostStatus;
  title: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  gallery: string[];
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  featured: boolean;
  featuredOrder: number | null;
  promoCode: string | null;
  source: string | null;
  notifyOnPublish: boolean;
}
