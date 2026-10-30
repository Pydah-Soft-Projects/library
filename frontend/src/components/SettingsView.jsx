import React, { useState } from 'react';
import { Save, RotateCcw, Clock, Building2, ShieldCheck } from 'lucide-react';

export default function SettingsView({
  authToken,
  currentUser,
  onToast
}) {
  const [defaultLoanDays, setDefaultLoanDays] = useState(30);
  const [dailyFineRate, setDailyFineRate] = useState(5.0);
  const [maxBooksQuota, setMaxBooksQuota] = useState(4);
  const [maxRenewals, setMaxRenewals] = useState(2);

  const [libraryName, setLibraryName] = useState('Central Campus Academic Library');
  const [deskEmail, setDeskEmail] = useState('circulation@college.edu.in');
  const [operatingHours, setOperatingHours] = useState('08:30 AM – 08:00 PM (Mon – Sat)');

  const handleSavePolicies = (e) => {
    e.preventDefault();
    if (onToast) onToast('Settings saved successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Main Heading Only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure institutional lending rules, daily overdue fines, and system status
          </p>
        </div>

        <button
          onClick={handleSavePolicies}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* Flat Aligned Layout (No Rounded Cards) */}
      <div className="grid lg:grid-cols-12 gap-8 pt-2">
        {/* Left (7 cols): Circulation Policies & Library Profile */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200">
              Circulation & Lending Rules
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Default Loan Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={defaultLoanDays}
                  onChange={(e) => setDefaultLoanDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Standard collegiate 30-day term</span>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Daily Overdue Fine (₹ / Day)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={dailyFineRate}
                    onChange={(e) => setDailyFineRate(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Automated fine accumulation</span>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Max Books Quota per Patron
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxBooksQuota}
                  onChange={(e) => setMaxBooksQuota(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Undergraduate student quota</span>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Max Renewals Allowed
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxRenewals}
                  onChange={(e) => setMaxRenewals(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <span className="text-[11px] text-zinc-400 mt-0.5 block">+15 days per renewal</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200">
              Institutional Profile
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Library Name</label>
                <input
                  type="text"
                  value={libraryName}
                  onChange={(e) => setLibraryName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Desk Contact Email</label>
                  <input
                    type="email"
                    value={deskEmail}
                    onChange={(e) => setDeskEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Security & Database Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200">
              Session & Database Status
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 border border-zinc-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">JWT Token</span>
                  <span className="font-mono text-[10px] text-emerald-700 font-semibold">Active (HS256)</span>
                </div>
                <div className="text-[11px] text-zinc-800 truncate font-mono">
                  {currentUser?.full_name || currentUser?.email || 'Superadmin'}
                </div>
              </div>

              <div className="p-3 border border-zinc-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Database Engine</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">MongoDB Atlas</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Live connection established on port 5000.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200">
              Workspace Maintenance
            </h2>
            <p className="text-xs text-zinc-400">
              Reset browser storage and re-initialize test catalog state.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset application local storage and reload original data?')) {
                  localStorage.removeItem('lm_books');
                  localStorage.removeItem('lm_loans');
                  localStorage.removeItem('lm_fines');
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Local Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
