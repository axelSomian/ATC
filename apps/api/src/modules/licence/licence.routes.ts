import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';
import { getMyLicence, payMyLicence, quoteLicence, verifyLicence } from './licence.service.js';
import { payLicenceSchema, quoteLicenceSchema } from './licence.schema.js';

const uploadLicenceDocs = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

const router = Router();

// Vérification publique d'un document (scan QR) — pas d'authentification requise,
// aucune donnée sensible (CNI, photo) exposée par ce endpoint.
router.get('/verify/:code', async (req, res, next) => {
  try {
    res.json(await verifyLicence(req.params.code));
  } catch (err) {
    next(err);
  }
});

router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const userId = (req.user as { id: string }).id;
    res.json(await getMyLicence(userId));
  } catch (err) {
    next(err);
  }
});

router.post('/quote', async (req, res, next) => {
  try {
    const dto = quoteLicenceSchema.parse(req.body);
    res.json(quoteLicence(dto));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/pay',
  uploadLicenceDocs.fields([
    { name: 'cni', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const userId = (req.user as { id: string }).id;
      const dto = payLicenceSchema.parse(req.body);
      const files = req.files as { cni?: Express.Multer.File[]; photo?: Express.Multer.File[] } | undefined;
      if (!files?.cni?.[0]) throw new AppError(400, 'Pièce justificative (CNI, passeport ou extrait de naissance) obligatoire');
      if (!files?.photo?.[0]) throw new AppError(400, "Photo d'identité obligatoire");

      const licence = await payMyLicence(userId, dto, files.cni[0].buffer, files.photo[0].buffer);
      res.json(licence);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
