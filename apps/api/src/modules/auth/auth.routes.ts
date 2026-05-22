import { Router } from 'express';
import { ZodError } from 'zod';
import { signup, login, refresh, getMe } from './auth.service.js';
import { signupSchema, loginSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const dto = signupSchema.parse(req.body);
    const result = await signup(dto);
    res.cookie('refreshToken', result.refreshToken, cookieOptions());
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await login(dto);
    res.cookie('refreshToken', result.refreshToken, cookieOptions());
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token: string | undefined = req.cookies?.refreshToken;
    if (!token) throw new AppError(401, 'Aucun refresh token');
    const tokens = await refresh(token);
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions());
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ message: 'Déconnecté' });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getMe((req.user as { id: string }).id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export default router;
