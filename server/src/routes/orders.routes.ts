import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import * as ordersService from '../services/orders.js';
import { OrderBody, OrdersQuery } from '../schemas/orders.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  validate('query', OrdersQuery),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const q = req.query as unknown as { symbol?: string };
      const rows = await ordersService.listForUser(userId, q.symbol);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/buy',
  validate('body', OrderBody),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const order = await ordersService.buy(userId, req.body);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/sell',
  validate('body', OrderBody),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const order = await ordersService.sell(userId, req.body);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },
);

export { router as ordersRoutes };
