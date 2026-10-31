import React from 'react';
import { 
  BookOpen, Plus, ArrowLeftRight, Users, AlertTriangle, 
  TrendingUp, Clock, ChevronRight, ShieldCheck, Database
} from 'lucide-react';

export default function DashboardView({
  books = [],
  loans = [],
  fines = [],
  students = [],
  hrmsUsersCount = 1,
  auditLogs = [],
  onNavigate,
  onOpenUpiModal,
  onOpenWaiveModal
}) {
  const totalTitles = books.length;
  const totalCopies = books.reduce((sum, b) => sum + (b.total !== undefined ? Number(b.total) : (Number(b.total_copies) || 0)), 0);
  const availableCopies = books.reduce((sum, b) => sum + (b.available !== undefined ? Number(b.available) : (Number(b.total) || 0)), 0);
  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = loans.filter(l => l.status === 'Overdue');
  const unpaidFines = fines.filter(f => f.status === 'Unpaid' || f.status === 'Pending');
  const totalFineAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const activePatrons = students.filter(s => s.status !== 'Frozen').length;
  const frozenPatrons = students.filter(s => s.status === 'Frozen').length;

  const metrics = [
    {
      label: 'All Books',
      value: totalTitles,
      sub: `${availableCopies} on shelf (${totalCopies} copies)`,
      tab: 'all_books',
      highlight: false,
      color: 'blue'
    },
    {
      label: 'Active Loans',
      value: activeLoans.length,
      sub: 'Standard 30-day window',
      tab: 'book_issues_returns',
      highlight: false,
      color: 'blue'
    },
    {
      label: 'Overdue Defaults',
      value: overdueLoans.length,
      sub: overdueLoans.length > 0 ? 'Accounts on penalty hold' : 'No overdue accounts',
      tab: 'book_issues_returns',
      highlight: overdueLoans.length > 0,
      color: overdueLoans.length > 0 ? 'rose' : 'blue'
    },
    {
      label: 'Pending Fines',
      value: `₹${totalFineAmount.toFixed(0)}`,
      sub: `${unpaidFines.length} fee ledgers (₹5/day)`,
      tab: 'book_issues_returns',
      highlight: totalFineAmount > 0,
      color: totalFineAmount > 0 ? 'rose' : 'blue'
    },
    {
      label: 'Library Users',
      value: (typeof hrmsUsersCount === 'number') ? hrmsUsersCount : 1,
      sub: 'Mapped strictly via HRMS',
      tab: 'user_management',
      highlight: false,
      color: 'blue'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Heading Only & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-blue-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time library holdings, circulation desk volume, and member accounts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('book_creation')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Book</span>
          </button>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="px-3.5 py-2 border border-blue-200 hover:bg-blue-50/80 hover:border-blue-300 text-blue-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
            <span>Issues & Returns</span>
          </button>
        </div>
      </div>

      {/* Blue Themed Aligned Metric Strip */}
      <div className="border-t border-b border-blue-100 divide-y sm:divide-y-0 sm:divide-x divide-blue-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 py-2 bg-blue-50/30">
        {metrics.map((m, i) => (
          <div
            key={i}
            onClick={() => onNavigate(m.tab)}
            className="p-4 cursor-pointer hover:bg-blue-50/70 transition-colors flex flex-col justify-between"
          >
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block mb-1">
              {m.label}
            </span>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${m.highlight ? 'text-rose-600' : 'text-blue-950'}`}>
                {m.value}
              </div>
              <span className="text-[11px] text-blue-600/80 font-medium mt-1 block">
                {m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Width Data Section: Active Circulations */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-blue-100">
          <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Active Circulations ({activeLoans.length})</span>
          </h2>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Circulation Desk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-14 text-center text-xs text-blue-500 bg-blue-50/20 rounded-xl border border-dashed border-blue-200">
            No books currently on loan. All physical copies are resting on library shelves.
          </div>
        ) : (
          <div className="border border-blue-100 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="divide-y divide-blue-50">
              {activeLoans.map(loan => {
                const isOverdue = loan.status === 'Overdue';
                return (
                  <div
                    key={loan.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-blue-950 text-sm">
                        {loan.bookTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>Borrower: <strong className="text-blue-900 font-semibold">{loan.patronName}</strong> ({loan.patronId})</span>
                        <span>•</span>
                        <span>Barcode / Accession: <span className="font-mono text-slate-700">{loan.barcode || loan.accession || 'N/A'}</span></span>
                        <span>•</span>
                        <span>Due: <strong className="text-slate-700">{loan.dueDateFormatted || loan.dueDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                      {isOverdue ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                          On Schedule
                        </span>
                      )}
                      <button
                        onClick={() => onNavigate('book_issues_returns')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                      >
                        Desk Ops →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between text-xs text-blue-700 border-t border-blue-100">
          <span className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>MongoDB Atlas Connected • Dynamic Persistent Catalog</span>
          </span>
          <button
            onClick={() => onNavigate('settings')}
            className="text-blue-600 font-semibold hover:text-blue-800 hover:underline"
          >
            System Settings →
          </button>
        </div>
      </div>
    </div>
  );
}
