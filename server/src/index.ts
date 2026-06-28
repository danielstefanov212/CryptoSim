import http from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { config } from './config.js';
import { prisma } from './db.js';
import { createApp, finalize } from './http/app.js';
import { seedCatalogue } from './lib/seed-catalogue.js';
import { krakenLive } from './kraken/live-client.js';
import { loadPairMap } from './kraken/pair-mapping.js';
import { initPublicNamespace } from './sockets/public-namespace.js';
import { initPrivateNamespace } from './sockets/private-namespace.js';
import { alertEngine } from './alerts/engine.js';

import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { cryptoAssetsRoutes } from './routes/crypto-assets.routes.js';
import { ordersRoutes } from './routes/orders.routes.js';
import { holdingsRoutes } from './routes/holdings.routes.js';
import { watchlistRoutes } from './routes/watchlist.routes.js';
import { alertsRoutes } from './routes/alerts.routes.js';
import { reportsRoutes } from './routes/reports.routes.js';

async function main() {
  console.log('[cryptosim] starting...');

  try {
    await prisma.$connect();
    console.log('[cryptosim] database connected');
  } catch (err) {
    console.error('[cryptosim] failed to connect to database:', err);
    process.exit(1);
  }

  try {
    const result = await seedCatalogue(prisma);
    console.log(
      `[seed] catalogue: ${result.inserted} inserted, ${result.updated} updated (of ${result.total})`,
    );
  } catch (err) {
    console.error('[cryptosim] catalogue seed failed:', err);
    process.exit(1);
  }

  await loadPairMap();

  const app = createApp();
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/crypto-assets', cryptoAssetsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/holdings', holdingsRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/reports', reportsRoutes);
  finalize(app);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.CLIENT_ORIGIN,
      credentials: false,
    },
  });
  krakenLive.start();
  await initPublicNamespace(io);
  initPrivateNamespace(io);
  await alertEngine.start();
  server.listen(config.PORT, () => {
    console.log(`[cryptosim] listening on http://localhost:${config.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[cryptosim] received ${signal}, shutting down`);
    alertEngine.stop();
    krakenLive.stop();
    try {
      await Promise.race([
        Promise.all([
          new Promise<void>((resolve, reject) =>
            server.close((err) => (err ? reject(err) : resolve())),
          ),
          new Promise<void>((resolve) => io.close(() => resolve())),
        ]),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            console.warn(
              `[cryptosim] shutdown drain timed out after ${config.SHUTDOWN_TIMEOUT_MS}ms; forcing exit`,
            );
            resolve();
          }, config.SHUTDOWN_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      console.warn('[cryptosim] error during drain:', err);
    }
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[cryptosim] fatal:', err);
  process.exit(1);
});
