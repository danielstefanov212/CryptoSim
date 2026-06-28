import { Prisma, type ReportTemplate } from '@prisma/client';

import { config } from '../config.js';
import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { krakenOhlc, type OhlcCandle } from '../kraken/ohlc-client.js';
import { isKnownSymbol, symbolToKrakenRestPair } from '../kraken/pair-mapping.js';

const MAX_POINTS = 720;

export type UserGranularity = 'hourly' | 'daily';
export type EffectiveGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface Granularity {
  user: UserGranularity;
  effective: EffectiveGranularity;
  bucketMs: number;
  krakenIntervalMinutes: number;
  clamped: boolean;
}

const HOURLY_MS = 60 * 60 * 1000;
const DAILY_MS = 24 * HOURLY_MS;
const WEEKLY_MS = 7 * DAILY_MS;

const MONTHLY_MS = 30 * DAILY_MS;
const KRAKEN_MAX_INTERVAL_MINUTES = 21_600;

export type DataGapReason = 'history_gap' | 'fetch_failed';

export interface DataGap {
  symbol: string;
  gapBefore: string;
  reason: DataGapReason;
}

export interface ReportPoint {
  t: string;
  value: string | null;
}

export interface ReportRunResponse {
  template: {
    id: string;
    name: string;
    symbols: string[];
    startDate: string | null;
    endDate: string | null;
    rollingDays: number | null;
  };
  window: {
    start: string;
    end: string;
    granularity: UserGranularity;
    clamped: boolean;
    effectiveGranularity?: EffectiveGranularity;
  };
  dataGaps: DataGap[];
  inactiveSymbols: string[];
  points: ReportPoint[];
}

function pickGranularity(start: Date, end: Date): Granularity {
  const windowMs = end.getTime() - start.getTime();
  const user: UserGranularity = windowMs <= DAILY_MS ? 'hourly' : 'daily';

  if (user === 'hourly') {
    return {
      user,
      effective: 'hourly',
      bucketMs: HOURLY_MS,
      krakenIntervalMinutes: 60,
      clamped: false,
    };
  }

  if (windowMs / DAILY_MS <= MAX_POINTS) {
    return {
      user,
      effective: 'daily',
      bucketMs: DAILY_MS,
      krakenIntervalMinutes: 1440,
      clamped: false,
    };
  }
  if (windowMs / WEEKLY_MS <= MAX_POINTS) {
    return {
      user,
      effective: 'weekly',
      bucketMs: WEEKLY_MS,
      krakenIntervalMinutes: 10_080,
      clamped: true,
    };
  }
  return {
    user,
    effective: 'monthly',
    bucketMs: MONTHLY_MS,
    krakenIntervalMinutes: KRAKEN_MAX_INTERVAL_MINUTES,
    clamped: true,
  };
}

function buildAxis(start: Date, end: Date, bucketMs: number): Date[] {
  const points: Date[] = [];
  let cur = start.getTime();
  const endMs = end.getTime();
  while (cur <= endMs) {
    points.push(new Date(cur));
    cur += bucketMs;
  }
  const last = points[points.length - 1];
  if (!last || last.getTime() !== endMs) points.push(end);
  return points;
}

function priceAtOrBefore(candles: OhlcCandle[], tMs: number): number | null {
  const target = tMs / 1000;
  let lo = 0;
  let hi = candles.length - 1;
  let bestIdx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = candles[mid];
    if (!c) break;
    if (c.t <= target) {
      bestIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (bestIdx === -1) return null;
  return candles[bestIdx]?.close ?? null;
}

function resolveWindow(template: ReportTemplate): { start: Date; end: Date } {
  const now = new Date();
  const rawEnd = template.endDate ?? now;
  const end = rawEnd.getTime() > now.getTime() ? now : rawEnd;
  let start: Date;
  if (template.rollingDays != null) {
    start = new Date(end.getTime() - template.rollingDays * DAILY_MS);
  } else if (template.startDate) {
    start = template.startDate;
  } else {
    throw new AppError(
      'INVALID_WINDOW',
      'Template has neither startDate nor rollingDays',
      400,
    );
  }
  if (start.getTime() > now.getTime()) {
    throw new AppError(
      'INVALID_WINDOW',
      'Report start cannot be in the future',
      400,
    );
  }
  if (end.getTime() <= start.getTime()) {
    throw new AppError(
      'INVALID_WINDOW',
      'Report end must be strictly after start',
      400,
    );
  }
  return { start, end };
}

export async function runReport(template: ReportTemplate): Promise<ReportRunResponse> {
  const userId = template.userId;
  const { start, end } = resolveWindow(template);

  let requestedSymbols = template.symbols;
  if (requestedSymbols.length === 0) {
    const distinct = await prisma.order.findMany({
      where: { userId },
      distinct: ['symbol'],
      select: { symbol: true },
    });
    requestedSymbols = distinct.map((o) => o.symbol);
  }

  const symbols: string[] = [];
  const inactiveSymbols: string[] = [];
  for (const s of requestedSymbols) {
    if (isKnownSymbol(s)) symbols.push(s);
    else inactiveSymbols.push(s);
  }

  const gran = pickGranularity(start, end);

  const axis = buildAxis(start, end, gran.bucketMs);

  const sinceSec = Math.floor(start.getTime() / 1000) - gran.krakenIntervalMinutes * 60;
  const ohlcMap = new Map<string, OhlcCandle[]>();
  const dataGaps: DataGap[] = [];

  if (symbols.length > 0) {
    const settled = await Promise.allSettled(
      symbols.map((s) =>
        krakenOhlc.fetch(symbolToKrakenRestPair(s), gran.krakenIntervalMinutes, sinceSec),
      ),
    );
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i]!;
      const r = settled[i]!;
      if (r.status === 'rejected') {
        ohlcMap.set(sym, []);
        dataGaps.push({
          symbol: sym,
          gapBefore: end.toISOString(),
          reason: 'fetch_failed',
        });
        continue;
      }
      const candles = r.value;
      ohlcMap.set(sym, candles);
      const first = candles[0];
      if (!first || first.t * 1000 > start.getTime() + gran.bucketMs) {
        dataGaps.push({
          symbol: sym,
          gapBefore: new Date(
            first ? first.t * 1000 : end.getTime(),
          ).toISOString(),
          reason: 'history_gap',
        });
      }
    }
  }

  const orders = await prisma.order.findMany({
    where: { userId, createdAt: { lte: end } },
    orderBy: { createdAt: 'asc' },
  });

  let cash = new Prisma.Decimal(config.INITIAL_BALANCE);
  const holdings = new Map<string, Prisma.Decimal>();
  let orderIdx = 0;

  const points: ReportPoint[] = [];
  for (const t of axis) {
    while (orderIdx < orders.length) {
      const o = orders[orderIdx];
      if (!o || o.createdAt > t) break;
      if (o.orderType === 'BUY') {
        cash = cash.sub(o.totalCost);
        holdings.set(o.symbol, (holdings.get(o.symbol) ?? new Prisma.Decimal(0)).add(o.amount));
      } else {
        cash = cash.add(o.totalCost);
        const cur = holdings.get(o.symbol) ?? new Prisma.Decimal(0);
        const next = cur.sub(o.amount);
        if (next.lte(0)) {
          holdings.delete(o.symbol);
        } else {
          holdings.set(o.symbol, next);
        }
      }
      orderIdx++;
    }

    let value = new Prisma.Decimal(cash);
    let unpriced = false;
    for (const [sym, amount] of holdings) {
      if (amount.equals(0)) continue;
      if (!isKnownSymbol(sym)) {
        unpriced = true;
        continue;
      }
      const candles = ohlcMap.get(sym) ?? [];
      const px = priceAtOrBefore(candles, t.getTime());
      if (px === null) {
        unpriced = true;
        continue;
      }
      value = value.add(amount.mul(new Prisma.Decimal(px.toString())));
    }

    points.push({
      t: t.toISOString(),
      value: unpriced ? null : value.toString(),
    });
  }

  return {
    template: {
      id: template.id,
      name: template.name,
      symbols: template.symbols,
      startDate: template.startDate ? template.startDate.toISOString() : null,
      endDate: template.endDate ? template.endDate.toISOString() : null,
      rollingDays: template.rollingDays ?? null,
    },
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity: gran.user,
      clamped: gran.clamped,
      ...(gran.clamped ? { effectiveGranularity: gran.effective } : {}),
    },
    dataGaps,
    inactiveSymbols,
    points,
  };
}
