import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import * as alertsService from '../services/alerts.js';
import {
  AlertIdParam,
  CreateAlertBody,
  UpdateAlertBody,
} from '../schemas/alerts.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await alertsService.listForUser(req.user!.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate('body', CreateAlertBody), async (req, res, next) => {
  try {
    const row = await alertsService.create(req.user!.id, req.body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  validate('params', AlertIdParam),
  validate('body', UpdateAlertBody),
  async (req, res, next) => {
    try {
      const row = await alertsService.update(
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

router.delete('/:id', validate('params', AlertIdParam), async (req, res, next) => {
  try {
    await alertsService.remove(req.user!.id, req.params.id as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as alertsRoutes };
