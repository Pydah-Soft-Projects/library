import React from 'react';
import { BookMarked, Clock, AlertTriangle, Calendar, RefreshCw, CheckCircle, ShieldAlert, BookmarkCheck, Trash2 } from 'lucide-react';

export default function StudentMyBooksView({ 
  studentLoans, 
  onRenew, 
  onToast, 
  onOpenPayFine, 
  studentFines,
  reservations = [],
  onCancelReservation,
  currentStudent 
}) {
  const activeLoans = studentLoans.filter(l => l.status !== 'Returned');
  const myReservations = reservations.filter(r => r.studentId === currentStudent?.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Circulation Records</span>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
            My Borrowed Books & 30-Day Loan Terms
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional borrowing duration: strict 30 calendar days with daily penalty accrual thereafter.
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs self-start sm:self-auto border border-blue-200 dark:border-blue-800">
          {activeLoans.length} Active Borrowing(s)
        </span>
      </div>

      {activeLoans.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-500" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No books currently checked out</h3>
          <p className="text-xs text-slate-400 mt-1">Visit the Explore Books catalog to reserve textbooks for pickup</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeLoans.map(loan => {
            const isOverdue = loan.status === 'Overdue';
            const totalDays = 30;
            const elapsedDays = isOverdue ? 35 : 15;
            const daysRemaining = isOverdue ? 0 : 15;
            const overdueDays = isOverdue ? 5 : 0;
            const fineAmount = overdueDays * 5.0; // ₹5 / day
            const percentUsed = Math.min((elapsedDays / totalDays) * 100, 100);

            return (
              <div
                key={loan.id}
                className={`p-6 rounded-2xl border transition-all shadow-sm ${
                  isOverdue
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 shadow-rose-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Title & Status */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-600/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Overdue by {overdueDays} Days</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Active Loan • {daysRemaining} Days Left</span>
                        </span>
                      )}

                      <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                        {loan.accession}
                      </span>
                    </div>

                    <h3 className={`font-heading font-extrabold text-lg sm:text-xl ${
                      isOverdue ? 'text-rose-950 dark:text-rose-100' : 'text-slate-900 dark:text-white'
                    }`}>
                      {loan.bookTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>Borrowed: <strong>{loan.issueDateFormatted || '15 Oct 2026'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-500' : 'text-emerald-500'}`} />
                        <span>Strict Due Date: <strong className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-mono' : 'text-slate-800 dark:text-slate-200 font-mono'}>{loan.dueDateFormatted || '14 Nov 2026'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Fine Calculation or Action */}
                  <div className="text-left md:text-right shrink-0">
                    {isOverdue ? (
                      <div className="bg-rose-100/80 dark:bg-rose-900/40 p-3 rounded-xl border border-rose-300 dark:border-rose-800">
                        <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase">
                          Penalty Accrual (₹5 / Day)
                        </div>
                        <div className="text-2xl font-heading font-extrabold text-rose-600 dark:text-rose-400">
                          ₹{fineAmount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-rose-600/80 mt-0.5">
                          Borrowing account suspended
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          Good Standing
                        </div>
                        <div className="text-xl font-heading font-bold text-emerald-600 dark:text-emerald-400">
                          ₹0.00 Due
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Return before due date
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 30-Day Term Visual Progress Gauge */}
                <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    <span>30-Day Period: Day {elapsedDays} of 30</span>
                    <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                      {isOverdue ? `Expired (${overdueDays} days late)` : `${daysRemaining} days remaining`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOverdue ? 'bg-rose-600' : percentUsed > 75 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs pt-2">
                  <div className="text-slate-400 text-[11px]">
                    Barcode asset: <code className="font-mono text-slate-600 dark:text-slate-300">{loan.bookBarcode}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOverdue ? (
                      <button
                        onClick={() => onOpenPayFine(studentFines[0])}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-colors"
                      >
                        Settle Fine (₹{fineAmount.toFixed(2)}) via UPI
                      </button>
                    ) : (
                      <button
                        onClick={() => onRenew(loan)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Request +15 Days Renewal</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Hold Reservations Section */}
      {myReservations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                Active Hold Reservations ({myReservations.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Reserved for physical pickup at desk</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {myReservations.map(res => (
              <div
                key={res.id}
                className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                      Hold Active • 48h Window
                    </span>
                    <span className="font-mono text-xs text-slate-500">{res.bookAccession}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">{res.bookTitle}</h4>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Shelf Location: <strong className="text-blue-700">{res.shelfLocation}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-blue-100 text-xs">
                  <span className="text-[11px] text-slate-500">Reserved: {res.reservedAtFormatted}</span>
                  <button
                    onClick={() => onCancelReservation && onCancelReservation(res.id)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-colors"
                  >
                    Release Hold
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
