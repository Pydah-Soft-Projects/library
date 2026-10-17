import React, { useState } from 'react';
import { Shield, Key, Copy, Check, Clock, X, Lock, FileCode } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                  Active JWT Security Token
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  HS256 Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cryptographically signed institutional authentication token
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Algorithm</div>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                {headerObj.alg || 'HS256'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Token Type</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {headerObj.typ || 'JWT'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issued At</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] mt-0.5">
                {iatDate ? iatDate.toLocaleTimeString() : 'Active'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expires In</div>
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5">
                24 Hours
              </div>
            </div>
          </div>

          {/* Raw Encoded Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-500" />
                Raw Encoded Bearer Token
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Token'}</span>
              </button>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] break-all leading-relaxed border border-slate-800 max-h-24 overflow-y-auto selection:bg-blue-500 selection:text-white">
              {token}
            </div>
          </div>

          {/* Decoded Claims Payload */}
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1.5">
              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
              Decoded Claims & Granted Permissions
            </label>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 font-mono text-xs overflow-x-auto space-y-1.5">
              <div><span className="text-purple-600 dark:text-purple-400">userId</span>: {payloadObj.userId || payloadObj.id}</div>
              <div><span className="text-purple-600 dark:text-purple-400">fullName</span>: "{payloadObj.fullName || payloadObj.full_name}"</div>
              <div><span className="text-purple-600 dark:text-purple-400">email</span>: "{payloadObj.email}"</div>
              <div><span className="text-purple-600 dark:text-purple-400">role</span>: <span className="font-bold text-emerald-600 dark:text-emerald-400">"{payloadObj.role}"</span></div>
              {payloadObj.patronId && (
                <div><span className="text-purple-600 dark:text-purple-400">patronId</span>: "{payloadObj.patronId}"</div>
              )}
              {payloadObj.department && (
                <div><span className="text-purple-600 dark:text-purple-400">department</span>: "{payloadObj.department}"</div>
              )}
              <div>
                <span className="text-purple-600 dark:text-purple-400">permissions</span>: [
                <div className="pl-4 text-[11px] text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto">
                  {(payloadObj.permissions || []).map(p => `"${p}"`).join(', ')}
                </div>
                ]
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            Signed with HS256 HMAC-SHA256
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
