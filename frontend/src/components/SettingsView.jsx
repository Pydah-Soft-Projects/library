import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Clock, Building2, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SettingsView({
  authToken,
  currentUser,
  onToast
}) {
  // Read instant cached settings from localStorage to eliminate any flicker of default old data on reload
  const getInitialSettings = () => {
    try {
      const saved = localStorage.getItem('lm_system_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const initial = getInitialSettings();

  const [defaultLoanDays, setDefaultLoanDays] = useState(initial?.default_loan_days ?? 30);
  const [dailyFineRate, setDailyFineRate] = useState(initial?.daily_fine_rate ?? 5.0);
  const [maxBooksQuota, setMaxBooksQuota] = useState(initial?.max_books_quota ?? 4);
  const [maxRenewals, setMaxRenewals] = useState(initial?.max_renewals ?? 2);

  const [libraryName, setLibraryName] = useState(initial?.library_name || 'Central Campus Academic Library');
  const [deskEmail, setDeskEmail] = useState(initial?.desk_email || 'circulation@college.edu.in');
  const [operatingHours, setOperatingHours] = useState(initial?.operating_hours || '08:30 AM – 08:00 PM (Mon – Sat)');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Load fresh settings live from MongoDB Atlas database (bypassing any browser cache)
  const loadSettingsFromDB = async (showToast = false) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/settings?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await res.json();
      if (data && data.settings) {
        const s = data.settings;
        if (s.default_loan_days !== undefined) setDefaultLoanDays(s.default_loan_days);
        if (s.daily_fine_rate !== undefined) setDailyFineRate(s.daily_fine_rate);
        if (s.max_books_quota !== undefined) setMaxBooksQuota(s.max_books_quota);
        if (s.max_renewals !== undefined) setMaxRenewals(s.max_renewals);
        if (s.library_name) setLibraryName(s.library_name);
        if (s.desk_email) setDeskEmail(s.desk_email);
        if (s.operating_hours) setOperatingHours(s.operating_hours);

        // Keep local storage in sync with live DB settings
        try {
          localStorage.setItem('lm_system_settings', JSON.stringify(s));
        } catch {}

        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (showToast && onToast) {
          onToast('Settings refreshed directly from MongoDB Atlas!', 'success');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      if (showToast && onToast) {
        onToast('Failed to refresh settings: ' + err.message, 'danger');
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettingsFromDB(false);
  }, []);

  const handleSavePolicies = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    const payload = {
      default_loan_days: Number(defaultLoanDays),
      daily_fine_rate: Number(dailyFineRate),
      max_books_quota: Number(maxBooksQuota),
      max_renewals: Number(maxRenewals),
      library_name: libraryName,
      desk_email: deskEmail,
      operating_hours: operatingHours
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        const updated = data.settings || payload;
        try {
          localStorage.setItem('lm_system_settings', JSON.stringify(updated));
        } catch {}
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (onToast) onToast('Settings saved to MongoDB Atlas database successfully!', 'success');
      } else {
        if (onToast) onToast(data.error || 'Failed to save settings.', 'danger');
      }
    } catch (err) {
      if (onToast) onToast('Error saving settings: ' + err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure institutional lending rules, daily overdue fines, and system status (saved in live database)
            {lastSynced && <span className="ml-2 text-emerald-600 font-medium">• Last synced: {lastSynced}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadSettingsFromDB(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-zinc-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Reload latest settings from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh from DB'}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePolicies}
            disabled={saving}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Flat Aligned Layout */}
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
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Standard collegiate loan term</span>
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
                <span className="text-[11px] text-zinc-400 mt-0.5 block">Maximum simultaneous loans</span>
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
                <div className="text-[11px] text-zinc-500">
                  Live connection established on port 5000. All models, roles, books, loans and fines are dynamically stored in the database.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider pb-2 border-b border-zinc-200">
              Workspace Maintenance
            </h2>
            <p className="text-xs text-zinc-400">
              Reset browser storage and reload live state from the database.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset application local storage and reload from database?')) {
                  localStorage.removeItem('lm_books');
                  localStorage.removeItem('lm_loans');
                  localStorage.removeItem('lm_fines');
                  localStorage.removeItem('lm_categories');
                  localStorage.removeItem('lm_system_settings');
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
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
