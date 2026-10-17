import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, ShieldCheck, Banknote } from 'lucide-react';

export function UpiModal({ isOpen, onClose, fine, onConfirmPayment }) {
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !fine) return null;

  const handleSimulatePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onConfirmPayment(fine, 'UPI Online');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Instant UPI Fee Settlement
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="text-xs text-slate-500">Fine Due for:</div>
          <div className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
            {fine.patronName || 'Rahul Verma'} ({fine.patronId || 'STU-2024-ME019'})
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            ₹{Number(fine.amount).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            5 Days Overdue @ ₹5.00/day
          </div>

          {/* Scannable Authentic QR Code Box */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block shadow-inner">
            <div className="w-44 h-44 bg-white p-2 rounded-xl flex flex-col items-center justify-center mx-auto shadow-sm">
              {/* Simulated QR Code Canvas */}
              <div className="w-40 h-40 grid grid-cols-6 grid-rows-6 gap-1 bg-white p-1">
                {[...Array(36)].map((_, i) => {
                  const isBlack = (i % 2 === 0 || i % 7 === 0 || i < 7 || i > 28);
                  return (
                    <div
                      key={i}
                      className={isBlack ? 'bg-slate-900 rounded-[2px]' : 'bg-transparent'}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-2">
              UPI ID: collegelibrary@icici
            </div>
          </div>

          {/* Payment Apps Badges */}
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Google Pay</span>
            <span>•</span>
            <span>PhonePe</span>
            <span>•</span>
            <span>Paytm</span>
            <span>•</span>
            <span>BHIM</span>
          </div>

          <button
            onClick={handleSimulatePayment}
            disabled={processing}
            className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            {processing ? (
              <span>Verifying UPI Gateway...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate UPI Payment Success</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WaiveModal({ isOpen, onClose, fine, onConfirmWaive }) {
  const [reason, setReason] = useState('Medical Leave approved by Dean');

  if (!isOpen || !fine) return null;

  const handleWaiveSubmit = (e) => {
    e.preventDefault();
    onConfirmWaive(fine, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Official Fine Waiver
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleWaiveSubmit} className="p-5 text-xs space-y-4">
          <p className="text-slate-500 leading-relaxed">
            Authorized waiver for <strong className="text-slate-900 dark:text-white">{fine.patronName}</strong> (₹{Number(fine.amount).toFixed(2)}). Mandatory reason required for forensic audit log.
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select or Type Waiver Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mb-2"
            >
              <option value="Medical Leave approved by Dean">Medical Leave approved by Dean</option>
              <option value="Hostel Quarantine Certification">Hostel Quarantine Certification</option>
              <option value="Special Academic Exam Concession">Special Academic Exam Concession</option>
              <option value="Administrative Exemption by Chief Librarian">Administrative Exemption by Chief Librarian</option>
            </select>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-500/20 transition-all"
          >
            Confirm Authorized Waiver
          </button>
        </form>
      </div>
    </div>
  );
}
