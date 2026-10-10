import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'MASTER_ADMIN' | 'USER';
  status: 'active' | 'suspended';
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ip?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface LocoMake {
  locoId: string;
  make: string;
  notes?: string;
  updatedAt: string;
}

export interface TrialRunRecord {
  id: string;
  userId: string;
  username: string;
  title: string;
  runDate: string;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  totalFiles: number;
  totalSections: number;
  totalRowsProcessed: number;
  zeroStartRemovedCount: number;
  notFoundLocosCount: number;
  totalTrips: number;
  medhaTrips: number;
  otherFirmsTrips: number;
  summary: {
    sections: string[];
    dates: string[];
    uniqueLocosCount: number;
    removedZeroStartKeys: string[];
    dateWiseSummary: Array<{
      date: string;
      totalTrips: number;
      medhaTrips: number;
      otherFirmsTrips: number;
    }>;
    notFoundLocos: Array<{
      locoId: string;
      count: number;
    }>;
    tripDetailsPreview: Array<{
      date: string;
      locoId: string;
      trips: number;
      make: string;
      isMedha: boolean;
    }>;
  };
  reportFilename?: string;
  error?: string;
}

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  auditLogs: AuditLog[];
  locoMakes: Record<string, LocoMake>;
  trialRuns: TrialRunRecord[];
  meta: {
    initialized: boolean;
    version: string;
  };
}

const isVercel = !!process.env.VERCEL;
export const DATA_DIR = isVercel
  ? path.join('/tmp', 'locotrails_data')
  : path.resolve(process.cwd(), 'data');
export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const REPORTS_DIR = path.join(DATA_DIR, 'reports');

export class Database {
  private static data: DatabaseSchema;

  public static init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        Database.data = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse database file, resetting with backup:', err);
        Database.data = Database.createDefaultSchema();
        Database.save();
      }
    } else {
      Database.data = Database.createDefaultSchema();
      Database.save();
    }
  }

  private static createDefaultSchema(): DatabaseSchema {
    return {
      users: [],
      sessions: [],
      auditLogs: [],
      locoMakes: Database.getInitialLocoMakes(),
      trialRuns: [],
      meta: {
        initialized: false,
        version: '1.0.0',
      },
    };
  }

  private static getInitialLocoMakes(): Record<string, LocoMake> {
    const now = new Date().toISOString();
    // Pre-populate with typical Indian Railway locomotive fleet mappings
    const defaultMakes: Record<string, string> = {
      // Medha OEM
      '30001': 'Medha',
      '30002': 'Medha',
      '30003': 'Medha',
      '30015': 'Medha',
      '30022': 'Medha',
      '30105': 'Medha',
      '30120': 'Medha',
      '30145': 'Medha',
      '30200': 'Medha',
      '30210': 'Medha',
      '31001': 'Medha',
      '31005': 'Medha',
      '31012': 'Medha',
      '31024': 'Medha',
      '31250': 'Medha',
      '31300': 'Medha',
      '37001': 'Medha',
      '37050': 'Medha',
      '37100': 'Medha',
      '39001': 'Medha',

      // BHEL OEM
      '30050': 'BHEL',
      '30055': 'BHEL',
      '30060': 'BHEL',
      '30150': 'BHEL',
      '31100': 'BHEL',
      '31105': 'BHEL',
      '31120': 'BHEL',
      '32001': 'BHEL',
      '37010': 'BHEL',

      // Siemens OEM
      '30080': 'Siemens',
      '30085': 'Siemens',
      '31150': 'Siemens',
      '31155': 'Siemens',
      '37020': 'Siemens',
      '39020': 'Siemens',

      // Alstom OEM
      '60001': 'Alstom',
      '60002': 'Alstom',
      '60010': 'Alstom',
      '60025': 'Alstom',

      // ABB OEM
      '30090': 'ABB',
      '31180': 'ABB',

      // CLW / DLW
      '30075': 'CLW',
      '31090': 'DLW',
    };

    const record: Record<string, LocoMake> = {};
    for (const [locoId, make] of Object.entries(defaultMakes)) {
      record[locoId] = {
        locoId,
        make,
        notes: 'Indian Railway Fleet Master Catalogue',
        updatedAt: now,
      };
    }
    return record;
  }

  public static save() {
    try {
      const tempPath = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(Database.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // User Operations
  public static getUsers(): User[] {
    return Database.data.users;
  }

  public static getUserById(id: string): User | undefined {
    return Database.data.users.find((u) => u.id === id);
  }

  public static getUserByUsernameOrEmail(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return Database.data.users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
  }

  public static addUser(user: User): User {
    Database.data.users.push(user);
    Database.save();
    return user;
  }

  public static updateUser(id: string, updates: Partial<User>): User | null {
    const idx = Database.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    Database.data.users[idx] = { ...Database.data.users[idx], ...updates };
    Database.save();
    return Database.data.users[idx];
  }

  public static deleteUser(id: string): boolean {
    const initialLen = Database.data.users.length;
    Database.data.users = Database.data.users.filter((u) => u.id !== id);
    // Also delete active sessions
    Database.data.sessions = Database.data.sessions.filter((s) => s.userId !== id);
    Database.save();
    return Database.data.users.length < initialLen;
  }

  public static countActiveMasterAdmins(): number {
    return Database.data.users.filter(
      (u) => u.role === 'MASTER_ADMIN' && u.status === 'active'
    ).length;
  }

  // Sessions
  public static addSession(session: Session) {
    // Purge expired sessions
    const now = new Date().toISOString();
    Database.data.sessions = Database.data.sessions.filter((s) => s.expiresAt > now);
    Database.data.sessions.push(session);
    Database.save();
  }

  public static getSessionByToken(token: string): Session | undefined {
    const now = new Date().toISOString();
    return Database.data.sessions.find((s) => s.token === token && s.expiresAt > now);
  }

  public static deleteSessionByToken(token: string) {
    Database.data.sessions = Database.data.sessions.filter((s) => s.token !== token);
    Database.save();
  }

  public static deleteSessionsByUserId(userId: string) {
    Database.data.sessions = Database.data.sessions.filter((s) => s.userId !== userId);
    Database.save();
  }

  // Audit Logs
  public static logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    Database.data.auditLogs.unshift(log);
    // Keep last 1000 logs
    if (Database.data.auditLogs.length > 1000) {
      Database.data.auditLogs = Database.data.auditLogs.slice(0, 1000);
    }
    Database.save();
    return log;
  }

  public static getAuditLogs(limit = 100): AuditLog[] {
    return Database.data.auditLogs.slice(0, limit);
  }

  // Loco Makes
  public static getLocoMakeMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [key, val] of Object.entries(Database.data.locoMakes)) {
      map[key] = val.make;
    }
    return map;
  }

  public static getLocoMakesList(): LocoMake[] {
    return Object.values(Database.data.locoMakes);
  }

  public static setLocoMake(locoId: string, make: string, notes?: string): LocoMake {
    const cleanId = String(locoId).trim().replace(/\.0$/, '');
    const entry: LocoMake = {
      locoId: cleanId,
      make: make.trim(),
      notes: notes || '',
      updatedAt: new Date().toISOString(),
    };
    Database.data.locoMakes[cleanId] = entry;
    Database.save();
    return entry;
  }

  public static bulkSetLocoMakes(entries: Array<{ locoId: string; make: string; notes?: string }>) {
    const now = new Date().toISOString();
    for (const item of entries) {
      const cleanId = String(item.locoId).trim().replace(/\.0$/, '');
      if (cleanId) {
        Database.data.locoMakes[cleanId] = {
          locoId: cleanId,
          make: item.make.trim(),
          notes: item.notes || 'Bulk Import',
          updatedAt: now,
        };
      }
    }
    Database.save();
  }

  public static deleteLocoMake(locoId: string): boolean {
    const cleanId = String(locoId).trim().replace(/\.0$/, '');
    if (Database.data.locoMakes[cleanId]) {
      delete Database.data.locoMakes[cleanId];
      Database.save();
      return true;
    }
    return false;
  }

  // Trial Runs
  public static addTrialRun(run: TrialRunRecord) {
    Database.data.trialRuns.unshift(run);
    Database.save();
  }

  public static getTrialRuns(): TrialRunRecord[] {
    return Database.data.trialRuns;
  }

  public static getTrialRunById(id: string): TrialRunRecord | undefined {
    return Database.data.trialRuns.find((r) => r.id === id);
  }

  public static getMeta() {
    return Database.data.meta;
  }

  public static setMeta(meta: Partial<DatabaseSchema['meta']>) {
    Database.data.meta = { ...Database.data.meta, ...meta };
    Database.save();
  }
}
