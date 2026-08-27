import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { initialRating } from '../matches/elo.js';
import { assertValidClub } from '../reference/reference.service.js';
import { sendWelcome } from '../mailer/mailer.service.js';
import type { SignupDto, LoginDto } from './auth.schema.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as string;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as string;

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
    select: { id: true, name: true, email: true, initials: true, level: true },
  });

  sendWelcome(user.email, user.name);

  const tokens = generateTokens(user.id);
  return { user, ...tokens };
}

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new AppError(401, 'Email ou mot de passe incorrect');

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Email ou mot de passe incorrect');

  const tokens = generateTokens(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email, initials: user.initials, level: user.level },
    ...tokens,
  };
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
      club: { select: { id: true, slug: true, name: true, zone: true, location: true } },
    },
  });
  if (!user) throw new AppError(404, 'Utilisateur introuvable');
  return user;
}
