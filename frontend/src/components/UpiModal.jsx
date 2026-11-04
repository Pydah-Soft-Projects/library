import React, { useState } from 'react';
import { X, QrCode } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="rounded-2xl border shadow-md max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ 
          backgroundColor: 'var(--surface)', 
          borderColor: 'var(--border)', 
          color: 'var(--text-primary)' 
        }}
      >
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 
              className="font-bold text-sm tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Instant UPI Fee Settlement
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Fine Due for:
          </div>
          <div 
            className="font-bold text-base mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {fine.patronName || 'Registered Patron'} {fine.patronId ? `(${fine.patronId})` : ''}
          </div>
          <div 
            className="text-2xl font-extrabold mt-2"
            style={{ color: 'var(--primary)' }}
          >
            ₹{Number(fine.amount).toFixed(2)}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {fine.daysOverdue ? `${fine.daysOverdue} Days Overdue @ ₹5.00/day` : 'Circulation Overdue Fine'}
          </div>

          {/* Scannable Authentic QR Code Box */}
          <div 
            className="mt-4 p-4 rounded-2xl border inline-block"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
          >
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
            <div className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-muted)' }}>
              UPI ID: collegelibrary@icici
            </div>
          </div>

          {/* Payment Apps Badges */}
          <div 
            className="mt-3 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
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
            className="mt-5 w-full py-3 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {processing ? 'Confirming with Gateway...' : 'Mark Fine as Paid via UPI'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WaiveModal({ isOpen, onClose, fine, onConfirmWaive }) {
  const [reason, setReason] = useState('');

  if (!isOpen || !fine) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirmWaive(fine, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="rounded-2xl border shadow-md max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ 
          backgroundColor: 'var(--surface)', 
          borderColor: 'var(--border)', 
          color: 'var(--text-primary)' 
        }}
      >
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 
            className="font-bold text-sm tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Waive Overdue Fine
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Patron & Fine:
            </div>
            <div className="font-bold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {fine.patronName} (₹{Number(fine.amount).toFixed(2)})
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
              Official Waiver Reason:
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Medical absence verified by Dean, library technical delay..."
              className="w-full p-2.5 rounded-xl border text-xs focus:outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border-strong)', 
                color: 'var(--text-primary)' 
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl font-medium transition-colors cursor-pointer hover:opacity-80"
              style={{ 
                borderColor: 'var(--border)', 
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface)' 
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white font-semibold rounded-xl transition-colors cursor-pointer hover:opacity-90"
              style={{ backgroundColor: 'var(--danger)' }}
            >
              Confirm Waiver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
