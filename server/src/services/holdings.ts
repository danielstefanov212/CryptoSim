import { Prisma } from '@prisma/client';

import { prisma } from '../db.js';
import { krakenLive } from '../kraken/live-client.js';

export interface HoldingDto {
  id: string;
  symbol: string;
  amount: Prisma.Decimal;
  averageBuyPrice: Prisma.Decimal;
  currentPrice: Prisma.Decimal | null;
  currentValue: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listForUser(userId: string, symbol?: string): Promise<HoldingDto[]> {
  const rows = await prisma.holding.findMany({
    where: { userId, ...(symbol ? { symbol } : {}) },
    orderBy: { symbol: 'asc' },
  });

  return rows.map((h) => {
    const currentPrice = krakenLive.tryGetCachedPrice(h.symbol);
    const currentValue = currentPrice ? h.amount.mul(currentPrice) : null;
    return {
      id: h.id,
      symbol: h.symbol,
      amount: h.amount,
      averageBuyPrice: h.averageBuyPrice,
      currentPrice,
      currentValue,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    };
  });
}
