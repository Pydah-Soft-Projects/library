import React from 'react';
import { Plus, ArrowLeftRight } from 'lucide-react';

export default function DashboardView({
  books = [],
  loans = [],
  fines = [],
  students = [],
  hrmsUsersCount = 1,
  auditLogs = [],
  onNavigate,
  onOpenReturns,
  onOpenUpiModal,
  onOpenWaiveModal
}) {
  const totalTitles = books.length;
  const totalCopies = books.reduce((sum, b) => sum + (b.total !== undefined ? Number(b.total) : (Number(b.total_copies) || 0)), 0);
  const availableCopies = books.reduce((sum, b) => sum + (b.available !== undefined ? Number(b.available) : (Number(b.total) || 0)), 0);
  const activeLoans = loans.filter(l =>
    String(l.status || '').trim().toLowerCase() !== 'returned' &&
    !(l.return_date || l.returnDate || l.returned_at || l.returnedAt || l.returned_date)
  );
  const dateKey = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  };
  const today = dateKey(new Date());
  const dueTodayLoans = activeLoans.filter(loan =>
    dateKey(loan.due_date || loan.dueDate || loan.dueDateFormatted) === today
  );
  const overdueLoans = activeLoans.filter(loan => {
    const dueDate = dateKey(loan.due_date || loan.dueDate || loan.dueDateFormatted);
    return dueDate && dueDate < today;
  });
  const unpaidFines = fines.filter(f => f.status === 'Unpaid' || f.status === 'Pending');
  const totalFineAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);

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
      label: 'Due Today',
      value: dueTodayLoans.length.toLocaleString(),
      sub: 'Books due for return today',
      tab: 'admin_fines',
      highlight: dueTodayLoans.length > 0
    },
    {
      label: 'Past Due',
      value: overdueLoans.length.toLocaleString(),
      sub: 'Return date has passed',
      tab: 'admin_fines',
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
    <div className="space-y-4">
      {/* Main Heading Only & Quick Action Buttons */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h1 
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Dashboard
          </h1>
          <p 
            className="text-xs mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Real-time library holdings, circulation desk volume, and member accounts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('book_creation')}
            className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Book</span>
          </button>
          <button
            onClick={() => onNavigate('book_issues_returns')}
            className="px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer hover:opacity-80"
            style={{ 
              borderColor: 'var(--primary)', 
              color: 'var(--primary)',
              backgroundColor: 'var(--surface)' 
            }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: 'var(--primary)' }} />
            <span>Issues & Returns</span>
          </button>
        </div>
      </div>

      {/* Compact operational metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {metrics.map((m, i) => (
          <div
            key={i}
            onClick={() => onNavigate(m.tab)}
            className="min-w-0 p-3 rounded-lg border cursor-pointer transition-colors hover:opacity-95"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderColor: 'var(--border)' 
            }}
          >
            <span 
              className="text-[10px] font-semibold uppercase tracking-wide block mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {m.label}
            </span>
            <div 
              className="text-2xl font-bold tracking-tight"
              style={{ color: m.highlight ? 'var(--danger)' : 'var(--text-primary)' }}
            >
              {m.value}
            </div>
            <span 
              className="text-[10px] mt-1 block leading-snug"
              style={{ color: 'var(--text-muted)' }}
            >
              {m.sub}
            </span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {[
          { title: 'Due Today', loans: dueTodayLoans, tone: 'blue' },
          { title: 'Past Due', loans: overdueLoans, tone: 'rose' }
        ].map(queue => (
          <section 
            key={queue.title} 
            className="min-w-0 rounded-lg border overflow-hidden"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderColor: 'var(--border)' 
            }}
          >
            <div 
              className="px-3 py-2 flex items-center justify-between border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h2 
                className="text-xs font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {queue.title}
              </h2>
              <span 
                className="text-[11px] font-semibold"
                style={{ color: queue.tone === 'rose' ? 'var(--danger)' : 'var(--primary)' }}
              >
                {queue.loans.length}
              </span>
            </div>
            {queue.loans.length === 0 ? (
              <p 
                className="px-3 py-4 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                No books in this return queue.
              </p>
            ) : (
              <div 
                className="max-h-80 overflow-y-auto divide-y"
                style={{ borderColor: 'var(--border)' }}
              >
                {queue.loans.map((loan, index) => {
                  const borrowerName = loan.patronName || loan.patron_name || 'Unknown borrower';
                  const dueDate = loan.dueDateFormatted || loan.dueDate || loan.due_date || '—';
                  const bookNumber = getSingleBookNumber(loan.accession || loan.barcode || loan.bookBarcode || loan.book_barcode);
                  const bookTitle = loan.bookTitle || loan.book_title || 'Unknown book';
                  const isPastDue = queue.tone === 'rose';
                  return (
                    <div 
                      key={loan.id || loan._id || `${loan.patronId || loan.patron_id}-${loan.accession || index}`} 
                      className="px-3 py-2.5 flex items-center justify-between gap-3 hover:opacity-90"
                      style={{ borderBottomColor: 'var(--border)' }}
                    >
                      <div className="min-w-0">
                        {isPastDue ? (
                          <>
                            <div className="flex items-baseline justify-between gap-3">
                              <div 
                                className="text-xs font-bold truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {borrowerName}
                              </div>
                              <div 
                                className="shrink-0 text-[11px] font-semibold"
                                style={{ color: 'var(--danger)' }}
                              >
                                Due: {dueDate}
                              </div>
                            </div>
                            <div 
                              className="mt-0.5 text-[11px] truncate"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {bookTitle} <span className="mx-1" style={{ color: 'var(--border)' }}>•</span> <span className="font-mono">#{bookNumber}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div 
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {bookTitle}
                            </div>
                            <div 
                              className="mt-0.5 text-[11px] truncate"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {borrowerName}
                              <span className="mx-1.5" style={{ color: 'var(--border)' }}>•</span>
                              <span className="font-mono">#{bookNumber}</span>
                              <span className="mx-1.5" style={{ color: 'var(--border)' }}>•</span>
                              Due {dueDate}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenReturns ? onOpenReturns() : onNavigate('admin_fines')}
                        className="shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors hover:opacity-80"
                        style={{ 
                          borderColor: 'var(--primary)', 
                          color: 'var(--primary)',
                          backgroundColor: 'var(--surface)' 
                        }}
                      >
                        Return
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
