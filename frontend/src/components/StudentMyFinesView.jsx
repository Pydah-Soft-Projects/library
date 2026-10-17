import React from 'react';
import { CreditCard, QrCode, CheckCircle, AlertTriangle, FileText, ArrowRight } from 'lucide-react';

export default function StudentMyFinesView({ studentFines, onOpenUpiModal }) {
  const unpaid = studentFines.filter(f => f.status === 'Unpaid');
  const paid = studentFines.filter(f => f.status !== 'Unpaid');
  const totalDue = unpaid.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fee Collection</span>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
            My Fines & Overdue Penalty Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic ₹5.00/day daily penalty applies to all items held past the 30-day loan period.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-400 font-semibold">Total Outstanding Balance</div>
          <div className={`text-2xl font-heading font-extrabold ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{totalDue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Unpaid Penalties Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center justify-between">
          <span>Pending Fines</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            unpaid.length > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {unpaid.length} Pending
          </span>
        </h3>

        {unpaid.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200">No pending fines on your account</h4>
            <p className="text-xs text-slate-400 mt-1">Your borrowing standing is completely clear and verified</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unpaid.map(fine => (
              <div
                key={fine.id}
                className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      5 Days Overdue
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Fine ID: #FN-{fine.id + 100}</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                    {fine.bookTitle || 'Operating System Concepts'}
                  </h4>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Rate: ₹5.00 / day penalty • Account hold active
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Fine Amount</div>
                    <div className="text-2xl font-heading font-extrabold text-rose-600 dark:text-rose-400">
                      ₹{Number(fine.amount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenUpiModal(fine)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay via UPI QR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Payment Receipts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-4">
          Payment History & Cleared Receipts
        </h3>

        {paid.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No past fine settlement receipts recorded
          </div>
        ) : (
          <div className="space-y-2">
            {paid.map(pf => (
              <div
                key={pf.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{Number(pf.amount).toFixed(2)} — {pf.status === 'Waived' ? `Officially Waived (${pf.waiver_reason})` : `Settled via ${pf.method || 'UPI Online'}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Book: {pf.bookTitle} • Receipt #{pf.id + 1000}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {pf.paid_at ? new Date(pf.paid_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
