import React, { useEffect, useState } from 'react';
import { TrialRunRecordItem } from '../types';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Download,
  Search,
  Calendar,
  FilterX,
  Layers,
  Clock,
  Eye,
  X,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [runs, setRuns] = useState<TrialRunRecordItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRun, setSelectedRun] = useState<TrialRunRecordItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    try {
      const res = await api.getTrialRuns();
      setRuns(res.runs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const filteredRuns = runs.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.username.toLowerCase().includes(search.toLowerCase()) ||
      r.runDate.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" /> Historical Reports Archive
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Search, inspect, and re-download previously processed official Indian Railways trial reports.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports or dates..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading reports archive...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No trial reports match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Report Details</th>
                  <th className="py-3 px-4">Trial Date</th>
                  <th className="py-3 px-4">Processed By</th>
                  <th className="py-3 px-4">Sections</th>
                  <th className="py-3 px-4">Total Trips</th>
                  <th className="py-3 px-4">Zero-Starts Filtered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      <div>{r.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.reportFilename}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{r.runDate}</td>
                    <td className="py-3 px-4 text-slate-300">{r.username}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {r.totalSections} sections
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {r.totalTrips}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        (M: {r.medhaTrips} | O: {r.otherFirmsTrips})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-rose-400 font-mono">
                      -{r.zeroStartRemovedCount} records
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRun(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1"
                        title="View report breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <a
                        href={`/api/trials/download/${r.id}`}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold inline-flex items-center gap-1"
                        title="Download official .xlsx"
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

      {/* Drill-down Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedRun.title}</h3>
                <p className="text-xs text-slate-400 font-mono">Created: {selectedRun.createdAt}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Total Trips</span>
                <div className="text-lg font-bold text-white mt-1">{selectedRun.totalTrips}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Medha Trips</span>
                <div className="text-lg font-bold text-amber-400 mt-1">{selectedRun.medhaTrips}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Other Firms</span>
                <div className="text-lg font-bold text-cyan-400 mt-1">{selectedRun.otherFirmsTrips}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-rose-400">Zero-Start Filtered</span>
                <div className="text-lg font-bold text-rose-400 mt-1">{selectedRun.zeroStartRemovedCount}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Sections Included</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedRun.summary.sections.map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Date Wise Summary Breakdown</h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFF00] text-slate-950 font-bold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Total Trips</th>
                      <th className="py-2 px-3">Medha</th>
                      <th className="py-2 px-3">Other Firms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedRun.summary.dateWiseSummary.map((d, i) => (
                      <tr key={i} className="text-slate-200">
                        <td className="py-2 px-3 font-mono">{d.date}</td>
                        <td className="py-2 px-3 font-bold">{d.totalTrips}</td>
                        <td className="py-2 px-3 text-amber-400">{d.medhaTrips}</td>
                        <td className="py-2 px-3 text-cyan-400">{d.otherFirmsTrips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <a
                href={`/api/trials/download/${selectedRun.id}`}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel Workbook
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
