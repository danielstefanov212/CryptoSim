import { EventEmitter } from 'node:events';
import { Decimal } from 'decimal.js';
import WebSocket from 'ws';

import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import {
  isKnownSymbol,
  krakenPairToSymbol,
  symbolToKrakenPair,
} from './pair-mapping.js';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  high: number;
  low: number;
  changePct: number;
}

interface CachedPrice {
  price: Decimal;
  receivedAt: number;
}

const KRAKEN_WS_URL = 'wss://ws.kraken.com/v2';

export class KrakenLiveClient {
  readonly events = new EventEmitter();
  private ws: WebSocket | null = null;
  private refcounts = new Map<string, number>();
  private cache = new Map<string, CachedPrice>();
  private connected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionallyClosed = false;
  start(): void {
    this.intentionallyClosed = false;
    this.connect();
  }

  stop(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
      }
      this.ws = null;
    }
    this.connected = false;
  }

  subscribe(symbols: string[]): void {
    const toSend: string[] = [];
    for (const symbol of symbols) {
      if (!isKnownSymbol(symbol)) continue;
      const prev = this.refcounts.get(symbol) ?? 0;
      this.refcounts.set(symbol, prev + 1);
      if (prev === 0) toSend.push(symbolToKrakenPair(symbol));
    }
    if (toSend.length > 0 && this.connected) {
      this.send({
        method: 'subscribe',
        params: { channel: 'ticker', symbol: toSend },
      });
    }
  }

  unsubscribe(symbols: string[]): void {
    const toSend: string[] = [];
    for (const symbol of symbols) {
      const prev = this.refcounts.get(symbol) ?? 0;
      if (prev <= 0) continue;
      const next = prev - 1;
      if (next === 0) {
        this.refcounts.delete(symbol);
        this.cache.delete(symbol);
        toSend.push(symbolToKrakenPair(symbol));
      } else {
        this.refcounts.set(symbol, next);
      }
    }
    if (toSend.length > 0 && this.connected) {
      this.send({
        method: 'unsubscribe',
        params: { channel: 'ticker', symbol: toSend },
      });
    }
  }

  getCachedPrice(symbol: string): Decimal {
    const found = this.cache.get(symbol);
    if (!found || this.isStale(found)) {
      throw new AppError(
        'PRICE_UNAVAILABLE',
        `No recent price for ${symbol}`,
        503,
      );
    }
    return found.price;
  }

  tryGetCachedPrice(symbol: string): Decimal | null {
    const found = this.cache.get(symbol);
    if (!found || this.isStale(found)) return null;
    return found.price;
  }

  private isStale(entry: CachedPrice): boolean {
    return Date.now() - entry.receivedAt >= config.STALE_PRICE_MS;
  }

  private connect(): void {
    if (this.ws) return;
    const ws = new WebSocket(KRAKEN_WS_URL);
    this.ws = ws;
    ws.on('open', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.events.emit('connect');

      const liveSymbols = Array.from(this.refcounts.keys());
      if (liveSymbols.length > 0) {
        this.send({
          method: 'subscribe',
          params: {
            channel: 'ticker',
            symbol: liveSymbols.map((s) => symbolToKrakenPair(s)),
          },
        });
      }
      console.log('[kraken] connected');
    });
    ws.on('message', (raw) => {
      try {
        const text = raw.toString();
        const msg = JSON.parse(text) as Record<string, unknown>;
        if ('method' in msg) {
          return;
        }
        if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return;
        for (const entry of msg.data) {
          if (!entry || typeof entry !== 'object') continue;
          const e = entry as Record<string, unknown>;
          const krakenPair = e.symbol;
          if (typeof krakenPair !== 'string') continue;
          const symbol = krakenPairToSymbol(krakenPair);
          if (!symbol) continue;

          const price = Number(e.last);
          if (!Number.isFinite(price)) continue;

          const priceData: PriceData = {
            symbol,
            price,
            change: Number(e.change ?? 0),
            high: Number(e.high ?? 0),
            low: Number(e.low ?? 0),
            changePct: Number(e.change_pct ?? 0),
          };
          this.cache.set(symbol, {
            price: new Decimal(price.toString()),
            receivedAt: Date.now(),
          });
          this.events.emit('tick', symbol, priceData);
        }
      } catch (err) {
        console.warn('[kraken] failed to parse message', err);
      }
    });
    ws.on('close', () => {
      this.connected = false;
      this.ws = null;
      this.events.emit('disconnect');
      console.log('[kraken] disconnected');
      if (!this.intentionallyClosed) this.scheduleReconnect();
    });
    ws.on('error', (err) => {
      console.warn('[kraken] socket error', err);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const attempt = this.reconnectAttempts + 1;
    const baseMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
    this.reconnectAttempts = attempt;
    console.log(`[kraken] reconnect in ${baseMs}ms (attempt ${attempt})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, baseMs);
  }

  private send(payload: unknown): void {
    if (!this.ws || !this.connected) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      console.warn('[kraken] failed to send', err);
    }
  }
}

export const krakenLive = new KrakenLiveClient();
