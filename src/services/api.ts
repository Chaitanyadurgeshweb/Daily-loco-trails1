import { UserProfile, LocoMakeItem, AuditLogItem, TrialRunRecordItem, SystemStats } from '../types';

const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('locotrails_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('locotrails_token', token);
    } else {
      localStorage.removeItem('locotrails_token');
    }
  }

  public getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      (err as any).code = data.code;
      throw err;
    }

    return data as T;
  }

  // Auth
  public async login(identifier: string, password: string) {
    const res = await this.request<{ token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  public async getMe() {
    return this.request<{ user: UserProfile }>('/auth/me');
  }

  public async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  public async getSystemStatus() {
    return this.request<{ initialized: boolean; hasMasterAdmin: boolean; totalUsers: number }>('/auth/system-status');
  }

  // Admin
  public async getUsers() {
    return this.request<{ users: UserProfile[] }>('/admin/users');
  }

  public async createUser(userData: {
    username: string;
    email: string;
    fullName?: string;
    role: 'MASTER_ADMIN' | 'USER';
    password: string;
  }) {
    return this.request<{ message: string; user: UserProfile }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  public async updateUser(
    id: string,
    updates: { fullName?: string; email?: string; role?: 'MASTER_ADMIN' | 'USER'; status?: 'active' | 'suspended' }
  ) {
    return this.request<{ message: string; user: UserProfile }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async deleteUser(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  public async resetUserPassword(id: string, newPassword: string) {
    return this.request<{ message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  public async getAuditLogs(limit = 100) {
    return this.request<{ logs: AuditLogItem[] }>(`/admin/audit-logs?limit=${limit}`);
  }

  public async getSystemStats() {
    return this.request<SystemStats>('/admin/system-stats');
  }

  // Trials
  public async processSampleTrial() {
    return this.request<{ success: boolean; record: TrialRunRecordItem; downloadUrl: string }>(
      '/trials/process-sample',
      {
        method: 'POST',
      }
    );
  }

  public async processUploadTrials(formData: FormData) {
    return this.request<{ success: boolean; record: TrialRunRecordItem; downloadUrl: string }>('/trials/process', {
      method: 'POST',
      body: formData,
    });
  }

  public async getTrialRuns() {
    return this.request<{ runs: TrialRunRecordItem[] }>('/trials/runs');
  }

  public async getTrialRunById(id: string) {
    return this.request<{ run: TrialRunRecordItem }>(`/trials/runs/${id}`);
  }

  // Fleet
  public async getFleetLocos() {
    return this.request<{ makes: LocoMakeItem[] }>('/fleet/locos');
  }

  public async setFleetLoco(locoId: string, make: string, notes?: string) {
    return this.request<{ make: LocoMakeItem }>('/fleet/locos', {
      method: 'POST',
      body: JSON.stringify({ locoId, make, notes }),
    });
  }

  public async deleteFleetLoco(id: string) {
    return this.request<{ message: string }>(`/fleet/locos/${id}`, {
      method: 'DELETE',
    });
  }

  public async uploadFleetFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ message: string; totalImported: number }>('/fleet/upload', {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
