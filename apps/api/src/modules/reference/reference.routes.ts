import { Router } from 'express';
import { listClubs, listCourts, listLevels } from './reference.service.js';

const router = Router();

// Données de référence publiques (pas d'auth) — clubs et niveaux.
router.get('/clubs', async (_req, res, next) => {
  try {
    res.json(await listClubs());
  } catch (err) {
    next(err);
  }
});

router.get('/courts', async (_req, res, next) => {
  try {
    res.json(await listCourts());
  } catch (err) {
    next(err);
  }
});

router.get('/levels', async (_req, res, next) => {
  try {
    res.json(await listLevels());
  } catch (err) {
    next(err);
  }
});

export default router;
