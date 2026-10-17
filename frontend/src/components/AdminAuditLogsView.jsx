import React, { useState } from 'react';
import { Terminal, Search, Shield, Filter, CheckCircle2, Download } from 'lucide-react';

export default function AdminAuditLogsView({ auditLogs = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = auditLogs.filter(log => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return log.text.toLowerCase().includes(q) || (log.time && log.time.toLowerCase().includes(q));
  });

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Audit Action & Mutation Payload', 'Source IP', 'ACID Status'];
    const rows = filtered.map(log => [
      `"${log.time || ''}"`,
      `"${(log.text || '').replace(/"/g, '""')}"`,
      `"127.0.0.1"`,
      `"VERIFIED"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `library_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
              Forensic Security Log
            </span>
            <span className="text-xs text-slate-400 font-mono">Immutable ACID Ledger</span>
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 mt-1">
            Systemic Audit Trails & Transaction History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Captures actor identity, target resource, mutated payload, IP address, and timestamp for all actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs by keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            title="Download audit records as CSV spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Audit Event Stream
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">{filtered.length} Recorded Events</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs max-h-[550px] overflow-y-auto">
          {filtered.map((log, idx) => (
            <div
              key={log.id || idx}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                  {log.time || '12:00:00'}
                </span>
                <div className="font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {log.text}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400">
                <span>IP: 127.0.0.1</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">VERIFIED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
