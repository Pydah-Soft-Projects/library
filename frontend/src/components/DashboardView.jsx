import React from 'react';
import { 
  BookOpen, Plus, ArrowLeftRight, Users, AlertTriangle, 
  TrendingUp, Clock, ChevronRight
} from 'lucide-react';

export default function DashboardView({
  books = [],
  loans = [],
  fines = [],
  students = [],
  auditLogs = [],
  onNavigate,
  onOpenUpiModal,
  onOpenWaiveModal
}) {
  const totalCopies = books.reduce((sum, b) => sum + (b.total || 0), 0);
  const availableCopies = books.reduce((sum, b) => sum + (b.available || 0), 0);
  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = activeLoans.filter(l => l.status === 'Overdue');
  const unpaidFines = fines.filter(f => f.status === 'Unpaid');
  const totalFineAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const activePatrons = students.filter(s => s.status !== 'Frozen').length;
  const frozenPatrons = students.filter(s => s.status === 'Frozen').length;

  const metrics = [
    {
      label: 'All Books',
      value: books.length,
      sub: `${availableCopies} on shelf (${totalCopies} total)`,
      tab: 'all_books',
      highlight: false
    },
    {
      label: 'Active Loans',
      value: activeLoans.length,
      sub: 'Standard 30-day window',
      tab: 'book_issues_returns',
      highlight: false
    },
    {
      label: 'Overdue Defaults',
      value: overdueLoans.length,
      sub: overdueLoans.length > 0 ? 'Accounts on hold' : 'No late returns',
      tab: 'book_issues_returns',
      highlight: overdueLoans.length > 0
    },
    {
      label: 'Pending Fines',
      value: `₹${totalFineAmount.toFixed(0)}`,
      sub: `${unpaidFines.length} fee ledgers (₹5/day)`,
      tab: 'book_issues_returns',
      highlight: totalFineAmount > 0
    },
    {
      label: 'Registered Patrons',
      value: students.length,
      sub: `${activePatrons} active • ${frozenPatrons} hold`,
      tab: 'user_management',
      highlight: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Heading Only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time library holdings, circulation desk volume, and member accounts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('book_creation')}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Book</span>
          </button>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-400" />
            <span>Issues & Returns</span>
          </button>
        </div>
      </div>

      {/* Flat Aligned Metric Strip (No Rounded Cards) */}
      <div className="border-t border-b border-zinc-200 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 grid grid-cols-2 lg:grid-cols-5 py-2">
        {metrics.map((m, i) => (
          <div
            key={i}
            onClick={() => onNavigate(m.tab)}
            className="p-4 cursor-pointer hover:bg-zinc-50/80 transition-colors flex flex-col justify-between"
          >
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block mb-1">
              {m.label}
            </span>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${m.highlight ? 'text-rose-600' : 'text-zinc-900'}`}>
                {m.value}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                {m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Two-Column Flat Aligned Data Section */}
      <div className="grid lg:grid-cols-12 gap-8 pt-2">
        {/* Left Column (7 cols): Active Loans & Circulations */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
              Active Circulations ({activeLoans.length})
            </h2>
            <button
              onClick={() => onNavigate('book_issues_returns')}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {activeLoans.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              No books currently on loan. All copies are resting on library shelves.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border-b border-zinc-200">
              {activeLoans.slice(0, 6).map(loan => {
                const isOverdue = loan.status === 'Overdue';
                return (
                  <div
                    key={loan.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-900 truncate">
                        {loan.bookTitle}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 truncate flex items-center gap-2">
                        <span>Borrower: <strong className="text-zinc-700">{loan.patronName}</strong> ({loan.patronId})</span>
                        <span>•</span>
                        <span>Due: {loan.dueDateFormatted}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium text-emerald-700">
                          On Schedule
                        </span>
                      )}
                      <button
                        onClick={() => onNavigate('book_issues_returns')}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 px-2 py-1"
                      >
                        Desk →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Audit Trail & Events */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
              Recent System Activity
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">Live Audit</span>
          </div>

          <div className="divide-y divide-zinc-100 border-b border-zinc-200">
            {auditLogs.slice(0, 6).map((log, idx) => (
              <div key={log.id || idx} className="py-2.5 text-xs">
                <p className="text-zinc-700 leading-relaxed font-normal">
                  {log.text}
                </p>
                <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                  {log.time || 'Today'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
            <span>Database: MongoDB Atlas Connected</span>
            <button
              onClick={() => onNavigate('settings')}
              className="text-zinc-700 font-medium hover:underline"
            >
              System Settings →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
