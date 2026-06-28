import { Prisma, type User } from '@prisma/client';

import { hashPassword } from '../auth/password.js';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { alertEngine } from '../alerts/engine.js';
import type { AdminUpdateUserBody } from '../schemas/users.js';

export type SafeUser = Omit<User, 'password'>;

export function safeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...rest } = user;
  return rest;
}

async function findUserOrThrow(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  return user;
}

export async function getCurrent(userId: string): Promise<SafeUser> {
  const user = await findUserOrThrow(userId);
  return safeUser(user);
}

export async function resetAccount(userId: string): Promise<SafeUser> {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.priceAlert.deleteMany({ where: { userId } });
    await tx.watchlist.deleteMany({ where: { userId } });
    await tx.reportTemplate.deleteMany({ where: { userId } });
    await tx.holding.deleteMany({ where: { userId } });
    await tx.order.deleteMany({ where: { userId } });
    return tx.user.update({
      where: { id: userId },
      data: { balance: new Prisma.Decimal(config.INITIAL_BALANCE) },
    });
  });
  alertEngine.purgeUser(userId);

  return safeUser(updated);
}

export async function listAll(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(safeUser);
}

export async function getById(id: string): Promise<SafeUser> {
  const user = await findUserOrThrow(id);
  return safeUser(user);
}

export async function adminUpdate(id: string, patch: AdminUpdateUserBody): Promise<SafeUser> {
  await findUserOrThrow(id);

  const data: Prisma.UserUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.email !== undefined) data.email = patch.email;
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.password !== undefined) data.password = await hashPassword(patch.password);

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    return safeUser(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('CONFLICT', 'Email already in use', 409);
    }
    throw err;
  }
}

export async function adminDelete(id: string): Promise<void> {
  await findUserOrThrow(id);
  await prisma.user.delete({ where: { id } });
}
