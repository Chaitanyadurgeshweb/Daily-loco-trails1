import React, { useState } from 'react';
import { TrialRunRecordItem } from '../types';
import { api } from '../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FilterX,
  Layers,
  Sparkles,
  Archive,
  Train,
  Check,
  ChevronRight,
} from 'lucide-react';

interface TrialProcessorViewProps {
  onSuccessRun?: (run: TrialRunRecordItem) => void;
}

export const TrialProcessorView: React.FC<TrialProcessorViewProps> = ({ onSuccessRun }) => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [trialFiles, setTrialFiles] = useState<File[]>([]);
  const [makeFile, setMakeFile] = useState<File | null>(null);
  const [useDefaultMake, setUseDefaultMake] = useState(true);
  const [runTitle, setRunTitle] = useState('Locomotive Trial Analysis Run');
  const [processing, setProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrialRunRecordItem | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState<'details' | 'trips' | 'summary' | 'notfound'>('trips');

  const steps = [
    'Parsing Spreadsheet Workbooks',
    'Applying Zero-Start Dead Start Filter (00:00:00 - 00:00:06)',
    'Reconciling OEM Fleet Registry (Medha vs Other Firms)',
    'Generating 4-Sheet Official Indian Railways Excel Report',
  ];

  const handleRunSample = async () => {
    setError(null);
    setProcessing(true);
    setProgressStep(1);

    try {
      setTimeout(() => setProgressStep(2), 500);
      setTimeout(() => setProgressStep(3), 1000);
      const res = await api.processSampleTrial();
      setProgressStep(4);
      setResult(res.record);
      setDownloadUrl(res.downloadUrl);
      if (onSuccessRun) onSuccessRun(res.record);
    } catch (err: any) {
      setError(err.message || 'Sample processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!zipFile && trialFiles.length === 0) {
      setError('Please select either a ZIP archive of dated folders or at least one spreadsheet file.');
      return;
    }

    setProcessing(true);
    setProgressStep(1);

    const formData = new FormData();
    formData.append('title', runTitle);

    if (zipFile) {
      formData.append('zipFile', zipFile);
    }

    if (trialFiles.length > 0) {
      trialFiles.forEach((file) => formData.append('files', file));
    }

    if (!useDefaultMake && makeFile) {
      formData.append('makeFile', makeFile);
    }

    try {
      setTimeout(() => setProgressStep(2), 600);
      setTimeout(() => setProgressStep(3), 1200);
      const res = await api.processUploadTrials(formData);
      setProgressStep(4);
      setResult(res.record);
      setDownloadUrl(res.downloadUrl);
      if (onSuccessRun) onSuccessRun(res.record);
    } catch (err: any) {
      setError(err.message || 'Failed to process trial spreadsheets');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Ingestion Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Train className="w-5 h-5 text-amber-400" /> Locomotive Trial Batch Processor
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports ZIP folders containing dated section subfolders or direct multi-file Excel uploads.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunSample}
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            1-Click Load Sample Dataset
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Processing Error</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleProcessUpload} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Trial Run Title / Batch Identifier
            </label>
            <input
              type="text"
              value={runTitle}
              onChange={(e) => setRunTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., Secunderabad & Kazipet Trial Batch #104"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ZIP Archive Option */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
                  <Archive className="w-4 h-4 text-amber-400" /> Option A: Dated Folders (.ZIP)
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Upload a ZIP archive with dated folders (e.g. 2025-05-10/Secunderabad/*.xlsx)
                </p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setZipFile(e.target.files[0]);
                      setTrialFiles([]);
                    }
                  }}
                  className="hidden"
                  id="zip-upload-input"
                />
                <label
                  htmlFor="zip-upload-input"
                  className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors truncate"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span className="truncate">{zipFile ? zipFile.name : 'Choose .ZIP Archive'}</span>
                </label>
              </div>
            </div>

            {/* Direct Excel Spreadsheets Option */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Option B: Spreadsheets (.xlsx, .xls)
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Select one or multiple trial spreadsheets directly from your computer
                </p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.xlsm,.csv"
                  onChange={(e) => {
                    if (e.target.files) {
                      setTrialFiles(Array.from(e.target.files));
                      setZipFile(null);
                    }
                  }}
                  className="hidden"
                  id="files-upload-input"
                />
                <label
                  htmlFor="files-upload-input"
                  className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors truncate"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span className="truncate">
                    {trialFiles.length > 0 ? `${trialFiles.length} files selected` : 'Select Spreadsheets'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* OEM Make Mapping Configuration */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" /> Locomotive OEM Make Details Reference
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseDefaultMake(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    useDefaultMake ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Use Master Fleet Registry
                </button>
                <button
                  type="button"
                  onClick={() => setUseDefaultMake(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    !useDefaultMake ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Custom File
                </button>
              </div>
            </div>

            {!useDefaultMake ? (
              <div className="mt-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setMakeFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Using built-in persistent Indian Railways fleet registry (Medha, BHEL, Siemens, Alstom, ABB).
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Locomotive Trials...</span>
                </>
              ) : (
                <>
                  <Train className="w-4 h-4" />
                  <span>Execute Analysis & Generate Indian Railways Excel Report</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Processing Stepper Animation */}
        {processing && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" /> Pipeline Progress
            </div>
            <div className="space-y-2">
              {steps.map((st, idx) => {
                const isDone = progressStep > idx + 1;
                const isCurrent = progressStep === idx + 1;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950'
                          : isCurrent
                          ? 'bg-amber-500 text-slate-950 animate-pulse'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span className={isCurrent ? 'text-amber-400 font-semibold' : isDone ? 'text-slate-200' : 'text-slate-500'}>
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Trial Results & Multi-Tab Preview */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Top Banner with Download Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Processing Complete
              </div>
              <h3 className="text-xl font-bold text-white">{result.title}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Analyzed {result.totalRowsProcessed} raw entries across {result.totalSections} sections. Generated formatted 4-sheet workbook.
              </p>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all shrink-0"
              >
                <Download className="w-4 h-4" />
                Download Formatted Excel (.xlsx)
              </a>
            )}
          </div>

          {/* Key Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">Total Valid Trips</span>
              <div className="text-xl font-bold text-white mt-1">{result.totalTrips}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">Medha Trips</span>
              <div className="text-xl font-bold text-amber-400 mt-1">{result.medhaTrips}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">Other Firms Trips</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">{result.otherFirmsTrips}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <FilterX className="w-3.5 h-3.5" /> Zero-Start Purged
              </span>
              <div className="text-xl font-bold text-rose-400 mt-1">{result.zeroStartRemovedCount}</div>
            </div>
          </div>

          {/* Worksheet Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-semibold gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveSheetTab('trips')}
              className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSheetTab === 'trips'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sheet 2: Loco Trip Details ({result.summary.tripDetailsPreview.length})
            </button>
            <button
              onClick={() => setActiveSheetTab('summary')}
              className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSheetTab === 'summary'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sheet 3: Date Wise Summary ({result.summary.dateWiseSummary.length})
            </button>
            <button
              onClick={() => setActiveSheetTab('notfound')}
              className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSheetTab === 'notfound'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sheet 4: Not Found Locos ({result.summary.notFoundLocos.length})
            </button>
            <button
              onClick={() => setActiveSheetTab('details')}
              className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeSheetTab === 'details'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sheet 1: Multi-Section Structure ({result.summary.sections.length} Sections)
            </button>
          </div>

          {/* Tab 1: Loco Trip Details */}
          {activeSheetTab === 'trips' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Sorted by Date & Locomotive number. Note: Rows where Make is NOT Medha are highlighted in OEM Amber/Orange as specified in the Python application rules.
              </div>
              <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFF00] text-slate-950 font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Loco ID</th>
                      <th className="py-2.5 px-3">Trips Count</th>
                      <th className="py-2.5 px-3">Make / Manufacturer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.summary.tripDetailsPreview.map((item, idx) => {
                      const isNotMedha = !item.isMedha;
                      return (
                        <tr
                          key={idx}
                          className={isNotMedha ? 'bg-[#FFBF00]/15 text-slate-100' : 'hover:bg-slate-800/40 text-slate-200'}
                        >
                          <td className="py-2 px-3 font-mono">{item.date}</td>
                          <td className="py-2 px-3 font-semibold">{item.locoId}</td>
                          <td className="py-2 px-3 font-mono">{item.trips}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                item.isMedha
                                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                  : 'bg-[#FFBF00] text-slate-950'
                              }`}
                            >
                              {item.make}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Date Wise Summary */}
          {activeSheetTab === 'summary' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Aggregated trial trip counts per date with breakdown between Medha and Other Firms.
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFFF00] text-slate-950 font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Total Trip Count</th>
                      <th className="py-2.5 px-4">Medha Trips</th>
                      <th className="py-2.5 px-4">Other Firms Locos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.summary.dateWiseSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                        <td className="py-2.5 px-4 font-mono font-medium">{item.date}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{item.totalTrips}</td>
                        <td className="py-2.5 px-4 text-amber-400 font-semibold">{item.medhaTrips}</td>
                        <td className="py-2.5 px-4 text-cyan-400 font-semibold">{item.otherFirmsTrips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Not Found Locos */}
          {activeSheetTab === 'notfound' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Locomotives present in trial spreadsheets that were not found in the OEM reference catalogue.
              </div>
              {result.summary.notFoundLocos.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
                  All locomotives were matched to registered OEMs!
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFFF00] text-slate-950 font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Loco Id</th>
                        <th className="py-2.5 px-4">Trip Occurrence Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.summary.notFoundLocos.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                          <td className="py-2 px-4 font-mono font-bold text-amber-400">{item.locoId}</td>
                          <td className="py-2 px-4">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Multi-Section Structure Preview */}
          {activeSheetTab === 'details' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Multi-section side-by-side trial matrix layout rendered in Excel Sheet 1 with Purple section banners and Yellow column headers.
              </div>
              <div className="flex flex-wrap gap-2">
                {result.summary.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs"
                  >
                    <span className="w-3 h-3 rounded-full bg-[#800080]" />
                    <span className="font-semibold text-slate-200">{sec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
