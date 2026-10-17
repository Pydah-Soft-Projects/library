import React, { useState } from 'react';
import { 
  LayoutDashboard, Search, BookOpen, CreditCard, User, 
  RefreshCw, Users, AlertTriangle, ShieldCheck, FileText, 
  ChevronLeft, ChevronRight, Check, LogOut, Sparkles, BookMarked
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentRole, 
  setCurrentRole, 
  currentUser,
  isCollapsed,
  setIsCollapsed,
  activeLoansCount,
  overdueFinesCount,
  studentActiveLoansCount,
  studentHasOverdue,
  studentFineAmount,
  onLogout,
  onToast 
}) {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const isStudent = currentRole === 'student';
  const isSuperadmin = currentRole === 'superadmin';

  // 1. Student Navbar Items (Strictly Read-Only & Personal Tracking)
  const studentNavItems = [
    { 
      id: 'student_dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      desc: 'Status & Alerts',
      badge: studentHasOverdue ? 'Hold Alert' : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
    },
    { 
      id: 'student_catalog', 
      label: 'Explore Books', 
      icon: Search, 
      desc: 'Read-Only Catalog' 
    },
    { 
      id: 'student_my_books', 
      label: 'My Books', 
      icon: BookMarked, 
      desc: '30-Day Loan Tracker',
      badge: studentActiveLoansCount ? `${studentActiveLoansCount} Active` : null,
      badgeColor: studentHasOverdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
    },
    { 
      id: 'student_my_fines', 
      label: 'My Fines', 
      icon: CreditCard, 
      desc: 'Pending Dues & UPI',
      badge: studentFineAmount > 0 ? `₹${studentFineAmount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
    },
    { 
      id: 'student_profile', 
      label: 'Profile & Pass', 
      icon: User, 
      desc: 'Digital Barcode ID' 
    }
  ];

  // 2. Staff & Superadmin Navbar Items (Administrative & Desk Operations)
  const adminNavItems = [
    { 
      id: 'admin_dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      desc: 'Institutional Overview' 
    },
    { 
      id: 'admin_in_library', 
      label: 'Books in Library', 
      icon: BookOpen, 
      desc: 'On-Shelf Inventory' 
    },
    { 
      id: 'admin_circulation', 
      label: 'Book Issue', 
      icon: RefreshCw, 
      desc: 'Circulation Desk & Checked Out',
      badge: activeLoansCount ? `${activeLoansCount} out` : null,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
    },
    { 
      id: 'admin_books', 
      label: 'Book Management', 
      icon: BookOpen, 
      desc: 'Add & Edit Manual/Auto ID' 
    },
    { 
      id: 'admin_students', 
      label: 'Student Records', 
      icon: Users, 
      desc: 'Patrons & Loan History' 
    },
    { 
      id: 'admin_fines', 
      label: 'Overdue & Fines', 
      icon: AlertTriangle, 
      desc: 'Defaulters & Collection',
      badge: overdueFinesCount ? `${overdueFinesCount} late` : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
    },
    // Superadmin Only links
    ...(isSuperadmin ? [
      { 
        id: 'admin_permissions', 
        label: 'User Management', 
        icon: ShieldCheck, 
        desc: 'Roles & Privileges' 
      },
      { 
        id: 'admin_logs', 
        label: 'Audit Logs', 
        icon: FileText, 
        desc: 'Forensic Audit Trails' 
      }
    ] : [])
  ];

  const currentNavItems = isStudent ? studentNavItems : adminNavItems;

  const roles = [
    { id: 'student', title: '🎓 Student / Patron', name: 'Priya Sharma (STU-2023-CS042)', tag: 'Student View', color: 'text-emerald-500' },
    { id: 'substaff', title: '📋 Front-Desk Staff', name: 'Ramesh Kumar', tag: 'Staff Desk', color: 'text-blue-500' },
    { id: 'librarian', title: '📖 Chief Librarian', name: 'Dr. K. Radhakrishnan', tag: 'Librarian', color: 'text-purple-500' },
    { id: 'superadmin', title: '👑 Superadmin', name: 'Dr. A.K. Sharma', tag: 'Sovereign', color: 'text-amber-500' }
  ];

  const activeRoleObj = roles.find(r => r.id === currentRole) || roles[0];

  const handleRoleSelect = (r) => {
    setCurrentRole(r.id);
    setRoleDropdownOpen(false);
    // Set appropriate initial tab
    if (r.id === 'student') {
      setCurrentTab('student_dashboard');
    } else {
      setCurrentTab('admin_dashboard');
    }
    onToast(`Switched interface to ${r.title}`, 'info');
  };

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between select-none shadow-xl shadow-slate-200/50 dark:shadow-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Brand */}
      <div>
        <div className={`h-16 flex items-center border-b border-slate-100 dark:border-slate-800/80 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-heading font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-none truncate">
                  Campus <span className="text-blue-600 dark:text-blue-400">Library</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                  {isStudent ? 'Patron Self-Service' : 'Admin & Staff Portal'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0" title="Campus Library">
              <BookOpen className="w-5 h-5" />
            </div>
          )}

          {/* Collapse Button */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse to half width"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Re-expand button when collapsed */}
        {isCollapsed && (
          <div className="pt-2 px-2 flex justify-center">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Interface Mode Tag */}
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isStudent 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
            }`}>
              {isStudent ? '🎓 Student Portal' : isSuperadmin ? '👑 Superadmin Console' : '📋 Staff Operations'}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5">
          {currentNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isCollapsed ? `${item.label} — ${item.desc}` : undefined}
                className={`w-full group relative flex items-center rounded-xl font-medium transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  } ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />

                  {!isCollapsed && (
                    <div className="text-left">
                      <div className="text-xs leading-none">{item.label}</div>
                      <div className={`text-[10px] mt-1 ${isActive ? 'text-blue-100 font-normal' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Persona, Role Switcher & Dark Mode */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {/* Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
              isCollapsed ? 'p-2 flex items-center justify-center' : 'p-2.5 flex items-center justify-between text-left'
            }`}
            title="Switch User Role"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {(currentUser?.full_name || activeRoleObj.name).charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser?.full_name || activeRoleObj.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser?.patron_id || currentUser?.role || activeRoleObj.title}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                Switch
              </span>
            )}
          </button>

          {/* Role Dropdown Popup */}
          {roleDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
              <div className={`absolute bottom-full mb-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 ${
                isCollapsed ? 'left-0 w-64' : 'left-0 right-0'
              }`}>
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Switch Active Role
                </div>
                <div className="space-y-1 mt-1">
                  {roles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleRoleSelect(r)}
                      className={`w-full flex items-start justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                        currentRole === r.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{r.title}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.name}</div>
                      </div>
                      {currentRole === r.id && <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Institutional Logout Action */}
        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all shadow-sm ${
              isCollapsed ? 'h-10' : 'py-2.5 px-3 gap-2 text-xs font-bold'
            }`}
            title="Log Out (Terminate Session)"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Log Out Session</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
