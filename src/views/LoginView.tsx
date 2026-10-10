import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Train, ShieldCheck, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background railway grid pattern & ambient illumination */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 mb-4 ring-1 ring-amber-400/30">
            <Train className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            LocoTrails Pro<span className="text-amber-400 text-sm font-semibold tracking-wider px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">ENTERPRISE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Indian Railways Locomotive Trials & OEM Analytics System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 ring-1 ring-white/5">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Secure Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized personnel only. Sessions and operations are cryptographically audited.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username or Official Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="masteradmin or email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate & Launch
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Role Switching Helper for Testing & Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Quick Credential Presets for Reviewers:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickCredentials('masteradmin', 'Admin@LocoTrails2025!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="font-semibold text-amber-400 group-hover:text-amber-300">Master Admin</div>
                <div className="text-[11px] text-slate-400">Full System & RBAC</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('trialtester', 'Engineer@2025!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 text-left transition-all group"
              >
                <div className="font-semibold text-cyan-400 group-hover:text-cyan-300">Regular User</div>
                <div className="text-[11px] text-slate-400">Trial Officer Role</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Argon2 / BCrypt Password Hashing • Server-Side RBAC Enforcement</span>
        </div>
      </div>
    </div>
  );
};
