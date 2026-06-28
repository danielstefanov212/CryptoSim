import { AppError } from '../lib/errors.js';

export interface OhlcCandle {
  t: number;
  close: number;
}

interface CacheEntry {
  expires: number;
  data: OhlcCandle[];
}

const KRAKEN_OHLC_URL = 'https://api.kraken.com/0/public/OHLC';
const CACHE_MAX = 200;
const SINCE_BUCKET_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 60 * 1000;

class KrakenOhlcClient {
  private cache = new Map<string, CacheEntry>();

  async fetch(
    restPair: string,
    intervalMinutes: number,
    sinceSec: number,
  ): Promise<OhlcCandle[]> {
    const bucket = Math.floor((sinceSec * 1000) / SINCE_BUCKET_MS) * SINCE_BUCKET_MS;
    const key = `${restPair}|${intervalMinutes}|${bucket}`;

    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit.data;
    }

    const data = await this.doFetch(restPair, intervalMinutes, sinceSec);
    this.cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
    if (this.cache.size > CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    return data;
  }

  private async doFetch(
    restPair: string,
    intervalMinutes: number,
    sinceSec: number,
    attempt = 1,
  ): Promise<OhlcCandle[]> {
    const url = `${KRAKEN_OHLC_URL}?pair=${encodeURIComponent(restPair)}&interval=${intervalMinutes}&since=${sinceSec}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new AppError(
        'OHLC_UNAVAILABLE',
        `Kraken OHLC request failed: ${(err as Error).message}`,
        503,
      );
    }

    if (res.status === 429) {
      throw new AppError('OHLC_RATE_LIMITED', 'Kraken OHLC rate limit', 503);
    }
    if (res.status >= 500 && attempt === 1) {
      await new Promise((r) => setTimeout(r, 500));
      return this.doFetch(restPair, intervalMinutes, sinceSec, attempt + 1);
    }
    if (!res.ok) {
      throw new AppError(
        'OHLC_UNAVAILABLE',
        `Kraken OHLC ${res.status}: ${res.statusText}`,
        503,
      );
    }

    const body = (await res.json()) as {
      error?: string[];
      result?: Record<string, unknown>;
    };
    if (body.error && body.error.length > 0) {
      throw new AppError(
        'OHLC_UNAVAILABLE',
        `Kraken OHLC API error: ${body.error.join(', ')}`,
        503,
      );
    }
    if (!body.result) return [];

    let rows: unknown[] | null = null;
    for (const [k, v] of Object.entries(body.result)) {
      if (k === 'last') continue;
      if (Array.isArray(v)) {
        rows = v;
        break;
      }
    }
    if (!rows) return [];

    return rows
      .map((r): OhlcCandle | null => {
        if (!Array.isArray(r) || r.length < 5) return null;
        const t = Number(r[0]);
        const close = Number(r[4]);
        if (!Number.isFinite(t) || !Number.isFinite(close)) return null;
        return { t, close };
      })
      .filter((c): c is OhlcCandle => c !== null);
  }
}

export const krakenOhlc = new KrakenOhlcClient();
