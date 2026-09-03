import { Router } from 'express';
import { ZodError } from 'zod';
import {
  signup, login, loginWithGoogle, refresh, getMe,
  requestPasswordReset, resetPassword,
} from './auth.service.js';
import {
  signupSchema, loginSchema, googleAuthSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from './auth.schema.js';
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

router.post('/google', async (req, res, next) => {
  try {
    const dto = googleAuthSchema.parse(req.body);
    const result = await loginWithGoogle(dto);
    res.cookie('refreshToken', result.refreshToken, cookieOptions());
    res.status(result.isNew ? 201 : 200).json({
      user: result.user,
      accessToken: result.accessToken,
      isNew: result.isNew,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(email);
    // Réponse identique que l'e-mail existe ou non.
    res.json({ message: "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé." });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(token, password);
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
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    // En prod le front (Vercel) appelle l'API via un "rewrite" same-origin :
    // 'lax' suffit et évite les rejets de cookie sur navigation.
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export default router;
