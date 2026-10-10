import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Train,
  LogOut,
  KeyRound,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  Shield,
  Download,
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  currentTab: string;
  onRunSample: () => void;
  sampleRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onRunSample,
  sampleRunning,
}) => {
  const { user, isMasterAdmin, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Telemetry & Fleet Dashboard', subtitle: 'Real-time overview of locomotive trials, zero-start filters, and OEM shares' };
      case 'trial-processor':
        return { title: 'Locomotive Trial Run Processor', subtitle: 'Automated ingestion, dead-start filtration, and multi-sheet Excel generation' };
      case 'reports':
        return { title: 'Historical Reports Archive', subtitle: 'Browse, audit, and re-download official locomotive trial workbooks' };
      case 'fleet':
        return { title: 'Locomotive Fleet & OEM Registry', subtitle: 'Master mapping of locomotive numbers to manufacturers (Medha, BHEL, Siemens, etc.)' };
      case 'users':
        return { title: 'Master Admin User Management', subtitle: 'Role-based access control, account activation, and credential administration' };
      case 'audit-logs':
        return { title: 'Security & Access Audit Logs', subtitle: 'Immutable trail of administrative actions, file processing, and authentication events' };
      case 'docs':
        return { title: 'Engineering & Architecture Guide', subtitle: 'Comprehensive reference for zero-start mathematics, multi-section format, and RBAC security' };
      default:
        return { title: 'LocoTrails Pro', subtitle: 'Indian Railways' };
    }
  };

  const { title, subtitle } = getPageTitle(currentTab);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters');
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwdSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Title & context */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            {title}
            {isMasterAdmin && currentTab.includes('user') && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                RESTRICTED
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block truncate max-w-md">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Actions and User Menu */}
      <div className="flex items-center gap-3">
        {/* Vercel Deploy Ready ZIP Download */}
        <a
          href="/api/download/vercel-zip"
          download="locotrails-pro-vercel.zip"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all shadow-sm"
          title="Download complete Vercel deploy ready project zip"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Vercel Deploy ZIP</span>
        </a>

        {/* Quick Sample Run Button */}
        <button
          onClick={onRunSample}
          disabled={sampleRunning}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          title="Run authentic Secunderabad, Kazipet & Vijayawada sample trial datasets"
        >
          {sampleRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Processing Dataset...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Sample Trial Run</span>
            </>
          )}
        </button>

        {/* System Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Core Engine Active</span>
        </div>

        {/* Change password button */}
        <button
          onClick={() => setShowPasswordModal(true)}
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition-colors"
          title="Change Password"
        >
          <KeyRound className="w-4 h-4" />
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700/60 text-slate-300 text-xs font-medium transition-colors"
          title="Sign out of system"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Change Security Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {pwdSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
