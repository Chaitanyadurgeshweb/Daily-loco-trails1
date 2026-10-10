import React, { useEffect, useState } from 'react';
import { LocoMakeItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Search,
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const FleetView: React.FC = () => {
  const { isMasterAdmin } = useAuth();
  const [makes, setMakes] = useState<LocoMakeItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMakeFilter, setSelectedMakeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [locoId, setLocoId] = useState('');
  const [make, setMake] = useState('Medha');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFleet = async () => {
    try {
      const res = await api.getFleetLocos();
      setMakes(res.makes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const handleSaveLoco = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!locoId || !make) return;

    try {
      await api.setFleetLoco(locoId, make, notes);
      setMsg({ type: 'success', text: `Locomotive ${locoId} saved as ${make}` });
      setLocoId('');
      setNotes('');
      setShowAddModal(false);
      loadFleet();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save locomotive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Remove locomotive ${id} from fleet catalogue?`)) return;
    try {
      await api.deleteFleetLoco(id);
      setMsg({ type: 'success', text: `Locomotive ${id} deleted` });
      loadFleet();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete locomotive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setMsg(null);
    try {
      const res = await api.uploadFleetFile(file);
      setMsg({ type: 'success', text: res.message });
      loadFleet();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Bulk upload failed' });
    }
  };

  const filteredMakes = makes.filter((m) => {
    const matchSearch =
      m.locoId.toLowerCase().includes(search.toLowerCase()) ||
      m.make.toLowerCase().includes(search.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()));

    if (selectedMakeFilter === 'ALL') return matchSearch;
    if (selectedMakeFilter === 'MEDHA') return matchSearch && m.make.toLowerCase() === 'medha';
    if (selectedMakeFilter === 'OTHER') return matchSearch && m.make.toLowerCase() !== 'medha';
    return matchSearch;
  });

  const uniqueOEMs = Array.from(new Set(makes.map((m) => m.make))).sort();

  return (
    <div className="space-y-6">
      {/* Header & Upload Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" /> Locomotive Fleet & OEM Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Maintains OEM manufacturer mappings (Medha Servo Drives, BHEL, Siemens, Alstom, etc.)
              used during trial reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>Import Make Details (.xlsx)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Register Locomotive</span>
            </button>
          </div>
        </div>

        {msg && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Locomotive Number or OEM..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <button
              onClick={() => setSelectedMakeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedMakeFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({makes.length})
            </button>
            <button
              onClick={() => setSelectedMakeFilter('MEDHA')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedMakeFilter === 'MEDHA'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Medha Only
            </button>
            <button
              onClick={() => setSelectedMakeFilter('OTHER')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedMakeFilter === 'OTHER'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Other Firms
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading locomotive fleet catalogue...
          </div>
        ) : filteredMakes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No locomotives found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Locomotive Number</th>
                  <th className="py-3 px-4">OEM Manufacturer</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Notes / Catalog Source</th>
                  <th className="py-3 px-4">Last Updated</th>
                  {isMasterAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredMakes.map((m) => {
                  const isMedha = m.make.toLowerCase().trim() === 'medha';
                  return (
                    <tr key={m.locoId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-100 text-sm">
                        {m.locoId}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            isMedha
                              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          {m.make}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {isMedha ? 'Core Trial Benchmark' : 'Other OEM Supplier'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{m.notes || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(m.updatedAt).toLocaleDateString()}
                      </td>
                      {isMasterAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(m.locoId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Locomotive Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" /> Register Locomotive OEM
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoco} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Locomotive Number / ID
                </label>
                <input
                  type="text"
                  value={locoId}
                  onChange={(e) => setLocoId(e.target.value)}
                  placeholder="e.g. 30045"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OEM Manufacturer (Make)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['Medha', 'BHEL', 'Siemens', 'Alstom', 'ABB', 'CLW'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setMake(preset)}
                      className={`p-1.5 rounded text-xs font-semibold border ${
                        make === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Or enter custom OEM"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes / Specification
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. WAP-7 3-Phase IGBT Traction"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
