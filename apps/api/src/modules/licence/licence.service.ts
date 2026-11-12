import QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { uploadImage } from '../../lib/cloudinary.js';
import {
  CURRENT_SEASON,
  categoryLabel,
  computeExpiresAt,
  generateLicenceNumber,
  generateVerificationCode,
  resolveLicenceCategory,
} from './licence.rules.js';
import type { PayLicenceDto, QuoteLicenceDto } from './licence.schema.js';

// Aucun prestataire de paiement réel n'est branché : ce module simule la
// transaction pour le MVP de démonstration. La grille tarifaire, elle, est
// la vraie grille FIT 2026 (voir licence.rules.ts).
export { CURRENT_SEASON };

function verifyUrl(code: string): string {
  const base = (process.env.CORS_ORIGIN ?? '').replace(/\/$/, '');
  return `${base}/licence/verifier/${code}`;
}

async function withQrCode<T extends { verificationCode: string }>(licence: T) {
  const qrCode = await QRCode.toDataURL(verifyUrl(licence.verificationCode), {
    margin: 1,
    width: 360,
    color: { dark: '#10243D', light: '#F4F5F1' },
  });
  return { ...licence, qrCode, verifyUrl: verifyUrl(licence.verificationCode) };
}

export async function getMyLicence(userId: string) {
  const licence = await prisma.licence.findUnique({
    where: { userId_season: { userId, season: CURRENT_SEASON } },
  });
  if (!licence) return { season: CURRENT_SEASON, active: false as const };

  return withQrCode({
    season: CURRENT_SEASON,
    active: true as const,
    licenceNumber: licence.licenceNumber,
    category: licence.category,
    categoryLabel: categoryLabel(licence.category as Parameters<typeof categoryLabel>[0]),
    disciplines: licence.disciplines,
    cniUrl: licence.cniUrl,
    photoUrl: licence.photoUrl,
    amount: licence.amount,
    paidAt: licence.paidAt,
    expiresAt: licence.expiresAt,
    verificationCode: licence.verificationCode,
  });
}

export function quoteLicence(dto: QuoteLicenceDto) {
  return resolveLicenceCategory(dto.profile, dto.birthDate);
}

export async function payMyLicence(
  userId: string,
  dto: PayLicenceDto,
  cniBuffer: Buffer,
  photoBuffer: Buffer,
) {
  const quote = resolveLicenceCategory(dto.profile, dto.birthDate);
  const paidAt = new Date();
  const expiresAt = computeExpiresAt(quote.category, paidAt);

  const [cniUrl, photoUrl] = await Promise.all([
    uploadImage(cniBuffer, {
      folder: 'atc/licences',
      publicId: `${userId}_${CURRENT_SEASON}_cni`,
      transformation: [{ width: 1400, crop: 'limit' }],
    }),
    uploadImage(photoBuffer, {
      folder: 'atc/licences',
      publicId: `${userId}_${CURRENT_SEASON}_photo`,
      transformation: [{ width: 600, height: 600, crop: 'fill', gravity: 'face' }],
    }),
  ]);

  const existing = await prisma.licence.findUnique({
    where: { userId_season: { userId, season: CURRENT_SEASON } },
    select: { licenceNumber: true, verificationCode: true },
  });

  const common = {
    category: quote.category,
    disciplines: dto.disciplines,
    birthDate: dto.birthDate,
    birthPlace: dto.birthPlace,
    cniUrl,
    photoUrl,
    amount: quote.amount,
    paidAt,
    expiresAt,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.licence.upsert({
        where: { userId_season: { userId, season: CURRENT_SEASON } },
        create: {
          userId,
          season: CURRENT_SEASON,
          licenceNumber: existing?.licenceNumber ?? generateLicenceNumber(),
          verificationCode: existing?.verificationCode ?? generateVerificationCode(),
          ...common,
        },
        update: common,
      });
      return getMyLicence(userId);
    } catch (err) {
      // Collision (très improbable) sur licenceNumber/verificationCode — on réessaie avec de nouvelles valeurs.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && !existing) {
        continue;
      }
      throw err;
    }
  }
  throw new AppError(500, "Impossible de générer un numéro de licence unique, réessaie.");
}

/** Vérification publique d'un document (scan QR) — aucune donnée sensible (CNI, photo) exposée. */
export async function verifyLicence(code: string) {
  const licence = await prisma.licence.findUnique({
    where: { verificationCode: code },
    include: { user: { select: { name: true } } },
  });
  if (!licence) throw new AppError(404, 'Document introuvable ou invalide');

  return {
    valid: true,
    licenceNumber: licence.licenceNumber,
    holderName: licence.user.name,
    category: licence.category,
    categoryLabel: categoryLabel(licence.category as Parameters<typeof categoryLabel>[0]),
    disciplines: licence.disciplines,
    season: licence.season,
    expiresAt: licence.expiresAt,
    status: licence.expiresAt > new Date() ? ('active' as const) : ('expired' as const),
  };
}
