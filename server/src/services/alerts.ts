import { Prisma } from '@prisma/client';

import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { assertKnownSymbol } from '../kraken/pair-mapping.js';
import { alertEngine } from '../alerts/engine.js';

import type { CreateAlertBody, UpdateAlertBody } from '../schemas/alerts.js';

export async function listForUser(userId: string) {
  return prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(userId: string, input: CreateAlertBody) {
  assertKnownSymbol(input.symbol);
  const created = await prisma.priceAlert.create({
    data: {
      userId,
      symbol: input.symbol,
      targetPrice: new Prisma.Decimal(input.targetPrice),
      direction: input.direction,
    },
  });
  await alertEngine.refreshAlert(created.id);
  return created;
}

export async function update(userId: string, id: string, input: UpdateAlertBody) {
  const existing = await prisma.priceAlert.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Alert not found', 404);
  }
  const updated = await prisma.priceAlert.update({
    where: { id },
    data: {
      ...(input.targetPrice !== undefined
        ? { targetPrice: new Prisma.Decimal(input.targetPrice) }
        : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  await alertEngine.refreshAlert(id);
  return updated;
}

export async function remove(userId: string, id: string) {
  const existing = await prisma.priceAlert.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Alert not found', 404);
  }
  await prisma.priceAlert.delete({ where: { id } });
  await alertEngine.refreshAlert(id);
}
