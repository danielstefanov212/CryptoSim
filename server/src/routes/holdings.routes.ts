import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import * as holdingsService from '../services/holdings.js';
import { HoldingsQuery } from '../schemas/holdings.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  validate('query', HoldingsQuery),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const q = req.query as unknown as { symbol?: string };
      const rows = await holdingsService.listForUser(userId, q.symbol);
      if (q.symbol) {
        res.json(rows[0] ?? null);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

export { router as holdingsRoutes };
