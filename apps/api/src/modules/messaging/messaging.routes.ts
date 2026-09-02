import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/passport.js';
import {
  sendMessageSchema,
  listMessagesQuerySchema,
  bySourceParamsSchema,
} from './messaging.schema.js';
import {
  listConversations,
  getUnreadTotal,
  getConversation,
  getConversationBySource,
  listMessages,
  sendMessage,
  markRead,
} from './messaging.service.js';

const router = Router();

// Anti-spam / anti-harcèlement sur l'envoi (le rate-limit global ne couvre que l'auth).
const sendLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: 'Trop de messages envoyés, patientez un instant' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await listConversations(userId));
  } catch (err) { next(err); }
});

// Routes littérales avant `/:id`
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getUnreadTotal(userId));
  } catch (err) { next(err); }
});

router.get('/by-source/:source/:sourceId', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { source, sourceId } = bySourceParamsSchema.parse(req.params);
    res.json(await getConversationBySource(userId, source, sourceId));
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getConversation(userId, req.params['id'] as string));
  } catch (err) { next(err); }
});

router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { before } = listMessagesQuerySchema.parse(req.query);
    res.json(await listMessages(userId, req.params['id'] as string, before));
  } catch (err) { next(err); }
});

router.post('/:id/messages', authenticate, sendLimiter, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { body } = sendMessageSchema.parse(req.body);
    res.status(201).json(await sendMessage(userId, req.params['id'] as string, body));
  } catch (err) { next(err); }
});

router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await markRead(userId, req.params['id'] as string));
  } catch (err) { next(err); }
});

export default router;
