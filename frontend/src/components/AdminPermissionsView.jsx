import React, { useState } from 'react';
import { Shield, ShieldCheck, Lock, Unlock, Users, Check, AlertCircle } from 'lucide-react';

export default function AdminPermissionsView({ onToast }) {
  // Staff Role Privilege Overrides
  const [privileges, setPrivileges] = useState({
    substaff_waive_fines: false,
    substaff_create_books: false,
    substaff_delete_books: false,
    librarian_delete_books: true,
    librarian_override_quota: true
  });

  const handleToggle = (key, label, targetRole) => {
    const nextVal = !privileges[key];
    setPrivileges(prev => ({ ...prev, [key]: nextVal }));
    onToast(
      nextVal
        ? `Delegation Granted: [${label}] assigned to ${targetRole}`
        : `Privilege Revoked: [${label}] removed from ${targetRole}`,
      nextVal ? 'success' : 'info'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              User Management & Access Control
            </span>
            <span className="text-xs text-slate-400 font-mono">Table: user_permission_overrides</span>
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white mt-1">
            User Management & Role Privileges
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage staff profiles, assign operational authorities, and configure dynamic capability overrides.
          </p>
        </div>
      </div>

      {/* Staff Roles & Privileges Matrix */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sub-staff Privileges Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              📋
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                Front-Desk Sub-staff (Ramesh Kumar)
              </h3>
              <span className="text-xs text-slate-500">Default: Issue, Return & Cash Receipt Collection</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Toggle 1: Waive Fines */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Fine Waiver Authority</div>
                <div className="text-[11px] text-slate-500">Permission key: <code className="font-mono text-blue-600">fines.waive</code></div>
              </div>
              <button
                onClick={() => handleToggle('substaff_waive_fines', 'fines.waive', 'Sub-staff')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  privileges.substaff_waive_fines
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {privileges.substaff_waive_fines ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{privileges.substaff_waive_fines ? 'Delegated (Granted)' : 'Denied (Default)'}</span>
              </button>
            </div>

            {/* Toggle 2: Accession Books */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Add New Catalog Titles</div>
                <div className="text-[11px] text-slate-500">Permission key: <code className="font-mono text-blue-600">catalog.create</code></div>
              </div>
              <button
                onClick={() => handleToggle('substaff_create_books', 'catalog.create', 'Sub-staff')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  privileges.substaff_create_books
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {privileges.substaff_create_books ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{privileges.substaff_create_books ? 'Delegated (Granted)' : 'Denied (Default)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chief Librarian Privileges Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              📖
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                Chief Librarian (Dr. Radhakrishnan)
              </h3>
              <span className="text-xs text-slate-500">Full Catalog & Acquisitions Governance</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Toggle 1: Delete Books */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Purge / Weed Out Records</div>
                <div className="text-[11px] text-slate-500">Permission key: <code className="font-mono text-purple-600">catalog.delete</code></div>
              </div>
              <button
                onClick={() => handleToggle('librarian_delete_books', 'catalog.delete', 'Chief Librarian')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  privileges.librarian_delete_books
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {privileges.librarian_delete_books ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{privileges.librarian_delete_books ? 'Authorized' : 'Locked'}</span>
              </button>
            </div>

            {/* Toggle 2: Quota Override */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Borrow Quota Override</div>
                <div className="text-[11px] text-slate-500">Permission key: <code className="font-mono text-purple-600">patrons.override_quota</code></div>
              </div>
              <button
                onClick={() => handleToggle('librarian_override_quota', 'patrons.override_quota', 'Chief Librarian')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  privileges.librarian_override_quota
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {privileges.librarian_override_quota ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{privileges.librarian_override_quota ? 'Authorized' : 'Locked'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
