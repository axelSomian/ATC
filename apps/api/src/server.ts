import './lib/sentry.js'; // init Sentry avant tout le reste
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { log } from './lib/logger.js';
import { captureError } from './lib/sentry.js';
import { prisma } from './lib/prisma.js';
import { requestLog, getLastActivityAt } from './middleware/request-log.js';
import { errorHandler } from './middleware/error.js';
import './middleware/passport.js';
import { setIo, handlePresence, resetPresence, setSocketConversation } from './lib/socket.js';
import './lib/webpush.js';
import authRoutes from './modules/auth/auth.routes.js';
import membersRoutes from './modules/members/members.routes.js';
import disposRoutes from './modules/dispos/dispos.routes.js';
import matchesRoutes from './modules/matches/matches.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import quickMatchesRoutes from './modules/quick-matches/quick-matches.routes.js';
import referenceRoutes from './modules/reference/reference.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import messagingRoutes from './modules/messaging/messaging.routes.js';
import pushRoutes from './modules/push/push.routes.js';
import { newsPublicRouter, newsAdminRouter, newsSyncRouter } from './modules/news/news.routes.js';

const app = express();
// Derrière le proxy Render (et Vercel) : faire confiance au 1er hop pour
// que req.ip / X-Forwarded-For soient corrects (rate-limit, secure cookie).
app.set('trust proxy', 1);
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  },
});

setIo(io);

// Auth middleware Socket.IO — vérifie le JWT et joint le room user:{id}
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Non autorisé'));
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

io.engine.on('connection_error', (err: { code: number; message: string }) => {
  log.warn('socket.connection_error', { code: err.code, message: err.message });
});

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  handlePresence(io, socket);

  // Conversation actuellement ouverte à l'écran (règle « push si hors conversation »).
  socket.on('conversation:enter', (id: unknown) => {
    setSocketConversation(socket.id, typeof id === 'string' ? id : null);
  });
  socket.on('conversation:leave', () => setSocketConversation(socket.id, null));
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(requestLog);

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Trop de tentatives, réessayez dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 3_600_000,
  max: 3,
  message: { error: 'Trop de créations de compte, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mot de passe oublié : anti-bombardement d'e-mails.
const resetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  message: { error: 'Trop de demandes, réessayez dans quelques minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/google', loginLimiter);
app.use('/api/v1/auth/signup', signupLimiter);
app.use('/api/v1/auth/forgot-password', resetLimiter);
app.use('/api/v1/auth/reset-password', resetLimiter);
app.use('/api/v1/auth/verify-email', resetLimiter);
app.use('/api/v1/auth/resend-verification', resetLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', referenceRoutes);
app.use('/api/v1/members', membersRoutes);
app.use('/api/v1/dispos', disposRoutes);
app.use('/api/v1/matches', matchesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/quick-matches', quickMatchesRoutes);
app.use('/api/v1/conversations', messagingRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/news/rss', newsSyncRouter);
app.use('/api/v1/news', newsPublicRouter);
app.use('/api/v1/admin/news', newsAdminRouter);
app.use('/api/v1/admin', adminRoutes);

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  log.error('process.unhandledRejection', { err: reason instanceof Error ? reason : new Error(String(reason)) });
  captureError(reason, { kind: 'unhandledRejection' });
});
process.on('uncaughtException', (err) => {
  log.error('process.uncaughtException', { err });
  captureError(err, { kind: 'uncaughtException' });
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  log.info('api.started', { port: Number(PORT), env: process.env.NODE_ENV ?? 'development' });
  resetPresence();
});

// Neon (plan gratuit) suspend le compute après ~5 min d'inactivité ; la requête
// suivante paie alors ~2-3 s de réveil (+ des erreurs « terminating connection »).
// Pendant qu'un membre utilise l'app (requête HTTP dans les 8 dernières minutes),
// on garde la base chaude par un ping léger. Dès que le trafic cesse, on laisse
// Neon se rendormir → pas de gaspillage d'heures de calcul.
if (process.env.NODE_ENV === 'production') {
  const keepAlive = setInterval(() => {
    if (Date.now() - getLastActivityAt() > 8 * 60 * 1000) return;
    prisma.$queryRaw`SELECT 1`.catch((err) => log.warn('db.keepalive.failed', { err }));
  }, 4 * 60 * 1000);
  keepAlive.unref();
}
