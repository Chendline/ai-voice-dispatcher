import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import type { PublicUser, User, UserRole } from './types.js';
import type { SqliteWorkspaceStore } from './db.js';

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE_NAME = 'aegis_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function hashPassword(password: string, saltOverride?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltOverride || randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return { hash: derivedKey.toString('hex'), salt };
}

export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  try {
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(derivedKey, Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function formatSessionCookie(token: string, maxAgeSeconds: number = SESSION_DURATION_SECONDS, isSecure: boolean = false): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isSecure) parts.push('Secure');
  return parts.join('; ');
}

export function formatClearCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _hash, salt: _salt, ...rest } = user;
  return rest;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionToken?: string;
    }
  }
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
}

export function createAuthMiddleware(store: SqliteWorkspaceStore, requireAuthByDefault = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractAuthToken(req);
    if (token) {
      const user = store.getUserBySessionToken(token);
      if (user) {
        req.user = toPublicUser(user);
        req.sessionToken = token;
      }
    }

    if (requireAuthByDefault && !req.user) {
      // Allow health, auth endpoints and public config
      const isPublic = req.path === '/health' ||
        req.path.startsWith('/auth/') ||
        req.path === '/auth';

      if (!isPublic) {
        return res.status(401).json({ error: 'Authentication required.', code: 'unauthorized' });
      }
    }

    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.', code: 'unauthorized' });
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions.', code: 'forbidden' });
    }
    next();
  };
}

export function requireWorkspaceAuth(store: SqliteWorkspaceStore, ...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If the system has 0 registered users, allow unauthenticated setup/bootstrap
    if (store.countUsers() === 0) {
      return next();
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.', code: 'unauthorized' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions.', code: 'forbidden' });
    }
    next();
  };
}
