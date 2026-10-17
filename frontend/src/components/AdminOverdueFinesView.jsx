import React from 'react';
import { AlertTriangle, QrCode, Banknote, CheckCircle, FileText, ShieldAlert } from 'lucide-react';

export default function AdminOverdueFinesView({ 
  fines, 
  onCollectCash, 
  onOpenUpiModal, 
  onOpenWaiveModal, 
  currentRole 
}) {
  const unpaid = fines.filter(f => f.status === 'Unpaid');
  const settled = fines.filter(f => f.status !== 'Unpaid');
  const totalPendingAmount = unpaid.reduce((sum, f) => sum + Number(f.amount), 0);

  const canWaive = ['superadmin', 'librarian'].includes(currentRole);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Master Defaulters Register
            </span>
            <span className="text-xs text-slate-400 font-mono">Policy: ₹5.00/day</span>
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white mt-1">
            Overdue Loans & Fee Collection Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Students exceeding the 30-day borrowing window with automated account freezes.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-400 font-bold uppercase">Total Accrued Penalty</span>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600 dark:text-rose-400">
            ₹{totalPendingAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            Across {unpaid.length} frozen student accounts
          </div>
        </div>
      </div>

      {/* Defaulters Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
            Current Overdue Defaulters List (Past 30 Days)
          </h3>
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 border border-rose-200 dark:border-rose-800">
            {unpaid.length} Defaulters Active
          </span>
        </div>

        {unpaid.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200">No overdue defaulters!</h4>
            <p className="text-xs text-slate-400 mt-1">All borrowed books are circulating within their active 30-day term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student Patron</th>
                  <th className="py-3.5 px-4">Overdue Book Title</th>
                  <th className="py-3.5 px-4">Overdue Term</th>
                  <th className="py-3.5 px-4">Fine Total</th>
                  <th className="py-3.5 px-4 text-right">Desk Settlement Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {unpaid.map(fine => (
                  <tr key={fine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{fine.patronName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{fine.patronId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{fine.bookTitle}</div>
                      <div className="text-[11px] text-slate-400">Due 5 days ago</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>5 Days Late</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-extrabold text-sm text-rose-600 dark:text-rose-400">
                        ₹{Number(fine.amount).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">@ ₹5.00/day</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Collect Cash */}
                        <button
                          onClick={() => onCollectCash(fine)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Collect Cash</span>
                        </button>

                        {/* Collect UPI */}
                        <button
                          onClick={() => onOpenUpiModal(fine)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>UPI QR</span>
                        </button>

                        {/* Waive Fine */}
                        <button
                          disabled={!canWaive}
                          onClick={() => onOpenWaiveModal(fine)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs disabled:opacity-40 transition-colors"
                          title={canWaive ? "Waive with authorized reason" : "Requires Chief Librarian or Superadmin"}
                        >
                          Waive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Cleared Receipts */}
      {settled.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white mb-3">
            Cleared Fine Receipts Ledger
          </h3>
          <div className="space-y-2">
            {settled.map(sf => (
              <div
                key={sf.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{Number(sf.amount).toFixed(2)} — {sf.status === 'Waived' ? `Waived (${sf.waiver_reason})` : `Paid via ${sf.method || 'Cash'}`}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      Patron: {sf.patronName} ({sf.patronId}) • Receipt #{sf.id + 1000}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {sf.paid_at ? new Date(sf.paid_at).toLocaleTimeString() : 'Today'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
