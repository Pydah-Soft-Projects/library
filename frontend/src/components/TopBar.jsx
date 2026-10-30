import React from 'react';
import { Menu, Clock, Bell, User, BookOpen, ShieldCheck, LogOut } from 'lucide-react';

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
  const tabTitles = {
    // 6 Primary Sidebar Pages
    dashboard: { title: 'Dashboard', subtitle: 'Central campus library metrics, active circulations & recent activity' },
    book_creation: { title: 'Book Creation', subtitle: 'Accession new volumes with auto/manual IDs, shelf racks & copies' },
    all_books: { title: 'All Books Catalog', subtitle: 'Browse, search, edit, and inspect physical library collection' },
    book_issues_returns: { title: 'Book Issues & Returns', subtitle: 'Circulation desk: issue books, return volumes, and calculate fines' },
    user_management: { title: 'User Management', subtitle: 'Registered student patrons, hold states, and staff role permissions' },
    settings: { title: 'Settings', subtitle: 'Circulation policies, fine tariffs, institutional profile & system status' },

    // Aliases / Legacy mappings
    admin_dashboard: { title: 'Dashboard', subtitle: 'Operations overview and live statistics' },
    student_dashboard: { title: 'Dashboard', subtitle: 'Status of active borrowings and overdue alerts' },
    admin_books: { title: 'All Books Catalog', subtitle: 'Inventory and book ID records' },
    admin_in_library: { title: 'All Books Catalog', subtitle: 'On-shelf available inventory' },
    student_catalog: { title: 'All Books Catalog', subtitle: 'Browse college library catalog' },
    admin_circulation: { title: 'Book Issues & Returns', subtitle: 'Circulation desk issue and returns' },
    admin_checked_out: { title: 'Book Issues & Returns', subtitle: 'Volumes currently on loan' },
    admin_fines: { title: 'Book Issues & Returns', subtitle: 'Defaulters register and fine ledgers' },
    admin_students: { title: 'User Management', subtitle: 'Patron records and account holds' },
    admin_permissions: { title: 'User Management', subtitle: 'Role-based access control matrix' },
    admin_logs: { title: 'Dashboard', subtitle: 'Audit trails and system logs' }
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Campus Library', subtitle: 'Central Library Management System' };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200/90 px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-zinc-900 tracking-tight leading-none">
                {currentInfo.title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Policy Pill, Overdue Alert, User Profile, Session */}
        <div className="flex items-center gap-2.5">
          {/* Subtle Lending Rule Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-600 text-[11px] font-medium">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>30-Day Loan Window • ₹5/Day</span>
          </div>

          {/* Overdue Alert Bell if fines exist */}
          {totalPendingFines > 0 && (
            <button
              onClick={() => onToast && onToast(`Defaulters Alert: Unpaid fines total ₹${totalPendingFines.toFixed(2)}.`, 'danger')}
              className="relative p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors"
              title="Overdue penalties active"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
            </button>
          )}

          {/* User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {(currentUser.full_name || currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-zinc-800 leading-tight truncate max-w-[140px]">
                  {currentUser.full_name || currentUser.name}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono leading-none mt-0.5 truncate max-w-[140px]">
                  {currentUser.role || 'Staff'} • {currentUser.patron_id || currentUser.email}
                </div>
              </div>
            </div>
          )}

          {/* JWT Status Pill */}
          {authToken && (
            <button
              type="button"
              onClick={onOpenJwtModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors shadow-2xs"
              title="View JWT Security Claims"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">JWT</span>
            </button>
          )}

          {/* Sign Out */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-500 transition-colors"
              title="Log Out Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
