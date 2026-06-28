import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import * as watchlistService from '../services/watchlist.js';
import {
  CreateWatchlistBody,
  UpdateWatchlistBody,
  WatchlistIdParam,
} from '../schemas/watchlist.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await watchlistService.listForUser(req.user!.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate('body', CreateWatchlistBody), async (req, res, next) => {
  try {
    const row = await watchlistService.create(req.user!.id, req.body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  validate('params', WatchlistIdParam),
  validate('body', UpdateWatchlistBody),
  async (req, res, next) => {
    try {
      const row = await watchlistService.updateNotes(
        req.user!.id,
        req.params.id as string,
        req.body,
      );
      res.json(row);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id', validate('params', WatchlistIdParam), async (req, res, next) => {
  try {
    await watchlistService.remove(req.user!.id, req.params.id as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as watchlistRoutes };
