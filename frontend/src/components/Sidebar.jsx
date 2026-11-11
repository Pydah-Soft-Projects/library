import React, { useState } from 'react';
import { 
  LayoutDashboard, PlusCircle, BookOpen, ArrowLeftRight, Users, 
  Settings, ChevronLeft, ChevronRight, LogOut 
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentRole, 
  setCurrentRole, 
  currentUser,
  roles: propRoles = [],
  isCollapsed,
  setIsCollapsed,
  booksCount,
  activeLoansCount,
  overdueFinesCount,
  onLogout,
  onToast 
}) {
  const [internalRoles, setInternalRoles] = useState([]);

  React.useEffect(() => {
    if (propRoles && propRoles.length > 0) {
      setInternalRoles(propRoles);
    } else {
      fetch('/api/roles')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.roles)) {
            setInternalRoles(data.roles);
          }
        })
        .catch(() => {});
    }
  }, [propRoles]);

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

  const dynamicRoleList = (internalRoles.length > 0 ? internalRoles : propRoles).map(r => ({
    id: r.name || r.id,
    title: r.name || r.title,
    tag: r.is_system ? 'System' : 'Dynamic Role',
    page_privileges: r.page_privileges || r.permissions || []
  }));

  const roles = dynamicRoleList.length > 0 ? dynamicRoleList : [
    { id: 'Superadmin', title: 'Superadmin', tag: 'System', page_privileges: ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings'] }
  ];

  const activeRoleObj = roles.find(r => 
    r.id?.toLowerCase() === (currentRole || '').toLowerCase() ||
    r.title?.toLowerCase() === (currentRole || '').toLowerCase()
  ) || roles[0];

  const isSuperadmin = (currentRole || '').toLowerCase() === 'superadmin' || 
                       (currentUser?.role || '').toLowerCase() === 'superadmin';

  const effectivePermissions = isSuperadmin
    ? ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings']
    : (Array.isArray(currentUser?.permissions) && currentUser.permissions.length > 0
        ? currentUser.permissions
        : (activeRoleObj?.page_privileges || ['dashboard', 'all_books']));

  const allowedNavItems = navItems.filter(item => isSuperadmin || effectivePermissions.includes(item.id));

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-40 border-r transition-all duration-200 ease-in-out flex flex-col justify-between select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ 
        backgroundColor: 'var(--sidebar)', 
        borderColor: 'var(--border)', 
        color: 'var(--sidebar-text)' 
      }}
    >
      {/* Top Header & Navigation */}
      <div>
        {/* Brand / Logo Section */}
        <div 
          className={`h-16 flex items-center border-b px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex flex-col leading-tight min-w-0">
                <img
                  src="/campo-logos/campo_logo_transparent_hq.png"
                  alt="Campo"
                  className="h-7 w-auto object-contain object-left"
                />
                <span 
                  className="text-[10px] font-medium truncate mt-1"
                  style={{ color: 'var(--sidebar-muted)' }}
                >
                  Library Management
                </span>
              </div>
            </div>
          ) : (
            <img
              src="/campo-logos/favicon.svg"
              alt="Campo"
              title="Campo Library Management"
              className="w-8 h-8 rounded-lg shadow-xs shrink-0"
            />
          )}

          {/* Collapse Button */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-80"
              style={{ color: 'var(--sidebar-muted)' }}
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
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-80"
              style={{ color: 'var(--sidebar-muted)' }}
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation List - Filtered by User Privileges */}
        <nav className="p-3 space-y-1">
          {allowedNavItems.map(item => {
            const Icon = item.icon;
            const active = isTabActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full group relative flex items-center rounded-xl text-xs transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${active ? 'font-bold' : 'font-medium hover:opacity-90'}`}
                style={
                  active
                    ? { backgroundColor: 'var(--primary)', color: '#ffffff' }
                    : { color: 'var(--sidebar-text)' }
                }
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`}
                    style={{ color: active ? '#ffffff' : 'inherit' }}
                  />

                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span 
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={
                      active
                        ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }
                        : { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--border)' }
                    }
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div 
                    className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md"
                    style={{ backgroundColor: 'var(--sidebar)' }}
                  >
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Persona, Role Switcher & Logout */}
      <div 
        className="p-3 border-t space-y-2"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* User Account Profile */}
        <div
          className={`w-full rounded-xl border ${
            isCollapsed ? 'p-2 flex items-center justify-center' : 'p-2.5 flex items-center justify-between text-left'
          }`}
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          title="Institutional User Account"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {(currentUser?.full_name || activeRoleObj.title).charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div 
                  className="text-xs font-bold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentUser?.full_name || activeRoleObj.title}
                </div>
                <div 
                  className="text-[10px] truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {currentUser?.role || activeRoleObj.title} • {currentUser?.patron_id || activeRoleObj.tag}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full rounded-xl border hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer ${
              isCollapsed ? 'h-9' : 'py-2 px-3 gap-2 text-xs font-medium'
            }`}
            style={{ 
              borderColor: 'var(--border)', 
              color: 'var(--text-secondary)' 
            }}
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
