import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { assertKnownSymbol } from '../kraken/pair-mapping.js';

import type { CreateWatchlistBody, UpdateWatchlistBody } from '../schemas/watchlist.ts';

export async function listForUser(userId: string) {
  return prisma.watchlist.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(userId: string, input: CreateWatchlistBody) {
  assertKnownSymbol(input.symbol);
  try {
    return await prisma.watchlist.create({
      data: { userId, symbol: input.symbol, notes: input.notes ?? null },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      throw new AppError('CONFLICT', `${input.symbol} already in watchlist`, 409);
    }
    throw err;
  }
}

export async function updateNotes(userId: string, id: string, input: UpdateWatchlistBody) {
  const existing = await prisma.watchlist.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Watchlist entry not found', 404);
  }
  return prisma.watchlist.update({
    where: { id },
    data: { notes: input.notes },
  });
}

export async function remove(userId: string, id: string) {
  const deleted = await prisma.watchlist.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new AppError('NOT_FOUND', 'Watchlist entry not found', 404);
  }
}
