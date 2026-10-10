import React, { useEffect, useState } from 'react';
import { SystemStats, TrialRunRecordItem } from '../types';
import { api } from '../services/api';
import {
  Train,
  PlaySquare,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  FilterX,
  Gauge,
  CheckCircle2,
  Clock,
  Download,
  Building2,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onRunSample: () => void;
  sampleRunning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onRunSample,
  sampleRunning,
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<TrialRunRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, runsRes] = await Promise.all([
        api.getSystemStats().catch(() => null),
        api.getTrialRuns().catch(() => ({ runs: [] })),
      ]);
      if (statsRes) setStats(statsRes);
      setRecentRuns(runsRes.runs.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTrips = stats?.trialsStats.totalTrips || 0;
  const medhaTrips = stats?.trialsStats.totalMedhaTrips || 0;
  const otherTrips = stats?.trialsStats.totalOtherTrips || 0;
  const medhaPct = totalTrips > 0 ? Math.round((medhaTrips / totalTrips) * 100) : 0;
  const otherPct = totalTrips > 0 ? 100 - medhaPct : 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Train className="w-3.5 h-3.5" />
            Indian Railways Daily Locomotive Trials
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            High-Precision Traction Trials & OEM Reconciliation
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Automates the ingestion of dated trial subfolders, applies standardized zero-start
            calibration filtering (00:00:00 – 00:00:06), and compiles multi-section reports separating
            Medha OEM performance from other manufacturers.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('trial-processor')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <PlaySquare className="w-4 h-4" />
              Launch Trial Run Processor
            </button>
            <button
              onClick={onRunSample}
              disabled={sampleRunning}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {sampleRunning ? 'Analyzing Sample...' : 'Run Verified Sample Dataset'}
            </button>
            <a
              href="/api/trials/sample-dataset.zip"
              className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 font-medium text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Raw Test Dataset (.zip)
            </a>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trial Runs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Trial Runs
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {stats?.trialsStats.totalRuns ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full automated runs recorded</span>
            </div>
          </div>
        </div>

        {/* Total Trips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Validated Trips
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Train className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {stats?.trialsStats.totalTrips ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Across all locomotive classes
            </div>
          </div>
        </div>

        {/* Zero-Start Filtration Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Zero-Start Artifacts Filtered
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <FilterX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">
              {stats?.trialsStats.totalZeroStartRemoved ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              00:00:00 - 00:00:06 dead starts purged
            </div>
          </div>
        </div>

        {/* Registered Fleet */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OEM Registry Fleet
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {stats?.fleetStats.totalRegisteredLocos ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Locos mapped to OEMs
            </div>
          </div>
        </div>
      </div>

      {/* OEM Fleet Share & Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" /> OEM Performance Share in Trials
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown of trial trip volume between Medha Servo Drives and other manufacturers (BHEL, Siemens, Alstom)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-slate-300">Medha ({medhaTrips} trips)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-600" />
              <span className="text-slate-300">Other Firms ({otherTrips} trips)</span>
            </div>
          </div>
        </div>

        {/* Distribution Progress Bar */}
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${medhaPct || 50}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Medha: ${medhaPct}%`}
          />
          <div
            style={{ width: `${otherPct || 50}%` }}
            className="bg-amber-600 transition-all duration-500"
            title={`Other Firms: ${otherPct}%`}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>Medha Servo Drives: {medhaPct}%</span>
          <span>Other OEM Suppliers: {otherPct}%</span>
        </div>
      </div>

      {/* Recent Trial Runs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Recent Trial Processing Runs
            </h3>
            <p className="text-xs text-slate-400">
              Outputs formatted matching official Indian Railways 4-sheet reporting
            </p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View All Reports <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRuns.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            No trial runs processed yet. Use the 1-Click Sample Trial Run to test.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-3">Run Title</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Sections</th>
                  <th className="py-3 px-3">Total Trips</th>
                  <th className="py-3 px-3">Zero-Starts Filtered</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      <div className="font-semibold">{run.title}</div>
                      <div className="text-[10px] text-slate-400">by {run.username}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{run.runDate}</td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {run.totalSections} sections
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {run.totalTrips} trips
                    </td>
                    <td className="py-3 px-3 text-rose-400 font-mono font-medium">
                      -{run.zeroStartRemovedCount} records
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={`/api/trials/download/${run.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.XLSX</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
