import React, { useState } from 'react';
import { 
  ArrowUpRight, Clock, AlertTriangle, CheckCircle, RefreshCw, 
  Calendar, User, BookOpen, Search, ArrowRight 
} from 'lucide-react';

export default function BooksCheckedOutView({ 
  loans, 
  onReturnBook, 
  onToast 
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'overdue'
  const [searchTerm, setSearchTerm] = useState('');

  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueCount = activeLoans.filter(l => l.status === 'Overdue').length;
  const onTimeCount = activeLoans.filter(l => l.status !== 'Overdue').length;

  const filteredLoans = activeLoans.filter(loan => {
    if (filterMode === 'overdue' && loan.status !== 'Overdue') return false;
    if (filterMode === 'active' && loan.status === 'Overdue') return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      loan.bookTitle.toLowerCase().includes(q) ||
      loan.patronName.toLowerCase().includes(q) ||
      loan.patronId.toLowerCase().includes(q) ||
      (loan.accession && loan.accession.toLowerCase().includes(q)) ||
      (loan.bookBarcode && loan.bookBarcode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Circulating Asset Tracking</span>
              <span>•</span>
              <span>Checked Out Volumes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              Books Currently Checked Out
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
              Complete inventory of books that have gone out of the library, actively circulating with students and faculty under 30-day loan terms.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <span className="text-xs text-blue-100 block font-semibold uppercase">Total Outside</span>
              <span className="text-3xl font-heading font-extrabold text-white">
                {activeLoans.length}
              </span>
              <span className="text-[10px] text-blue-200 block">Volumes Out</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-400/30 text-center">
              <span className="text-xs text-rose-200 block font-semibold uppercase">Overdue</span>
              <span className="text-3xl font-heading font-extrabold text-rose-300">
                {overdueCount}
              </span>
              <span className="text-[10px] text-rose-200 block">30+ Days Late</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search checked out books by Title, Student Roll No, Name or Barcode..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Checked Out ({activeLoans.length})
          </button>
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            On-Time ({onTimeCount})
          </button>
          <button
            onClick={() => setFilterMode('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'overdue'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Overdue 30+ Days ({overdueCount})
          </button>
        </div>
      </div>

      {/* Checked Out Books Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Books In Student Possession
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredLoans.length} Loans Listed
          </span>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200">No books found in this filter</h4>
            <p className="text-xs text-slate-400 mt-1">All checked out items are circulating smoothly</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Book Out / Accession</th>
                  <th className="py-3.5 px-4">Borrower Student</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">Strict 30-Day Due Date</th>
                  <th className="py-3.5 px-4">Status & Countdown</th>
                  <th className="py-3.5 px-4 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLoans.map(loan => {
                  const isOverdue = loan.status === 'Overdue';
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{loan.bookTitle}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: <span className="font-bold text-blue-600 dark:text-blue-400">{loan.accession}</span> • {loan.bookBarcode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{loan.patronName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{loan.patronId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {loan.issueDateFormatted || '15 Oct 2026'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {loan.dueDateFormatted || '14 Nov 2026'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isOverdue ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>5 Days Overdue (₹25 fine)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Active • 15 Days Left</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onReturnBook(loan.bookBarcode || loan.accession)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Return to Library</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
