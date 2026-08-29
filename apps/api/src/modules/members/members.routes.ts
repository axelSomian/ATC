import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../../lib/cloudinary.js';
import { listMembers, getOwnProfile, getMemberById, updateMe, updateAvatar, getRankings } from './members.service.js';
import { membersQuerySchema, updateMeSchema } from './members.schema.js';
import { authenticate } from '../../middleware/passport.js';

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = membersQuerySchema.parse(req.query);
    const result = await listMembers(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/rankings', authenticate, async (_req, res, next) => {
  try {
    const data = await getRankings();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const member = await getOwnProfile(userId);
    res.json(member);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    const dto = updateMeSchema.parse(req.body);
    const updated = await updateMe(userId, dto);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/me/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Aucun fichier reçu' }); return; }
    const userId = (req.user as { id: string }).id;
    const avatarUrl = await uploadImage(req.file.buffer, {
      folder: 'atc/avatars',
      publicId: `user_${userId}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });
    const updated = await updateAvatar(userId, avatarUrl);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await getMemberById(req.params.id);
    res.json(member);
  } catch (err) {
    next(err);
  }
});

export default router;
