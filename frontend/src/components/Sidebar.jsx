import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  BookOpen, 
  PlusCircle, 
  ArrowLeftRight, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut 
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  currentRole, 
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

  useEffect(() => {
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

  // Actual library management pages mapped into standardized UI theme categories
  const navSections = [
    {
      category: 'MAIN',
      items: [
        { 
          id: 'dashboard', 
          label: 'Dashboard', 
          icon: LayoutGrid
        }
      ]
    },
    {
      category: 'MANAGEMENT',
      items: [
        { 
          id: 'all_books', 
          label: 'All Books', 
          icon: BookOpen
        },
        { 
          id: 'book_creation', 
          label: 'Create Book', 
          icon: PlusCircle 
        }
      ]
    },
    {
      category: 'OPERATIONS',
      items: [
        { 
          id: 'book_issues_returns', 
          label: 'Issues & Returns', 
          icon: ArrowLeftRight
        }
      ]
    },
    {
      category: 'ADMINISTRATION',
      items: [
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
      ]
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

  // Filter sections by role page privileges
  const allowedSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isSuperadmin || effectivePermissions.includes(item.id))
    }))
    .filter(section => section.items.length > 0);

  const displayName = currentUser?.full_name || 'KAKILETI V. V. ...';
  const displayRole = currentUser?.role || 'Administrator';
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || 'K';

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-40 border-r transition-all duration-200 ease-in-out flex flex-col justify-between select-none font-['Plus_Jakarta_Sans',sans-serif] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        backgroundColor: 'var(--sidebar)',
        borderColor: 'var(--border)',
        color: 'var(--sidebar-text)',
        boxShadow: '4px 0 24px -2px rgba(10, 20, 35, 0.45)'
      }}
    >
      {/* Floating Circular Collapse/Expand Button Protruding on Right Border */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-[106px] z-50 w-6 h-6 rounded-full shadow-md border flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)'
        }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: 'var(--text-primary)' }} />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: 'var(--text-primary)' }} />
        )}
      </button>

      {/* Top Header & Navigation */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Campo Brand Header with Thin Divider Line Below */}
        <div 
          className={`pt-6 pb-4 border-b flex flex-col items-center justify-center ${isCollapsed ? 'px-2' : 'px-6'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          {!isCollapsed ? (
            <div className="flex flex-col items-center justify-center text-center w-full">
              <div className="flex items-center justify-center w-full">
                <img
                  src="/campo-logos/campo_logo_transparent_hq.png"
                  alt="Campo"
                  className="h-7 w-auto object-contain object-center max-w-[120px]"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback stylized text */}
                <div 
                  className="hidden items-baseline justify-center font-bold text-2xl tracking-tight text-center"
                  style={{ color: 'var(--sidebar-text)' }}
                >
                  <span style={{ color: 'var(--secondary)' }}>C</span>ampo
                </div>
              </div>

              {/* Subtitle */}
              <span 
                className="text-[12px] font-medium mt-2 tracking-[-0.01em] truncate block leading-tight text-center w-full"
                style={{ color: 'var(--sidebar-muted)' }}
              >
                Library Management
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1">
              <img
                src="/campo-logos/favicon.ico"
                alt="Campo"
                title="Campo Library Management"
                className="w-9 h-9 rounded-xl shadow-xs"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className="hidden w-9 h-9 rounded-xl font-bold text-sm items-center justify-center"
                style={{ backgroundColor: 'var(--primary-hover)', color: 'var(--sidebar-text)' }}
              >
                C
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 space-y-6 pt-3 pb-4 custom-dark-scrollbar">
          {allowedSections.map((section, sIdx) => (
            <div key={section.category || sIdx} className="space-y-1">
              {/* Category Title */}
              {!isCollapsed ? (
                <div 
                  className="px-3.5 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.06em] leading-none"
                  style={{ color: 'var(--sidebar-muted)' }}
                >
                  {section.category}
                </div>
              ) : (
                <div 
                  className="my-2 border-t mx-2"
                  style={{ borderColor: 'var(--border)' }}
                />
              )}

              {/* Navigation Items */}
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isTabActive(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full group relative flex items-center rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                    } ${
                      active ? 'font-semibold shadow-xs' : 'font-medium hover:opacity-80'
                    }`}
                    style={
                      active
                        ? { backgroundColor: 'var(--primary)', color: 'var(--sidebar-text)' }
                        : { color: 'var(--sidebar-text)' }
                    }
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon 
                        strokeWidth={2}
                        className={`shrink-0 transition-opacity ${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`}
                        style={{ color: 'var(--sidebar-text)' }}
                      />

                      {!isCollapsed && (
                        <span 
                          className="truncate leading-none text-[13px] tracking-normal"
                          style={{ color: 'var(--sidebar-text)' }}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>

                    {/* Tooltip in Collapsed Mode */}
                    {isCollapsed && (
                      <div 
                        className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border"
                        style={{
                          backgroundColor: 'var(--sidebar)',
                          borderColor: 'var(--border)',
                          color: 'var(--sidebar-text)'
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Profile Card */}
      <div className="p-3.5 shrink-0">
        <div 
          className={`w-full rounded-2xl transition-all ${
            isCollapsed ? 'p-2 flex items-center justify-center' : 'h-16 px-3.5 flex items-center justify-between'
          }`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}
          title={isCollapsed ? `${displayName} (${displayRole})` : undefined}
        >
          {/* Avatar & User Details */}
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-extrabold shrink-0 shadow-inner"
              style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)'
              }}
            >
              {initialLetter}
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden min-w-0 pr-1 leading-tight">
                <div 
                  className="text-[13px] font-bold tracking-[0.01em] truncate"
                  style={{ color: 'var(--sidebar-text)' }}
                >
                  {displayName}
                </div>
                <div 
                  className="text-[11px] font-normal truncate mt-0.5"
                  style={{ color: 'var(--sidebar-muted)' }}
                >
                  {displayRole}
                </div>
              </div>
            )}
          </div>

          {/* Logout Action Button on the Right */}
          {!isCollapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:opacity-80 transition-colors cursor-pointer shrink-0 ml-1"
              style={{ color: 'var(--sidebar-muted)' }}
              title="Log Out Session"
            >
              <LogOut className="w-4 h-4 stroke-[2]" style={{ color: 'var(--sidebar-text)' }} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
