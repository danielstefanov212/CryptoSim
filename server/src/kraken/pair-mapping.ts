import { CATALOGUE } from '../lib/seed-catalogue.js';
import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';

interface PairEntry {
  krakenPair: string;
  krakenRestPair: string;
}

let cache: Map<string, PairEntry> | null = null;

async function loadFromDb(): Promise<Map<string, PairEntry>> {
  const rows = await prisma.cryptoAsset.findMany({
    where: { isActive: true },
    select: { symbol: true, krakenPair: true, krakenRestPair: true },
  });
  const m = new Map<string, PairEntry>();
  for (const r of rows) {
    m.set(r.symbol, { krakenPair: r.krakenPair, krakenRestPair: r.krakenRestPair });
  }
  return m;
}

function fallbackFromSeed(): Map<string, PairEntry> {
  const m = new Map<string, PairEntry>();
  for (const a of CATALOGUE) {
    m.set(a.symbol, { krakenPair: a.krakenPair, krakenRestPair: a.krakenRestPair });
  }
  return m;
}

export async function loadPairMap(): Promise<void> {
  try {
    const fromDb = await loadFromDb();
    cache = fromDb.size > 0 ? fromDb : fallbackFromSeed();
  } catch {
    cache = fallbackFromSeed();
  }
}

function ensureCache(): Map<string, PairEntry> {
  if (!cache) cache = fallbackFromSeed();
  return cache;
}

export function upsertPair(symbol: string, krakenPair: string, krakenRestPair: string): void {
  ensureCache().set(symbol, { krakenPair, krakenRestPair });
}

export function removePair(symbol: string): void {
  ensureCache().delete(symbol);
}

export function symbolToKrakenPair(symbol: string): string {
  const entry = ensureCache().get(symbol);

  if (!entry) {
    throw new AppError('UNKNOWN_SYMBOL', `Unknown or inactive symbol: ${symbol}`, 400);
  }
  return entry.krakenPair;
}

export function symbolToKrakenRestPair(symbol: string): string {
  const entry = ensureCache().get(symbol);
  if (!entry) {
    throw new AppError('UNKNOWN_SYMBOL', `Unknown or inactive symbol: ${symbol}`, 400);
  }
  return entry.krakenRestPair;
}

export function krakenPairToSymbol(krakenPair: string): string | null {
  const c = ensureCache();
  for (const [symbol, entry] of c) {
    if (entry.krakenPair === krakenPair) return symbol;
  }
  return null;
}

export function isKnownSymbol(symbol: string): boolean {
  return ensureCache().has(symbol);
}

export function assertKnownSymbol(symbol: string): void {
  if (!isKnownSymbol(symbol)) {
    throw new AppError('UNKNOWN_SYMBOL', `Unknown or inactive symbol: ${symbol}`, 400);
  }
}

export function assertKnownSymbols(symbols: string[]): void {
  const unknown = symbols.filter((s) => !isKnownSymbol(s));
  if (unknown.length > 0) {
    throw new AppError(
      'UNKNOWN_SYMBOL',
      `Unknown or inactive symbol(s): ${unknown.join(', ')}`,
      400,
    );
  }
}
