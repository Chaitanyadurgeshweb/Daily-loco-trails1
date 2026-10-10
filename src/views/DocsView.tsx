import React from 'react';
import {
  BookOpen,
  Train,
  ShieldCheck,
  FileSpreadsheet,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  Download,
} from 'lucide-react';

export const DocsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" /> Locomotive Trials Analytics Engine — Architecture & Guide
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete engineering reference for the converted Indian Railways locomotive trial processing pipeline.
        </p>
      </div>

      {/* Section 1: Business Logic Preservation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <Train className="w-4 h-4" /> 1. Preserved Python Processing Pipeline
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The original desktop application (<code className="text-amber-300 font-mono">DailyLocoTrailsTool.py</code>)
          was designed for trial engineers analyzing locomotive runs across railway divisions.
          All mathematical rules, string normalizations, and report structures have been faithfully ported:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-slate-200 mb-1">Locomotive ID & Direction Normalization</h4>
            <p className="text-slate-400 leading-relaxed">
              • Strips floating-point artifacts (<code className="text-amber-400 font-mono">30001.0 → 30001</code>).<br />
              • Normalizes direction tokens (<code className="text-amber-400 font-mono">NOM / Nominal</code> and <code className="text-amber-400 font-mono">REV / Reverse</code>).<br />
              • Numeric natural sort keys by extracting digit sequences.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-slate-200 mb-1">Critical Zero-Start Dead Start Filtration</h4>
            <p className="text-slate-400 leading-relaxed">
              During trial telemetry capture, erroneous sensor dead-starts occur at midnight.
              The algorithm evaluates departure timestamp <code className="text-amber-400 font-mono">from</code>:<br />
              <code className="text-amber-400 font-mono">00:00:00 &lt;= time &lt;= 00:00:06</code><br />
              Any trial matching this window has its <code className="text-slate-200">(loco, direction)</code> pair excluded from final reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Four-Sheet Excel Structure */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
          <FileSpreadsheet className="w-4 h-4" /> 2. Exact 4-Sheet Report Output
        </div>
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Sheet 1: "Loco Details"</div>
            <p className="text-slate-400">
              Renders side-by-side trial blocks for every division section (Secunderabad, Kazipet, Vijayawada, etc.).
              Includes merged section titles filled in Purple (<code className="text-purple-400 font-mono">#800080</code>) with bold white Arial text,
              Yellow column headers (<code className="text-amber-300 font-mono">#FFFF00</code>), and 2-width Gray separator columns (<code className="text-slate-400 font-mono">#B2B2B2</code>).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Sheet 2: "Loco Trip Details"</div>
            <p className="text-slate-400">
              Columns: <code className="text-slate-300">Date | Loco ID | Trips | Make</code>.
              Groups trial directions per locomotive date. Rows where manufacturer is not Medha are highlighted in OEM Amber (<code className="text-amber-500 font-mono">#FFBF00</code>).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Sheet 3: "Date Wise Summary"</div>
            <p className="text-slate-400">
              Columns: <code className="text-slate-300">Date | Total Trip Count | Medha Trips | Other Firms Locos</code>.
              Provides executive telemetry for trial directors.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Sheet 4: "Not Found Locos"</div>
            <p className="text-slate-400">
              Columns: <code className="text-slate-300">Loco Id | Trip Count</code>. Flags all unmapped locomotives for catalogue maintenance.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Security & RBAC Enforcement */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <ShieldCheck className="w-4 h-4" /> 3. Security, Authentication & Role Matrix
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Capability / Operation</th>
                <th className="py-2.5 px-3 text-amber-400">MASTER_ADMIN</th>
                <th className="py-2.5 px-3 text-cyan-400">REGULAR USER</th>
                <th className="py-2.5 px-3">Enforcement Layer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3">Upload & Process Trial Files</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Server session auth</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Download Generated Workbooks</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">All reports</td>
                <td className="py-2.5 px-3 text-slate-400 font-bold">Own reports only</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Server RBAC & ownership check</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Access User Directory & Management</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">DENIED (403)</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">requireMasterAdmin middleware</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Create / Suspend Accounts</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">DENIED (403)</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Centralized server gate</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Demote / Delete Last Master Admin</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">BLOCKED (Safety)</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">DENIED</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">countActiveMasterAdmins &gt; 1 check</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">View Security Audit Trail</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">DENIED (403)</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">requireMasterAdmin middleware</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Vercel Deployment & Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <Terminal className="w-4 h-4" /> 4. Vercel Cloud Deployment Ready Package
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Configured with <code className="text-emerald-300 font-mono">vercel.json</code> rewrites,
              Vercel Serverless Function adapter (<code className="text-emerald-300 font-mono">api/index.ts</code>), and writable <code className="text-emerald-300 font-mono">/tmp</code> fallback.
            </p>
          </div>

          <a
            href="/api/download/vercel-zip"
            download="locotrails-pro-vercel.zip"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Vercel ZIP Archive</span>
          </a>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
          <div className="text-slate-500"># Deploy in 3 simple commands using Vercel CLI:</div>
          <div className="text-amber-400">unzip locotrails-pro-vercel.zip -d locotrails-pro</div>
          <div className="text-amber-400">cd locotrails-pro</div>
          <div className="text-emerald-400">vercel --prod</div>
        </div>
      </div>
    </div>
  );
};
