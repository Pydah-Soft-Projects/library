import React from 'react';
import { Menu, Clock, Bell, BookOpen, ShieldCheck, LogOut } from 'lucide-react';

export default function TopBar({ 
  currentTab, 
  isCollapsed, 
  setIsCollapsed, 
  totalPendingFines,
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
    <header 
      className="sticky top-0 z-30 border-b px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-200 backdrop-blur-md"
      style={{ 
        backgroundColor: 'var(--navbar, var(--surface))', 
        borderColor: 'var(--border)' 
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 
                className="font-bold text-base sm:text-lg tracking-tight leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                {currentInfo.title}
              </h1>
              <span 
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                style={{ 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  borderColor: 'var(--border)' 
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                Live
              </span>
            </div>
            <p 
              className="text-[11px] mt-0.5 hidden sm:block"
              style={{ color: 'var(--text-secondary)' }}
            >
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Policy Pill, Overdue Alert, User Profile, Session */}
        <div className="flex items-center gap-2.5">
          {/* Subtle Lending Rule Pill */}
          <div 
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderColor: 'var(--border)', 
              color: 'var(--text-secondary)' 
            }}
          >
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span>30-Day Loan Window • ₹5/Day</span>
          </div>

          {/* Overdue Alert Bell if fines exist */}
          {totalPendingFines > 0 && (
            <button
              onClick={() => onToast && onToast(`Defaulters Alert: Unpaid fines total ₹${totalPendingFines.toFixed(2)}.`, 'danger')}
              className="relative p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              title="Overdue penalties active"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
            </button>
          )}

          {/* User Profile Card */}
          {currentUser && (
            <div 
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)' 
              }}
            >
              <div 
                className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {(currentUser.full_name || currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div 
                  className="text-xs font-bold leading-tight truncate max-w-[140px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentUser.full_name || currentUser.name}
                </div>
                <div 
                  className="text-[10px] font-mono leading-none mt-0.5 truncate max-w-[140px]"
                  style={{ color: 'var(--text-muted)' }}
                >
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text-secondary)' 
              }}
              title="View JWT Security Claims"
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              <span className="hidden md:inline font-semibold">JWT</span>
            </button>
          )}

          {/* Sign Out */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl border hover:opacity-80 transition-colors"
              style={{ 
                borderColor: 'var(--border)', 
                color: 'var(--text-secondary)' 
              }}
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
