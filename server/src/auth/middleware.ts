import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../http/errors.js';
import { verifyToken, type TokenRole } from './jwt.js';

export interface AuthenticatedUser {
  id: string;
  role: TokenRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

function extractBearer(req: Request): string {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new AppError('UNAUTHENTICATED', 'Missing Authorization bearer token', 401);
  }
  return header.slice('Bearer '.length).trim();
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractBearer(req);
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(new AppError('UNAUTHENTICATED', 'Authentication required', 401));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new AppError('FORBIDDEN', 'Admin access required', 403));
    return;
  }
  next();
};
