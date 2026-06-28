import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../http/errors.js';

export type TokenRole = 'TRADER' | 'ADMIN';

export interface AuthPayload extends JwtPayload {
  sub: string;
  role: TokenRole;
}

export function signToken(payload: { sub: string; role: TokenRole }): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.JWT_SECRET, options);
}

export function verifyToken(token: string): AuthPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub || !('role' in decoded)) {
      throw new AppError('INVALID_TOKEN', 'Token payload malformed', 401);
    }
    return decoded as AuthPayload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED', 'Token has expired', 401);
    }
    throw new AppError('INVALID_TOKEN', 'Invalid token', 401);
  }
}
