import React, { useState } from 'react';
import { 
  LayoutDashboard, PlusCircle, BookOpen, ArrowLeftRight, Users, 
  Settings, ChevronLeft, ChevronRight, Check, LogOut, Sparkles,
  ShieldCheck, User
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentRole, 
  setCurrentRole, 
  currentUser,
  isCollapsed,
  setIsCollapsed,
  booksCount,
  activeLoansCount,
  overdueFinesCount,
  onLogout,
  onToast 
}) {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // The 6 requested sidebar pages with simple naming
  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      badge: overdueFinesCount > 0 ? `${overdueFinesCount} alert` : null,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    { 
      id: 'book_creation', 
      label: 'Create Book', 
      icon: PlusCircle 
    },
    { 
      id: 'all_books', 
      label: 'All Books', 
      icon: BookOpen,
      badge: booksCount ? `${booksCount}` : null,
      badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200'
    },
    { 
      id: 'book_issues_returns', 
      label: 'Issues & Returns', 
      icon: ArrowLeftRight,
      badge: activeLoansCount ? `${activeLoansCount} out` : null,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    { 
      id: 'user_management', 
      label: 'User Management', 
      icon: Users 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings 
    }
  ];

  // Helper to determine if a nav item is active (handles legacy alias tabs)
  const isTabActive = (id) => {
    if (currentTab === id) return true;
    if (id === 'dashboard' && (currentTab === 'admin_dashboard' || currentTab === 'student_dashboard')) return true;
    if (id === 'all_books' && (currentTab === 'admin_books' || currentTab === 'admin_in_library' || currentTab === 'student_catalog')) return true;
    if (id === 'book_issues_returns' && (currentTab === 'admin_circulation' || currentTab === 'admin_checked_out' || currentTab === 'admin_fines' || currentTab === 'student_my_books' || currentTab === 'student_my_fines')) return true;
    if (id === 'user_management' && (currentTab === 'admin_students' || currentTab === 'admin_permissions' || currentTab === 'admin_logs' || currentTab === 'student_profile')) return true;
    return false;
  };

  const roles = [
    { id: 'superadmin', title: 'Superadmin Console', tag: 'Sovereign' },
    { id: 'librarian', title: 'Chief Librarian', tag: 'Acquisitions' },
    { id: 'substaff', title: 'Circulation Desk Staff', tag: 'Desk Ops' },
    { id: 'student', title: 'Student / Patron', tag: 'Patron' }
  ];

  const activeRoleObj = roles.find(r => r.id === currentRole) || roles[0];

  const handleRoleSelect = (r) => {
    setCurrentRole(r.id);
    setRoleDropdownOpen(false);
    if (onToast) onToast(`Switched active persona to ${r.title}`, 'info');
  };

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-zinc-200/90 transition-all duration-200 ease-in-out flex flex-col justify-between select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Navigation */}
      <div>
        {/* Brand / Logo Section */}
        <div className={`h-16 flex items-center border-b border-zinc-100 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm text-zinc-900 tracking-tight leading-none truncate">
                  Campus Library
                </span>
                <span className="text-[10px] font-medium text-zinc-400 truncate mt-1">
                  Management Console
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0" title="Campus Library">
              <BookOpen className="w-4 h-4" />
            </div>
          )}

          {/* Collapse Button */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="Collapse sidebar"
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
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isTabActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full group relative flex items-center rounded-xl text-xs font-medium transition-all ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  active
                    ? 'bg-zinc-900 text-white shadow-xs font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`shrink-0 transition-transform group-hover:scale-105 ${
                    active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'
                  } ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />

                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    active ? 'bg-white/15 text-white border-white/20' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Persona, Role Switcher & Logout */}
      <div className="p-3 border-t border-zinc-100 space-y-2">
        {/* Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100 transition-all ${
              isCollapsed ? 'p-2 flex items-center justify-center' : 'p-2.5 flex items-center justify-between text-left'
            }`}
            title="Switch User Role"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                {(currentUser?.full_name || activeRoleObj.title).charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-zinc-900 truncate">
                    {currentUser?.full_name || activeRoleObj.title}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {currentUser?.patron_id || activeRoleObj.tag}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white text-zinc-600 border border-zinc-200 shrink-0">
                Switch
              </span>
            )}
          </button>

          {/* Role Dropdown Popup */}
          {roleDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
              <div className={`absolute bottom-full mb-2 rounded-2xl bg-white border border-zinc-200 shadow-xl z-50 p-2 text-xs space-y-1 ${
                isCollapsed ? 'left-0 w-56' : 'left-0 right-0'
              }`}>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                  Switch Active Role
                </div>
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                      currentRole === r.id
                        ? 'bg-zinc-900 text-white font-medium'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <span>{r.title}</span>
                    {currentRole === r.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Minimal Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full rounded-xl border border-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-500 flex items-center justify-center transition-colors ${
              isCollapsed ? 'h-9' : 'py-2 px-3 gap-2 text-xs font-medium'
            }`}
            title="Log Out Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
