import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { TrialProcessorView } from './views/TrialProcessorView';
import { ReportsView } from './views/ReportsView';
import { FleetView } from './views/FleetView';
import { UserManagementView } from './views/UserManagementView';
import { AuditLogsView } from './views/AuditLogsView';
import { DocsView } from './views/DocsView';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading, isMasterAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sampleRunning, setSampleRunning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRunSampleDataset = async () => {
    setSampleRunning(true);
    try {
      const res = await api.processSampleTrial();
      showToast(`Sample dataset processed successfully: ${res.record.totalTrips} trips recorded across ${res.record.totalSections} sections.`);
      setCurrentTab('trial-processor');
    } catch (err: any) {
      showToast(err.message || 'Sample trial processing failed', 'error');
    } finally {
      setSampleRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono tracking-wider text-slate-300">
          INITIALIZING LOCOTRAILS PRO PLATFORM...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Guard admin-only tabs
  let effectiveTab = currentTab;
  if (!isMasterAdmin && (currentTab === 'users' || currentTab === 'audit-logs')) {
    effectiveTab = 'dashboard';
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={effectiveTab}
        setCurrentTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={effectiveTab}
          onRunSample={handleRunSampleDataset}
          sampleRunning={sampleRunning}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {effectiveTab === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentTab}
                onRunSample={handleRunSampleDataset}
                sampleRunning={sampleRunning}
              />
            )}

            {effectiveTab === 'trial-processor' && (
              <TrialProcessorView
                onSuccessRun={() => {
                  showToast('Locomotive trial batch completed and formatted report generated.');
                }}
              />
            )}

            {effectiveTab === 'reports' && <ReportsView />}

            {effectiveTab === 'fleet' && <FleetView />}

            {effectiveTab === 'users' && isMasterAdmin && <UserManagementView />}

            {effectiveTab === 'audit-logs' && isMasterAdmin && <AuditLogsView />}

            {effectiveTab === 'docs' && <DocsView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
