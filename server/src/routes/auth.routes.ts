import { Router } from 'express';

import { login, register } from '../auth/service.js';
import { validate } from '../lib/validate.js';
import { LoginBody, RegisterBody } from '../schemas/auth.js';

export const authRoutes = Router();

authRoutes.post('/register', validate('body', RegisterBody), async (req, res, next) => {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/login', validate('body', LoginBody), async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
