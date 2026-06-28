import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from '../config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { serializeDecimals } from './response.js';

export function createApp(): Express {
  const app = express();
  const allowedOrigins = new Set(config.CLIENT_ORIGIN);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.has(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const original = res.json.bind(res);
    res.json = (body: unknown) => original(serializeDecimals(body));
    next();
  });

  return app;
}

export function finalize(app: Express): Express {
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
