import { Router, type Request } from 'express';

import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { AppError } from '../http/errors.js';
import { validate } from '../lib/validate.js';
import { AdminUpdateUserBody, UserIdParam } from '../schemas/users.js';
import {
  adminDelete,
  adminUpdate,
  getById,
  getCurrent,
  listAll,
  resetAccount,
} from '../services/users.js';

export const usersRoutes = Router();

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required', 401);
  }
  return req.user.id;
}

usersRoutes.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(await getCurrent(requireUserId(req)));
  } catch (err) {
    next(err);
  }
});

usersRoutes.post('/reset', requireAuth, async (req, res, next) => {
  try {
    res.json(await resetAccount(requireUserId(req)));
  } catch (err) {
    next(err);
  }
});

usersRoutes.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await listAll());
  } catch (err) {
    next(err);
  }
});

usersRoutes.get(
  '/:userId',
  requireAuth,
  requireAdmin,
  validate('params', UserIdParam),
  async (req, res, next) => {
    try {
      res.json(await getById(req.params.userId as string));
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.put(
  '/:userId',
  requireAuth,
  requireAdmin,
  validate('params', UserIdParam),
  validate('body', AdminUpdateUserBody),
  async (req, res, next) => {
    try {
      res.json(await adminUpdate(req.params.userId as string, req.body));
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.delete(
  '/:userId',
  requireAuth,
  requireAdmin,
  validate('params', UserIdParam),
  async (req, res, next) => {
    try {
      await adminDelete(req.params.userId as string);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
