export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'MASTER_ADMIN' | 'USER';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface LocoMakeItem {
  locoId: string;
  make: string;
  notes?: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ip?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface TrialRunSummary {
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
}

export interface TrialRunRecordItem {
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
  summary: TrialRunSummary;
  reportFilename?: string;
}

export interface SystemStats {
  userStats: {
    total: number;
    masterAdmins: number;
    regularUsers: number;
    active: number;
    suspended: number;
  };
  trialsStats: {
    totalRuns: number;
    totalTrips: number;
    totalMedhaTrips: number;
    totalOtherTrips: number;
    totalZeroStartRemoved: number;
  };
  fleetStats: {
    totalRegisteredLocos: number;
    medhaCount: number;
    otherCount: number;
  };
}
