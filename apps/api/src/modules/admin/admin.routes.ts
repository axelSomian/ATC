import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../../middleware/passport.js';
import { AppError } from '../../middleware/error.js';
import { uploadImage } from '../../lib/cloudinary.js';
import {
  createClubSchema,
  updateClubSchema,
  updateLevelSchema,
  setRoleSchema,
  broadcastPushSchema,
  createTournamentSchema,
  updateTournamentSchema,
  setTournamentResultsSchema,
  generateBracketSchema,
  setMatchResultSchema,
  swapBracketPlayersSchema,
  setBracketPublishedSchema,
  addTournamentRegistrantSchema,
} from './admin.schema.js';
import {
  getOverview,
  listAllClubs,
  createClub,
  updateClub,
  deleteClub,
  setClubImage,
  listAllLevels,
  updateLevel,
  listMembersForAdmin,
  setMemberRole,
  getPushStats,
  broadcastPush,
  listAllTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournamentRegistrations,
  setTournamentResults,
  getBracket,
  generateBracket,
  setMatchResult,
  swapBracketPlayers,
  setBracketPublished,
  addTournamentRegistrant,
  removeTournamentRegistrant,
} from './admin.service.js';

const router = Router();

// Toutes les routes admin exigent un compte authentifié avec role = 'admin'.
router.use(authenticate, requireAdmin);

router.get('/overview', async (_req, res, next) => {
  try {
    res.json(await getOverview());
  } catch (err) {
    next(err);
  }
});

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

/* ── Notifications push (annonce à tous) ── */
router.get('/push/stats', async (_req, res, next) => {
  try {
    res.json(await getPushStats());
  } catch (err) {
    next(err);
  }
});

router.post('/push/broadcast', async (req, res, next) => {
  try {
    const dto = broadcastPushSchema.parse(req.body);
    res.json(await broadcastPush(dto));
  } catch (err) {
    next(err);
  }
});

/* ── Tournois (classement fédéral) ── */
router.get('/tournaments', async (_req, res, next) => {
  try {
    res.json(await listAllTournaments());
  } catch (err) {
    next(err);
  }
});

router.post('/tournaments', async (req, res, next) => {
  try {
    const dto = createTournamentSchema.parse(req.body);
    res.status(201).json(await createTournament(dto));
  } catch (err) {
    next(err);
  }
});

router.patch('/tournaments/:id', async (req, res, next) => {
  try {
    const dto = updateTournamentSchema.parse(req.body);
    res.json(await updateTournament(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

router.delete('/tournaments/:id', async (req, res, next) => {
  try {
    await deleteTournament(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/tournaments/:id/registrations', async (req, res, next) => {
  try {
    res.json(await getTournamentRegistrations(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/tournaments/:id/results', async (req, res, next) => {
  try {
    const dto = setTournamentResultsSchema.parse(req.body);
    res.json(await setTournamentResults(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

router.post('/tournaments/:id/registrations', async (req, res, next) => {
  try {
    const dto = addTournamentRegistrantSchema.parse(req.body);
    res.status(201).json(await addTournamentRegistrant(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

router.delete('/tournaments/:id/registrations/:userId', async (req, res, next) => {
  try {
    res.json(await removeTournamentRegistrant(req.params.id, req.params.userId));
  } catch (err) {
    next(err);
  }
});

router.get('/tournaments/:id/bracket', async (req, res, next) => {
  try {
    res.json(await getBracket(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/tournaments/:id/bracket', async (req, res, next) => {
  try {
    const dto = generateBracketSchema.parse(req.body ?? {});
    res.status(201).json(await generateBracket(req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

router.patch('/tournaments/:id/bracket/matches/:matchId', async (req, res, next) => {
  try {
    const dto = setMatchResultSchema.parse(req.body);
    res.json(await setMatchResult(req.params.id, req.params.matchId, dto));
  } catch (err) {
    next(err);
  }
});

router.patch('/tournaments/:id/bracket/swap', async (req, res, next) => {
  try {
    const dto = swapBracketPlayersSchema.parse(req.body);
    res.json(await swapBracketPlayers(req.params.id, dto.userIdA, dto.userIdB));
  } catch (err) {
    next(err);
  }
});

router.patch('/tournaments/:id/bracket/publish', async (req, res, next) => {
  try {
    const dto = setBracketPublishedSchema.parse(req.body);
    res.json(await setBracketPublished(req.params.id, dto.published));
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
