import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { initialRating } from '../matches/elo.js';
import { assertValidClub } from '../reference/reference.service.js';
import { sendWelcome, sendPasswordReset } from '../mailer/mailer.service.js';
import type { SignupDto, LoginDto, GoogleAuthDto } from './auth.schema.js';

const RESET_TTL_MS = 30 * 60 * 1000;
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as string;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as string;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  initials: string;
  level: number;
  role: string;
}

function authUserResponse(u: AuthUserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: u.initials,
    level: u.level,
    role: u.role,
  };
}

function buildInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ sub: userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

function userPublicFields() {
  return {
    id: true,
    name: true,
    initials: true,
    avatarUrl: true,
    level: true,
    city: true,
    online: true,
    joinedAt: true,
  } as const;
}

export async function signup(dto: SignupDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new AppError(409, 'Cet email est déjà utilisé');

  await assertValidClub(dto.clubId);

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const initials = buildInitials(dto.name);

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      level: dto.level,
      city: dto.city,
      clubId: dto.clubId,
      initials,
      rating: initialRating(dto.level),
    },
    select: { id: true, name: true, email: true, initials: true, level: true, role: true },
  });

  sendWelcome(user.email, user.name);

  const tokens = generateTokens(user.id);
  return { user, ...tokens };
}

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new AppError(401, 'Email ou mot de passe incorrect');

  if (!user.passwordHash) {
    throw new AppError(401, 'Ce compte utilise la connexion Google. Cliquez sur « Continuer avec Google ».');
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Email ou mot de passe incorrect');

  const tokens = generateTokens(user.id);
  return { user: authUserResponse(user), ...tokens };
}

export async function loginWithGoogle(dto: GoogleAuthDto) {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new AppError(503, "La connexion Google n'est pas configurée sur le serveur");
  }

  let payload: import('google-auth-library').TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Jeton Google invalide ou expiré');
  }

  if (!payload?.sub || !payload.email) throw new AppError(401, 'Jeton Google invalide');
  if (payload.email_verified === false) throw new AppError(401, 'Adresse Google non vérifiée');

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name?.trim() || email.split('@')[0];
  const picture = payload.picture ?? null;

  // 1. Compte déjà relié à ce Google.
  let user = await prisma.user.findUnique({ where: { googleId } });

  // 2. Sinon, compte existant avec le même email → on relie les deux.
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId, avatarUrl: byEmail.avatarUrl ?? picture },
      });
    }
  }

  // 3. Sinon, création d'un nouveau compte (niveau 1 par défaut, à compléter au profil).
  let isNew = false;
  if (!user) {
    isNew = true;
    user = await prisma.user.create({
      data: {
        email,
        name,
        initials: buildInitials(name),
        googleId,
        avatarUrl: picture,
        level: 1,
        rating: initialRating(1),
      },
    });
    sendWelcome(user.email, user.name);
  }

  const tokens = generateTokens(user.id);
  return { user: authUserResponse(user), isNew, ...tokens };
}

export async function refresh(token: string) {
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, REFRESH_SECRET) as { sub: string };
  } catch {
    throw new AppError(401, 'Token invalide ou expiré');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError(401, 'Utilisateur introuvable');

  return generateTokens(user.id);
}

/**
 * Demande de réinitialisation. Répond toujours sans erreur (on ne révèle pas
 * si l'e-mail existe). N'envoie que si le compte existe ET a un mot de passe
 * (les comptes Google n'en ont pas).
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return;

  // Un seul jeton actif à la fois.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });

  const base = (process.env.CORS_ORIGIN ?? '').replace(/\/$/, '');
  sendPasswordReset(user.email, user.name, `${base}/auth/reset-password?token=${raw}`);
}

/** Applique le nouveau mot de passe et ouvre une session (comme un login). */
export async function resetPassword(token: string, password: string) {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'Lien invalide ou expiré. Refaites une demande.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  const tokens = generateTokens(row.userId);
  return { user: authUserResponse(row.user), ...tokens };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      initials: true,
      avatarUrl: true,
      level: true,
      age: true,
      bio: true,
      city: true,
      racquet: true,
      preferredCourts: true,
      preferredTimes: true,
      joinedAt: true,
      online: true,
      role: true,
      club: { select: { id: true, slug: true, name: true, zone: true, location: true } },
    },
  });
  if (!user) throw new AppError(404, 'Utilisateur introuvable');
  return user;
}
