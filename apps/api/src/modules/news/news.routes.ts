import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';
import { uploadImage } from '../../lib/cloudinary.js';
import {
  createPostSchema,
  updatePostSchema,
  listQuerySchema,
  adminListQuerySchema,
} from './news.schema.js';
import {
  listPublic,
  getPublicBySlug,
  listFeatured,
  listUpcomingEvents,
  getPartnerOfMonth,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminRemove,
} from './news.service.js';

// ── Routes publiques : /api/v1/news ────────────────────────────────────────
export const newsPublicRouter = Router();

newsPublicRouter.use(authenticate); // rubrique réservée aux membres connectés

newsPublicRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listPublic(listQuerySchema.parse(req.query)));
  } catch (err) { next(err); }
});

newsPublicRouter.get('/featured', async (_req, res, next) => {
  try {
    res.json(await listFeatured());
  } catch (err) { next(err); }
});

newsPublicRouter.get('/events/upcoming', async (_req, res, next) => {
  try {
    res.json(await listUpcomingEvents(3));
  } catch (err) { next(err); }
});

newsPublicRouter.get('/events', async (_req, res, next) => {
  try {
    res.json(await listUpcomingEvents(50));
  } catch (err) { next(err); }
});

newsPublicRouter.get('/partner-of-month', async (_req, res, next) => {
  try {
    res.json(await getPartnerOfMonth());
  } catch (err) { next(err); }
});

newsPublicRouter.get('/:slug', async (req, res, next) => {
  try {
    res.json(await getPublicBySlug(req.params.slug));
  } catch (err) { next(err); }
});

// ── Routes admin : /api/v1/admin/news ──────────────────────────────────────
export const newsAdminRouter = Router();

newsAdminRouter.use(authenticate, requireAdmin);

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

newsAdminRouter.get('/', async (req, res, next) => {
  try {
    res.json(await adminList(adminListQuerySchema.parse(req.query)));
  } catch (err) { next(err); }
});

newsAdminRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await adminGet(req.params.id));
  } catch (err) { next(err); }
});

newsAdminRouter.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await adminCreate(createPostSchema.parse(req.body)));
  } catch (err) { next(err); }
});

newsAdminRouter.patch('/:id', async (req, res, next) => {
  try {
    res.json(await adminUpdate(req.params.id, updatePostSchema.parse(req.body)));
  } catch (err) { next(err); }
});

newsAdminRouter.delete('/:id', async (req, res, next) => {
  try {
    await adminRemove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

newsAdminRouter.post('/images', uploadPhoto.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'Aucune image reçue');
    const kind = req.query['kind'] === 'cover' ? 'cover' : 'gallery';
    const url = await uploadImage(req.file.buffer, {
      folder: 'atc/news',
      publicId: `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      transformation:
        kind === 'cover'
          ? [{ width: 1200, height: 675, crop: 'fill', gravity: 'auto' }]
          : [{ width: 1400, crop: 'limit' }],
    });
    res.json({ url });
  } catch (err) { next(err); }
});
