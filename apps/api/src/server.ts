import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { errorHandler } from './middleware/error.js';
import './middleware/passport.js';
import { setIo, handlePresence, resetPresence } from './lib/socket.js';
import authRoutes from './modules/auth/auth.routes.js';
import membersRoutes from './modules/members/members.routes.js';
import disposRoutes from './modules/dispos/dispos.routes.js';
import matchesRoutes from './modules/matches/matches.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import quickMatchesRoutes from './modules/quick-matches/quick-matches.routes.js';
import referenceRoutes from './modules/reference/reference.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import messagingRoutes from './modules/messaging/messaging.routes.js';

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

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  handlePresence(io, socket);
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/google', loginLimiter);
app.use('/api/v1/auth/signup', signupLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', referenceRoutes);
app.use('/api/v1/members', membersRoutes);
app.use('/api/v1/dispos', disposRoutes);
app.use('/api/v1/matches', matchesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/quick-matches', quickMatchesRoutes);
app.use('/api/v1/conversations', messagingRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`[API] Serveur démarré sur http://localhost:${PORT}`);
  resetPresence();
});
