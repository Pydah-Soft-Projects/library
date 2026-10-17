import React from 'react';
import { Menu, Clock, Bell, User, BookOpen, ShieldAlert, ShieldCheck, LogOut, Key } from 'lucide-react';

export default function TopBar({ 
  currentTab, 
  currentRole, 
  isCollapsed, 
  setIsCollapsed, 
  totalPendingFines,
  currentStudentId,
  setCurrentStudentId,
  authToken,
  currentUser,
  onOpenJwtModal,
  onLogout,
  onToast 
}) {
  const isStudent = currentRole === 'student';

  const tabTitles = {
    // Student links
    student_dashboard: { title: 'Student Dashboard', subtitle: 'Quick status of active borrowings, overdue alerts & library hours' },
    student_catalog: { title: 'Explore Books', subtitle: 'Browse college library catalog by title, author, department & rack number' },
    student_my_books: { title: 'My Borrowed Books', subtitle: 'Track strict 30-day loan countdowns, borrow dates & overdue status' },
    student_my_fines: { title: 'My Fines & Dues', subtitle: 'Pending overdue penalties (₹5/day) & instant UPI payment history' },
    student_profile: { title: 'Patron Profile & Digital Pass', subtitle: 'Student credentials and scannable barcode library card' },

    // Admin links
    admin_dashboard: { title: 'Administrative Dashboard', subtitle: 'Overview of total stock, daily checkouts, active borrowers & defaults' },
    admin_in_library: { title: 'Books in Library', subtitle: 'On-shelf inventory verified on library racks ready for checkout' },
    admin_circulation: { title: 'Book Issue', subtitle: 'Circulation desk issue & return (7, 14, 21, 30 days or manual date) and checked out monitor' },
    admin_checked_out: { title: 'Book Issue — Checked Out', subtitle: 'Volumes currently outside with students and faculty under active loans' },
    admin_books: { title: 'Book Management', subtitle: 'Full catalog CRUD, manual or auto unique Book IDs, and rack numbers' },
    admin_students: { title: 'Student Management', subtitle: 'Registered student records, borrow history & borrowing freeze controls' },
    admin_fines: { title: 'Overdue & Defaulters Register', subtitle: 'Students exceeding loan limits, cash/UPI collection & penalty waivers' },
    admin_permissions: { title: 'User Management', subtitle: 'Manage staff roles & toggle granular capability overrides' },
    admin_logs: { title: 'Forensic Audit Logs', subtitle: 'Immutable transaction trails capturing actors, actions, IPs & timestamps' }
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Campus Library', subtitle: 'Institutional Library Management' };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight leading-none">
                {currentInfo.title}
              </h1>
              <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isStudent 
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isStudent ? 'Patron View' : 'Admin Console'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: User Profile, JWT Badge & Logout Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Policy Banner (hidden on smaller screens) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>30-Day Loan Window • ₹5/Day Penalty</span>
          </div>

          {/* Overdue Alert Bell if fines exist */}
          {totalPendingFines > 0 && !isStudent && (
            <button
              onClick={() => onToast(`Defaulters Alert: Outstanding fines total ₹${totalPendingFines.toFixed(2)}.`, 'danger')}
              className="relative p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors"
              title="Overdue penalties active"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600" />
            </button>
          )}

          {/* Logged-In User Profile Identity Card */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {(currentUser.full_name || currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[150px]">
                  {currentUser.full_name || currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono leading-none flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {currentUser.role || (isStudent ? 'Student' : 'Staff')}
                  </span>
                  <span className="truncate max-w-[90px]">{currentUser.patron_id || currentUser.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* JWT Active Status & Token Inspector Trigger */}
          {authToken && (
            <button
              type="button"
              onClick={onOpenJwtModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
              title="Inspect Signed JWT Claims & Token"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">JWT Active</span>
              <span className="text-[10px] opacity-75 font-mono">HS256</span>
            </button>
          )}

          {/* Institutional Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-xs font-bold shadow-sm"
              title="Sign Out / Terminate JWT Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
