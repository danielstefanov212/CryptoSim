import type { Server as SocketIOServer, Socket } from 'socket.io';
import { krakenLive, type PriceData } from '../kraken/live-client.js';
import { verifyToken } from '../auth/jwt.js';
import { isKnownSymbol } from '../kraken/pair-mapping.js';
import { alertEngine, type AlertTriggeredEvent } from '../alerts/engine.js';

interface PrivateSocketData {
  userId: string;
  role: 'TRADER' | 'ADMIN';
  subscriptions: Set<string>;
}

declare module 'socket.io' {
  interface Socket {
    cryptosim?: PrivateSocketData;
  }
}

export function initPrivateNamespace(io: SocketIOServer): void {
  const ns = io.of('/');
  ns.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const rawToken = socket.handshake.auth?.token as string | undefined;
      if (!rawToken) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      const payload = verifyToken(rawToken);
      socket.cryptosim = {
        userId: payload.sub,
        role: payload.role,
        subscriptions: new Set(),
      };
      next();
    } catch (err) {
      const e = err as { code?: string };
      next(new Error(e?.code === 'TOKEN_EXPIRED' ? 'TokenExpiredError' : 'UNAUTHENTICATED'));
    }
  });
  ns.on('connection', (socket: Socket) => {
    const data = socket.cryptosim;
    if (!data) {
      socket.disconnect(true);
      return;
    }
    void socket.join(`user:${data.userId}`);
    socket.on('subscribe', (payload: unknown) => {
      const requested = normalizeSymbols(payload);
      const known: string[] = [];
      const unknown: string[] = [];
      for (const s of requested) {
        (isKnownSymbol(s) ? known : unknown).push(s);
      }
      if (unknown.length > 0) {
        socket.emit('subscribe:error', { symbols: unknown, reason: 'unknown_symbol' });
      }
      if (known.length === 0) return;
      const fresh: string[] = [];
      for (const s of known) {
        if (!data.subscriptions.has(s)) {
          data.subscriptions.add(s);
          fresh.push(s);
          void socket.join(`symbol:${s}`);
        }
      }
      if (fresh.length > 0) krakenLive.subscribe(fresh);
    });
    socket.on('unsubscribe', (payload: unknown) => {
      const symbols = normalizeSymbols(payload);
      const removed: string[] = [];
      for (const s of symbols) {
        if (data.subscriptions.delete(s)) {
          removed.push(s);
          void socket.leave(`symbol:${s}`);
        }
      }
      if (removed.length > 0) krakenLive.unsubscribe(removed);
    });
    socket.on('disconnect', () => {
      const held = Array.from(data.subscriptions);
      data.subscriptions.clear();
      if (held.length > 0) krakenLive.unsubscribe(held);
    });
  });
  krakenLive.events.on('tick', (symbol: string, priceData: PriceData) => {
    ns.to(`symbol:${symbol}`).emit('price', priceData);
  });

  alertEngine.events.on('triggered', (event: AlertTriggeredEvent) => {
    const { userId, alert } = event;
    ns.to(`user:${userId}`).emit('alert:triggered', {
      id: alert.id,
      symbol: alert.symbol,
      targetPrice: alert.targetPrice.toString(),
      direction: alert.direction,
      isTriggered: alert.isTriggered,
      isActive: alert.isActive,
      triggeredAt: new Date().toISOString(),
    });
  });
  console.log('[socket] private namespace listening');
}

function normalizeSymbols(payload: unknown): string[] {
  if (typeof payload === 'string') return [payload];
  if (Array.isArray(payload)) {
    return payload.filter((s): s is string => typeof s === 'string');
  }
  return [];
}
