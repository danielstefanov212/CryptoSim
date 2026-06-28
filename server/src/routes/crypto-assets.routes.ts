import { Router } from 'express';

import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import { AssetIdParam, CreateAssetBody, UpdateAssetBody } from '../schemas/crypto-assets.js';
import {
  create,
  deactivate,
  getById,
  list,
  update,
} from '../services/crypto-assets.js';

export const cryptoAssetsRoutes = Router();

cryptoAssetsRoutes.get('/', requireAuth, async (req, res, next) => {
  try {
    const visibility = req.user?.role === 'ADMIN' ? 'all' : 'active';
    res.json(await list(visibility));
  } catch (err) {
    next(err);
  }
});

cryptoAssetsRoutes.get(
  '/:id',
  requireAuth,
  validate('params', AssetIdParam),
  async (req, res, next) => {
    try {
      res.json(await getById(req.params.id as string));
    } catch (err) {
      next(err);
    }
  },
);

cryptoAssetsRoutes.post(
  '/',
  requireAuth,
  requireAdmin,
  validate('body', CreateAssetBody),
  async (req, res, next) => {
    try {
      res.status(201).json(await create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

cryptoAssetsRoutes.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validate('params', AssetIdParam),
  validate('body', UpdateAssetBody),
  async (req, res, next) => {
    try {
      res.json(await update(req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  },
);

cryptoAssetsRoutes.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validate('params', AssetIdParam),
  async (req, res, next) => {
    try {
      res.json(await deactivate(req.params.id as string));
    } catch (err) {
      next(err);
    }
  },
);
