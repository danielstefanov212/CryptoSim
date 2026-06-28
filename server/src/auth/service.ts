import { Prisma, Role, type User } from '@prisma/client';

import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { signToken } from './jwt.js';
import { hashPassword, verifyPassword } from './password.js';
import { safeUser } from '../services/users.js';
import type { LoginBody, RegisterBody } from '../schemas/auth.js';

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

function toAuthResponse(user: User): AuthResponse {
  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: safeUser(user) };
}

export async function register(input: RegisterBody): Promise<AuthResponse> {
  const passwordHash = await hashPassword(input.password);
  try {
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: Role.TRADER,
      },
    });
    return toAuthResponse(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('CONFLICT', 'An account with this email already exists', 409);
    }
    throw err;
  }
}

export async function login(input: LoginBody): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  const ok = await verifyPassword(input.password, user.password);
  if (!ok) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  return toAuthResponse(user);
}
