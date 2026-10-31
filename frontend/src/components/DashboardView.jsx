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

  const getSingleBookNumber = (raw) => {
    if (!raw) return '1';
    const s = String(raw).trim();
    if (s.includes('-')) {
      const parts = s.split('-').map(p => p.trim());
      return parts[0] || '1';
    }
    return s;
  };

  const metrics = [
    {
      label: 'All Books',
      value: totalTitles.toLocaleString(),
      sub: `${availableCopies.toLocaleString()} on shelf (${totalCopies.toLocaleString()} copies)`,
      tab: 'all_books',
      highlight: false
    },
    {
      label: 'Active Loans',
      value: activeLoans.length.toLocaleString(),
      sub: 'Standard 30-day lending window',
      tab: 'book_issues_returns',
      highlight: false
    },
    {
      label: 'Overdue Defaults',
      value: overdueLoans.length.toLocaleString(),
      sub: overdueLoans.length > 0 ? 'Accounts on penalty hold' : 'No overdue accounts',
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
      label: 'Library Users',
      value: ((typeof hrmsUsersCount === 'number') ? hrmsUsersCount : 1).toLocaleString(),
      sub: 'Institutional accounts & staff',
      tab: 'user_management',
      highlight: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Heading Only & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-zinc-200">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">
            Dashboard
          </h1>
          <p className="text-xs font-bold text-zinc-800 mt-1">
            Real-time library holdings, circulation desk volume, and member accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('book_creation')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Book</span>
          </button>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5] text-blue-600" />
            <span>Issues & Returns</span>
          </button>
        </div>
      </div>

      {/* Bold Dark Themed Metric Strip */}
      <div className="border-t-2 border-b-2 border-zinc-300 divide-y sm:divide-y-0 sm:divide-x-2 divide-zinc-200 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 py-2 bg-zinc-100">
        {metrics.map((m, i) => (
          <div
            key={i}
            onClick={() => onNavigate(m.tab)}
            className="p-4 cursor-pointer hover:bg-zinc-200 transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-black text-zinc-900 uppercase tracking-wider block mb-1.5">
              {m.label}
            </span>
            <div>
              <div className={`text-3xl font-black tracking-tight ${m.highlight ? 'text-rose-700' : 'text-zinc-950'}`}>
                {m.value}
              </div>
              <span className="text-xs text-zinc-800 font-bold mt-1.5 block">
                {m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Width Data Section: Active Circulations */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-200">
          <h2 className="text-sm font-black text-zinc-950 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Active Circulations ({activeLoans.length})</span>
          </h2>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Circulation Desk</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-14 text-center text-xs font-bold text-zinc-700 bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-300">
            No books currently on loan. All physical copies are resting on library shelves.
          </div>
        ) : (
          <div className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white">
            <div className="divide-y-2 divide-zinc-100">
              {activeLoans.map(loan => {
                const isOverdue = loan.status === 'Overdue';
                return (
                  <div
                    key={loan.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-zinc-950 text-base">
                        {loan.bookTitle}
                      </div>
                      <div className="text-xs font-bold text-zinc-800 mt-1.5 flex flex-wrap items-center gap-2">
                        <span>Borrower: <strong className="text-zinc-950 font-black">{loan.patronName}</strong> (<span className="text-zinc-900 font-bold">{loan.patronId}</span>)</span>
                        <span className="text-zinc-400">•</span>
                        <span>Book No: <span className="font-mono font-black text-zinc-950">#{getSingleBookNumber(loan.barcode || loan.accession)}</span></span>
                        <span className="text-zinc-400">•</span>
                        <span>Due Date: <strong className="font-black text-zinc-950">{loan.dueDateFormatted || loan.dueDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                      {isOverdue ? (
                        <span className="px-3 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-950 border border-rose-300">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg text-xs font-black text-emerald-950 bg-emerald-100 border border-emerald-300">
                          On Schedule
                        </span>
                      )}
                      <button
                        onClick={() => onNavigate('book_issues_returns')}
                        className="text-xs font-black text-blue-600 hover:bg-blue-50 px-3.5 py-1.5 border border-blue-200 rounded-lg transition-colors cursor-pointer"
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

        <div className="pt-2 flex items-center justify-between text-xs font-bold text-zinc-900 border-t-2 border-zinc-200">
          <span className="flex items-center gap-1.5 font-bold">
            <Database className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            <span className="text-zinc-950 font-extrabold">MongoDB Atlas Connected • Dynamic Persistent Catalog</span>
          </span>
          <button
            onClick={() => onNavigate('settings')}
            className="text-blue-600 font-black hover:text-blue-800 hover:underline cursor-pointer"
          >
            System Settings →
          </button>
        </div>
      </div>
    </div>
  );
}
