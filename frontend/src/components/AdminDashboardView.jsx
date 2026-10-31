import React from 'react';
import { 
  BookOpen, Clock, Users, AlertTriangle, RefreshCw, PlusCircle, 
  ArrowRight, CheckCircle2, ShieldCheck, Terminal, TrendingUp
} from 'lucide-react';

export default function AdminDashboardView({ 
  books, 
  loans, 
  fines, 
  auditLogs, 
  onNavigate 
}) {
  const totalStock = books.reduce((sum, b) => sum + (b.total || 0), 0);
  const availableStock = books.reduce((sum, b) => sum + (b.available || 0), 0);
  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = activeLoans.filter(l => l.status === 'Overdue');
  const unpaidFines = fines.filter(f => f.status === 'Unpaid');
  const totalFineAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Central Campus Library Management Console
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              Administrative & Desk Operations
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Real-time monitoring of campus library inventory, circulation velocity, strict 30-day term policies, and fee ledgers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('admin_in_library')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Books in Library ({availableStock})</span>
            </button>
            <button
              onClick={() => onNavigate('admin_checked_out')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Books Checked Out ({activeLoans.length})</span>
            </button>
            <button
              onClick={() => onNavigate('admin_circulation')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Circulation Desk</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Books In Library */}
        <div 
          onClick={() => onNavigate('admin_in_library')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Books in Library</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400">
            {availableStock} <span className="text-xs font-normal text-slate-400">on shelf</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {books.length} accessioned titles
          </div>
        </div>

        {/* Books Checked Out */}
        <div 
          onClick={() => onNavigate('admin_checked_out')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Books Checked Out</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
            {activeLoans.length} <span className="text-xs font-normal text-slate-400">circulating</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Under 30-day fixed loan policy
          </div>
        </div>

        {/* Overdue Defaults */}
        <div 
          onClick={() => onNavigate('admin_fines')}
          className={`p-5 rounded-2xl border shadow-sm transition-all cursor-pointer group ${
            overdueLoans.length > 0 
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 hover:border-rose-400' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Defaults</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600 dark:text-rose-400">
            {overdueLoans.length} <span className="text-xs font-normal text-slate-400">defaulter(s)</span>
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
            Accounts frozen until return
          </div>
        </div>

        {/* Pending Fee Ledger */}
        <div 
          onClick={() => onNavigate('admin_fines')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Dues</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
            ₹{totalFineAmount.toFixed(0)} <span className="text-xs font-normal text-slate-400">accrued</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ₹5.00/day penalty enforcement
          </div>
        </div>
      </div>

      {/* Two Column Layout: Defaulters Spotlight & Audit Feed */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Defaulters Action Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                Active Overdue Defaulters (30+ Days)
              </h3>
              <span className="text-xs text-slate-500">Student accounts requiring desk verification</span>
            </div>
            <button
              onClick={() => onNavigate('admin_fines')}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              View All Defaulters →
            </button>
          </div>

          <div className="space-y-3">
            {overdueLoans.map(loan => (
              <div
                key={loan.id}
                className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{loan.patronName}</span>
                    <span className="font-mono text-slate-500">{loan.patronId}</span>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    "{loan.bookTitle}" • <strong>5 Days Overdue</strong> (Fine: ₹25.00)
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('admin_circulation')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shrink-0"
                >
                  Process Return
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Audit Activity Feed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                Live Transaction Log
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin_logs')}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Full Forensic Log →
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {auditLogs.slice(0, 5).map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-start gap-2.5"
              >
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                  {log.time}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-snug">
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
