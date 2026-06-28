import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../http/errors.js';

type Part = 'body' | 'query' | 'params';

export function validate<T>(part: Part, schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      (req as unknown as Record<Part, unknown>)[part] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError('VALIDATION', 'Invalid request', 400, err.flatten()));
        return;
      }
      next(err);
    }
  };
}
