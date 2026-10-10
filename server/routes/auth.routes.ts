import express from 'express';
import { Database } from '../db.js';
import { AuthService, requireAuth } from '../auth.js';

export const authRouter = express.Router();

authRouter.get('/system-status', (req, res) => {
  const users = Database.getUsers();
  const activeAdmins = Database.countActiveMasterAdmins();
  res.json({
    initialized: users.length > 0,
    hasMasterAdmin: activeAdmins > 0,
    totalUsers: users.length,
  });
});

authRouter.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  // Check rate limit
  const rateLimit = AuthService.checkRateLimit(ip);
  if (!rateLimit.allowed) {
    Database.logAudit({
      userId: 'anonymous',
      username: identifier,
      action: 'LOGIN_RATE_LIMITED',
      details: `Rate limit hit from IP ${ip}. Locked for ${rateLimit.retryAfterSeconds}s`,
      ip,
      status: 'WARNING',
    });
    return res.status(429).json({
      error: `Too many failed attempts. Please retry after ${rateLimit.retryAfterSeconds} seconds.`,
      code: 'RATE_LIMITED',
    });
  }

  const user = Database.getUserByUsernameOrEmail(identifier);
  if (!user) {
    AuthService.recordFailedAttempt(ip);
    Database.logAudit({
      userId: 'anonymous',
      username: identifier,
      action: 'LOGIN_FAILURE',
      details: `Failed sign-in attempt for non-existent identifier: ${identifier}`,
      ip,
      status: 'FAILURE',
    });
    return res.status(401).json({ error: 'Invalid credentials provided', code: 'INVALID_CREDENTIALS' });
  }

  if (user.status !== 'active') {
    Database.logAudit({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUSPENDED_ATTEMPT',
      details: `Suspended user attempted login: ${user.username}`,
      ip,
      status: 'WARNING',
    });
    return res.status(403).json({
      error: 'Account is suspended. Please contact the Master Administrator.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  const isValid = await AuthService.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    AuthService.recordFailedAttempt(ip);
    Database.logAudit({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_FAILURE',
      details: `Incorrect password for user: ${user.username}`,
      ip,
      status: 'FAILURE',
    });
    return res.status(401).json({ error: 'Invalid credentials provided', code: 'INVALID_CREDENTIALS' });
  }

  AuthService.recordSuccessfulLogin(ip);

  // Update last login
  Database.updateUser(user.id, {
    lastLoginAt: new Date().toISOString(),
    lastLoginIp: ip,
  });

  const token = AuthService.createSession(user, req);

  // Set secure cookie
  res.cookie('sessionToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  Database.logAudit({
    userId: user.id,
    username: user.username,
    action: 'LOGIN_SUCCESS',
    details: `User logged in successfully (${user.role})`,
    ip,
    status: 'SUCCESS',
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  if (req.sessionToken) {
    Database.deleteSessionByToken(req.sessionToken);
  }
  res.clearCookie('sessionToken');

  if (req.user) {
    Database.logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'LOGOUT',
      details: `User signed out`,
      ip: req.ip,
      status: 'SUCCESS',
    });
  }

  res.json({ message: 'Signed out successfully' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const isMatch = await AuthService.verifyPassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHash = await AuthService.hashPassword(newPassword);
  Database.updateUser(user.id, { passwordHash: newHash });

  Database.logAudit({
    userId: user.id,
    username: user.username,
    action: 'PASSWORD_CHANGE',
    details: 'User updated their own password',
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({ message: 'Password updated successfully' });
});
