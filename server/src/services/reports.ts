import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { assertKnownSymbols } from '../kraken/pair-mapping.js';

import type { CreateReportBody, UpdateReportBody } from '../schemas/reports.js';

export async function listForUser(userId: string) {
  return prisma.reportTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOwned(userId: string, id: string) {
  const row = await prisma.reportTemplate.findFirst({ where: { id, userId } });
  if (!row) {
    throw new AppError('NOT_FOUND', 'Report template not found', 404);
  }
  return row;
}

function assertExactlyOneAnchor(merged: {
  startDate: Date | null;
  rollingDays: number | null;
}): void {
  const hasStart = merged.startDate !== null;
  const hasRolling = merged.rollingDays !== null;
  if (hasStart && hasRolling) {
    throw new AppError(
      'VALIDATION',
      'Template cannot have both startDate and rollingDays',
      400,
    );
  }
  if (!hasStart && !hasRolling) {
    throw new AppError(
      'VALIDATION',
      'Template must have either startDate or rollingDays',
      400,
    );
  }
}

function assertWindowOrdering(start: Date | null, end: Date | null): void {
  if (start && end && start.getTime() >= end.getTime()) {
    throw new AppError(
      'INVALID_WINDOW',
      'endDate must be strictly after startDate',
      400,
    );
  }
}

function assertDatesNotInFuture(start: Date | null, end: Date | null): void {
  const now = Date.now();
  if (start && start.getTime() > now) {
    throw new AppError('INVALID_WINDOW', 'startDate cannot be in the future', 400);
  }
  if (end && end.getTime() > now) {
    throw new AppError('INVALID_WINDOW', 'endDate cannot be in the future', 400);
  }
}

export async function create(userId: string, input: CreateReportBody) {
  assertKnownSymbols(input.symbols);

  const startDate = input.startDate ? new Date(input.startDate) : null;
  const endDate = input.endDate ? new Date(input.endDate) : null;
  const rollingDays = input.rollingDays ?? null;
  assertWindowOrdering(startDate, endDate);
  assertDatesNotInFuture(startDate, endDate);

  return prisma.reportTemplate.create({
    data: {
      userId,
      name: input.name,
      symbols: input.symbols,
      startDate,
      endDate,
      rollingDays,
    },
  });
}

export async function update(userId: string, id: string, input: UpdateReportBody) {
  const existing = await getOwned(userId, id);
  if (input.symbols) assertKnownSymbols(input.symbols);

  const mergedStartDate =
    'startDate' in input
      ? input.startDate
        ? new Date(input.startDate)
        : null
      : existing.startDate;
  const mergedEndDate =
    'endDate' in input
      ? input.endDate
        ? new Date(input.endDate)
        : null
      : existing.endDate;
  const mergedRollingDays =
    'rollingDays' in input ? (input.rollingDays ?? null) : existing.rollingDays;
  assertExactlyOneAnchor({
    startDate: mergedStartDate,
    rollingDays: mergedRollingDays,
  });
  assertWindowOrdering(mergedStartDate, mergedEndDate);
  assertDatesNotInFuture(mergedStartDate, mergedEndDate);

  return prisma.reportTemplate.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.symbols !== undefined ? { symbols: input.symbols } : {}),
      ...('startDate' in input ? { startDate: mergedStartDate } : {}),
      ...('endDate' in input ? { endDate: mergedEndDate } : {}),
      ...('rollingDays' in input ? { rollingDays: mergedRollingDays } : {}),
    },
  });
}

export async function remove(userId: string, id: string) {
  await getOwned(userId, id);
  await prisma.reportTemplate.delete({ where: { id } });
}
