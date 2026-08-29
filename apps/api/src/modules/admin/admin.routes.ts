import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';
import { uploadImage } from '../../lib/cloudinary.js';
import {
  createClubSchema,
  updateClubSchema,
  updateLevelSchema,
  resolveMatchSchema,
  setRoleSchema,
} from './admin.schema.js';
import {
  listAllClubs,
  createClub,
  updateClub,
  deleteClub,
  setClubImage,
  listAllLevels,
  updateLevel,
  listDisputedMatches,
  resolveMatch,
  listMembersForAdmin,
  setMemberRole,
} from './admin.service.js';

const router = Router();

// Toutes les routes admin exigent un compte authentifié avec role = 'admin'.
router.use(authenticate, requireAdmin);

const uploadClubPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

/* ── Clubs ── */
router.get('/clubs', async (_req, res, next) => {
  try {
    res.json(await listAllClubs());
  } catch (err) {
    next(err);
  }
});

router.post('/clubs', async (req, res, next) => {
  try {
    const dto = createClubSchema.parse(req.body);
    res.status(201).json(await createClub(dto));
  } catch (err) {
    next(err);
  }
});

router.patch('/clubs/:id', async (req, res, next) => {
  try {
    const dto = updateClubSchema.parse(req.body);
    res.json(await updateClub(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

router.delete('/clubs/:id', async (req, res, next) => {
  try {
    await deleteClub(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/clubs/:id/image', uploadClubPhoto.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'Aucune image reçue');
    const url = await uploadImage(req.file.buffer, {
      folder: 'atc/clubs',
      publicId: `club_${req.params.id}`,
      transformation: [{ width: 800, height: 500, crop: 'fill', gravity: 'auto' }],
    });
    res.json(await setClubImage(req.params.id, url));
  } catch (err) {
    next(err);
  }
});

/* ── Niveaux ── */
router.get('/levels', async (_req, res, next) => {
  try {
    res.json(await listAllLevels());
  } catch (err) {
    next(err);
  }
});

router.patch('/levels/:level', async (req, res, next) => {
  try {
    const level = Number(req.params.level);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw new AppError(400, 'Niveau invalide');
    }
    const dto = updateLevelSchema.parse(req.body);
    res.json(await updateLevel(level, dto));
  } catch (err) {
    next(err);
  }
});

/* ── Litiges de score ── */
router.get('/matches/disputed', async (_req, res, next) => {
  try {
    res.json(await listDisputedMatches());
  } catch (err) {
    next(err);
  }
});

router.post('/matches/:id/resolve', async (req, res, next) => {
  try {
    const dto = resolveMatchSchema.parse(req.body);
    res.json(await resolveMatch(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

/* ── Membres ── */
router.get('/members', async (_req, res, next) => {
  try {
    res.json(await listMembersForAdmin());
  } catch (err) {
    next(err);
  }
});

router.patch('/members/:id/role', async (req, res, next) => {
  try {
    const dto = setRoleSchema.parse(req.body);
    const adminId = (req.user as { id: string }).id;
    res.json(await setMemberRole(req.params.id, adminId, dto));
  } catch (err) {
    next(err);
  }
});

export default router;
