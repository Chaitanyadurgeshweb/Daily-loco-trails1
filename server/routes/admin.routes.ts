import express from 'express';
import crypto from 'crypto';
import { Database } from '../db.js';
import { AuthService, requireAuth, requireMasterAdmin } from '../auth.js';

export const adminRouter = express.Router();

// Enforce authentication & Master Admin role on all admin routes
adminRouter.use(requireAuth, requireMasterAdmin);

/**
 * List all users
 */
adminRouter.get('/users', (req, res) => {
  const users = Database.getUsers().map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    lastLoginIp: u.lastLoginIp,
  }));
  res.json({ users });
});

/**
 * Create a new user
 */
adminRouter.post('/users', async (req, res) => {
  const { username, email, fullName, role, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  // Validate format
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUsername)) {
    return res.status(400).json({
      error: 'Username must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Check unique username or email
  const existing = Database.getUserByUsernameOrEmail(cleanUsername) || Database.getUserByUsernameOrEmail(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A user with this username or email already exists' });
  }

  const assignedRole = role === 'MASTER_ADMIN' ? 'MASTER_ADMIN' : 'USER';
  const hash = await AuthService.hashPassword(password);

  const newUser = {
    id: crypto.randomUUID(),
    username: cleanUsername,
    email: cleanEmail,
    fullName: fullName ? String(fullName).trim() : cleanUsername,
    role: assignedRole as 'MASTER_ADMIN' | 'USER',
    status: 'active' as const,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  Database.addUser(newUser);

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'USER_CREATED',
    details: `Created user ${newUser.username} (${newUser.role})`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
    },
  });
});

/**
 * Update user details, role, or active status
 */
adminRouter.patch('/users/:id', (req, res) => {
  const { id } = req.params;
  const targetUser = Database.getUserById(id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { fullName, email, role, status } = req.body;
  const updates: any = {};

  if (fullName !== undefined) updates.fullName = String(fullName).trim();
  if (email !== undefined) updates.email = String(email).trim().toLowerCase();

  // Safety protection: Cannot demote or suspend the last active Master Admin!
  const isDemotingOrSuspending =
    (role && role !== 'MASTER_ADMIN' && targetUser.role === 'MASTER_ADMIN') ||
    (status && status !== 'active' && targetUser.status === 'active' && targetUser.role === 'MASTER_ADMIN');

  if (isDemotingOrSuspending) {
    const activeAdmins = Database.countActiveMasterAdmins();
    if (activeAdmins <= 1) {
      return res.status(400).json({
        error: 'Operation rejected: Cannot demote or suspend the only active Master Administrator.',
      });
    }
  }

  if (role !== undefined) {
    if (role === 'MASTER_ADMIN' || role === 'USER') {
      updates.role = role;
    }
  }

  if (status !== undefined) {
    if (status === 'active' || status === 'suspended') {
      updates.status = status;
      if (status === 'suspended') {
        // Invalidate all active sessions for suspended user
        Database.deleteSessionsByUserId(targetUser.id);
      }
    }
  }

  const updated = Database.updateUser(id, updates);

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'USER_UPDATED',
    details: `Updated user ${targetUser.username}: ${JSON.stringify(updates)}`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({
    message: 'User updated successfully',
    user: {
      id: updated!.id,
      username: updated!.username,
      email: updated!.email,
      fullName: updated!.fullName,
      role: updated!.role,
      status: updated!.status,
      createdAt: updated!.createdAt,
    },
  });
});

/**
 * Reset a user's password
 */
adminRouter.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const targetUser = Database.getUserById(id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const newHash = await AuthService.hashPassword(newPassword);
  Database.updateUser(id, { passwordHash: newHash });

  // Invalidate any old sessions
  Database.deleteSessionsByUserId(targetUser.id);

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'USER_PASSWORD_RESET',
    details: `Administrator reset password for user: ${targetUser.username}`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({ message: `Password reset successfully for ${targetUser.username}` });
});

/**
 * Delete a user
 */
adminRouter.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const targetUser = Database.getUserById(id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Safety check: Cannot delete the last active Master Admin
  if (targetUser.role === 'MASTER_ADMIN') {
    const activeAdmins = Database.countActiveMasterAdmins();
    if (activeAdmins <= 1) {
      return res.status(400).json({
        error: 'Operation rejected: Cannot delete the only active Master Administrator.',
      });
    }
  }

  Database.deleteUser(id);

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'USER_DELETED',
    details: `Deleted user ${targetUser.username} (${targetUser.role})`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({ message: `User ${targetUser.username} deleted successfully` });
});

/**
 * Audit logs
 */
adminRouter.get('/audit-logs', (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = Database.getAuditLogs(limit);
  res.json({ logs });
});

/**
 * System analytics and telemetry
 */
adminRouter.get('/system-stats', (req, res) => {
  const users = Database.getUsers();
  const trialRuns = Database.getTrialRuns();
  const makes = Database.getLocoMakesList();

  const totalZeroRemoved = trialRuns.reduce((acc, r) => acc + (r.zeroStartRemovedCount || 0), 0);
  const totalTrips = trialRuns.reduce((acc, r) => acc + (r.totalTrips || 0), 0);
  const totalMedhaTrips = trialRuns.reduce((acc, r) => acc + (r.medhaTrips || 0), 0);
  const totalOtherTrips = trialRuns.reduce((acc, r) => acc + (r.otherFirmsTrips || 0), 0);

  res.json({
    userStats: {
      total: users.length,
      masterAdmins: users.filter((u) => u.role === 'MASTER_ADMIN').length,
      regularUsers: users.filter((u) => u.role === 'USER').length,
      active: users.filter((u) => u.status === 'active').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
    },
    trialsStats: {
      totalRuns: trialRuns.length,
      totalTrips,
      totalMedhaTrips,
      totalOtherTrips,
      totalZeroStartRemoved: totalZeroRemoved,
    },
    fleetStats: {
      totalRegisteredLocos: makes.length,
      medhaCount: makes.filter((m) => m.make.toLowerCase().trim() === 'medha').length,
      otherCount: makes.filter((m) => m.make.toLowerCase().trim() !== 'medha').length,
    },
  });
});
