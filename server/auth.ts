import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Database, User } from './db.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

const SALT_ROUNDS = 12;
const SESSION_DURATION_HOURS = 24 * 7; // 7 days

// Brute-force rate limiting: ip -> { attempts: number, lockUntil: number }
const loginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static createSession(user: User, req?: Request): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + SESSION_DURATION_HOURS);

    Database.addSession({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      expiresAt: expires.toISOString(),
      createdAt: new Date().toISOString(),
      ip: req?.ip || req?.socket?.remoteAddress,
      userAgent: req?.headers['user-agent'] as string,
    });

    return token;
  }

  public static checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const record = loginAttempts.get(ip);
    if (!record) return { allowed: true };

    const now = Date.now();
    if (record.lockUntil > now) {
      const wait = Math.ceil((record.lockUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds: wait };
    }

    if (record.lockUntil <= now && record.attempts >= 5) {
      loginAttempts.delete(ip);
    }
    return { allowed: true };
  }

  public static recordFailedAttempt(ip: string) {
    const now = Date.now();
    const record = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
    record.attempts += 1;
    if (record.attempts >= 5) {
      // Lock for 15 minutes after 5 consecutive failures
      record.lockUntil = now + 15 * 60 * 1000;
    }
    loginAttempts.set(ip, record);
  }

  public static recordSuccessfulLogin(ip: string) {
    loginAttempts.delete(ip);
  }

  /**
   * Initializes the default Master Admin if no users exist.
   */
  public static async bootstrapMasterAdmin() {
    Database.init();
    const users = Database.getUsers();
    if (users.length === 0) {
      const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@LocoTrails2025!';
      const hash = await AuthService.hashPassword(defaultPassword);
      const masterAdmin: User = {
        id: crypto.randomUUID(),
        username: 'masteradmin',
        email: 'admin@locotrails.railway.gov',
        fullName: 'Chief Trial Engineer & Admin',
        role: 'MASTER_ADMIN',
        status: 'active',
        passwordHash: hash,
        createdAt: new Date().toISOString(),
      };
      Database.addUser(masterAdmin);

      // Create a demonstration regular user so roles can be immediately evaluated
      const userHash = await AuthService.hashPassword('Engineer@2025!');
      const demoUser: User = {
        id: crypto.randomUUID(),
        username: 'trialtester',
        email: 'engineer@railway.gov',
        fullName: 'Senior Locomotive Testing Officer',
        role: 'USER',
        status: 'active',
        passwordHash: userHash,
        createdAt: new Date().toISOString(),
      };
      Database.addUser(demoUser);

      Database.setMeta({ initialized: true });
      Database.logAudit({
        userId: masterAdmin.id,
        username: masterAdmin.username,
        action: 'SYSTEM_BOOTSTRAP',
        details: 'Initial Master Admin and test accounts created securely.',
        status: 'SUCCESS',
      });

      console.log('----------------------------------------------------');
      console.log('Secure Master Admin initialized:');
      console.log('Username: masteradmin');
      console.log('Email: admin@locotrails.railway.gov');
      console.log('Default Password: Admin@LocoTrails2025!');
      console.log('----------------------------------------------------');
      console.log('Regular Trial Officer initialized:');
      console.log('Username: trialtester');
      console.log('Default Password: Engineer@2025!');
      console.log('----------------------------------------------------');
    }
  }
}

// Authentication Middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.sessionToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in.',
      code: 'UNAUTHORIZED',
    });
  }

  const session = Database.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      error: 'Session has expired or is invalid. Please sign in again.',
      code: 'SESSION_EXPIRED',
    });
  }

  const user = Database.getUserById(session.userId);
  if (!user) {
    Database.deleteSessionByToken(token);
    return res.status(401).json({
      error: 'User account not found.',
      code: 'USER_NOT_FOUND',
    });
  }

  if (user.status !== 'active') {
    Database.deleteSessionsByUserId(user.id);
    return res.status(403).json({
      error: 'Your account has been suspended by the Master Administrator.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

// Master Admin Authorization Middleware
export function requireMasterAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  if (req.user.role !== 'MASTER_ADMIN') {
    Database.logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      details: `Attempted to access administrative endpoint ${req.method} ${req.originalUrl}`,
      ip: req.ip || req.socket?.remoteAddress,
      status: 'WARNING',
    });
    return res.status(403).json({
      error: 'Administrative privileges required. Access denied.',
      code: 'FORBIDDEN',
    });
  }

  next();
}
