import { Prisma } from '@prisma/client';

import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { krakenLive } from '../kraken/live-client.js';
import { assertKnownSymbol } from '../kraken/pair-mapping.js';

import type { OrderBodyInput } from '../schemas/orders.js';

function isConcurrencyConflict(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === 'P2034';
  }
  const e = err as { code?: string } | null;
  return e?.code === '40P01' || e?.code === '40001';
}

function asConflict(err: unknown): never {
  throw new AppError(
    'CONCURRENT_TRADE',
    'Trade aborted by a concurrent transaction; please retry',
    409,
  );
}

export async function listForUser(userId: string, symbol?: string) {
  return prisma.order.findMany({
    where: { userId, ...(symbol ? { symbol } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function buy(userId: string, input: OrderBodyInput) {
  assertKnownSymbol(input.symbol);
  const price = krakenLive.getCachedPrice(input.symbol);
  const amount = new Prisma.Decimal(input.amount);
  const totalCost = amount.mul(price.toString());

  try {
    return await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: userId, balance: { gte: totalCost } },
        data: { balance: { decrement: totalCost } },
      });
      if (debited.count === 0) {
        throw new AppError('INSUFFICIENT_BALANCE', 'Insufficient balance for this purchase', 400);
      }

      const existing = await tx.holding.findUnique({
        where: { userId_symbol: { userId, symbol: input.symbol } },
      });
      const prevAmount = existing?.amount ?? new Prisma.Decimal(0);
      const prevAvg = existing?.averageBuyPrice ?? new Prisma.Decimal(0);
      const newAmount = prevAmount.add(amount);
      const newAvg = existing
        ? prevAmount.mul(prevAvg).add(amount.mul(price.toString())).div(newAmount)
        : new Prisma.Decimal(price.toString());

      if (existing) {
        await tx.holding.update({
          where: { userId_symbol: { userId, symbol: input.symbol } },
          data: { amount: newAmount, averageBuyPrice: newAvg },
        });
      } else {
        await tx.holding.create({
          data: {
            userId,
            symbol: input.symbol,
            amount: newAmount,
            averageBuyPrice: newAvg,
          },
        });
      }

      return tx.order.create({
        data: {
          userId,
          orderType: 'BUY',
          symbol: input.symbol,
          amount,
          priceAtExecution: new Prisma.Decimal(price.toString()),
          totalCost,
        },
      });
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (isConcurrencyConflict(err)) asConflict(err);
    throw err;
  }
}

export async function sell(userId: string, input: OrderBodyInput) {
  assertKnownSymbol(input.symbol);
  const price = krakenLive.getCachedPrice(input.symbol);
  const amount = new Prisma.Decimal(input.amount);
  const totalValue = amount.mul(price.toString());

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const decremented = await tx.holding.updateMany({
        where: { userId, symbol: input.symbol, amount: { gte: amount } },
        data: { amount: { decrement: amount } },
      });
      if (decremented.count === 0) {
        throw new AppError('INSUFFICIENT_HOLDING', `Insufficient ${input.symbol} holding for this sale`, 400);
      }

      const after = await tx.holding.findUnique({
        where: { userId_symbol: { userId, symbol: input.symbol } },
      });
      if (after && after.amount.equals(0)) {
        await tx.holding.deleteMany({
          where: { userId, symbol: input.symbol, amount: 0 },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: totalValue } },
      });

      return tx.order.create({
        data: {
          userId,
          orderType: 'SELL',
          symbol: input.symbol,
          amount,
          priceAtExecution: new Prisma.Decimal(price.toString()),
          totalCost: totalValue,
        },
      });
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (isConcurrencyConflict(err)) asConflict(err);
    throw err;
  }
}
