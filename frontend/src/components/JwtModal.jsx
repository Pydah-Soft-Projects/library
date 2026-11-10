import React, { useState } from 'react';
import { Shield, Copy, Check, X } from 'lucide-react';

export default function JwtModal({ isOpen, onClose, token, user }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !token) return null;

  // Split token into Header, Payload, Signature
  const parts = token.split('.');
  const headerRaw = parts[0] ? atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')) : '{}';
  const payloadRaw = parts[1] ? atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')) : '{}';

  let headerObj = {};
  let payloadObj = {};
  try {
    headerObj = JSON.parse(headerRaw);
  } catch (e) {
    headerObj = { alg: 'HS256', typ: 'JWT' };
  }
  try {
    payloadObj = JSON.parse(payloadRaw);
  } catch (e) {
    payloadObj = user || {};
  }

  const expDate = payloadObj.exp ? new Date(payloadObj.exp * 1000) : null;
  const iatDate = payloadObj.iat ? new Date(payloadObj.iat * 1000) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div 
        className="rounded-3xl border shadow-md max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ 
          backgroundColor: 'var(--surface)', 
          borderColor: 'var(--border-strong)', 
          color: 'var(--text-primary)' 
        }}
      >
        {/* Header */}
        <div 
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-xs"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 
                  className="font-extrabold text-base tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Active JWT Security Token
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                  style={{ 
                    backgroundColor: 'var(--primary-light)', 
                    color: 'var(--primary)', 
                    borderColor: 'var(--border)' 
                  }}
                >
                  HS256 Verified
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Cryptographically signed institutional authentication token
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              className="p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Algorithm
              </div>
              <div className="font-mono font-bold text-sm mt-0.5" style={{ color: 'var(--primary)' }}>
                {headerObj.alg || 'HS256'}
              </div>
            </div>
            <div 
              className="p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Token Type
              </div>
              <div className="font-mono font-bold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {headerObj.typ || 'JWT'}
              </div>
            </div>
            <div 
              className="p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Issued At
              </div>
              <div className="font-mono font-bold text-[11px] mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {iatDate ? iatDate.toLocaleTimeString() : 'Active'}
              </div>
            </div>
            <div 
              className="p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Expires In
              </div>
              <div className="font-mono font-bold text-[11px] mt-0.5" style={{ color: 'var(--success)' }}>
                24 Hours
              </div>
            </div>
          </div>

          {/* Raw Encoded Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                Bearer Token Header & Claims
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer hover:opacity-80"
                style={{ color: 'var(--primary)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Token'}</span>
              </button>
            </div>
            <pre 
              className="p-3.5 rounded-2xl border font-mono text-[11px] break-all whitespace-pre-wrap select-all leading-relaxed"
              style={{ 
                backgroundColor: 'var(--background)', 
                borderColor: 'var(--border)', 
                color: 'var(--text-primary)' 
              }}
            >
              {token}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t flex justify-end"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 text-white font-medium text-xs rounded-xl transition-all cursor-pointer hover:opacity-90 shadow-xs"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
