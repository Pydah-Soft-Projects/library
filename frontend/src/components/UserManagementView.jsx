import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, Plus, ShieldCheck, Lock, Unlock, 
  Settings, Check, X, Shield, RefreshCw, Filter,
  ArrowRight, UserCheck, Key, AlertCircle, Building2,
  LayoutDashboard, BookOpen, ArrowLeftRight, CheckCircle2,
  Trash2, Edit3, UserPlus, ExternalLink, Sparkles, UserMinus
} from 'lucide-react';

const PAGE_PRIVILEGES_LIST = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, description: 'Overview metrics, live circulation statistics & activity feed' },
  { id: 'book_creation', name: 'Create Book', icon: Plus, description: 'Accession book holdings with sequential barcodes' },
  { id: 'all_books', name: 'All Books', icon: BookOpen, description: 'Browse, search, edit & inspect physical library catalog' },
  { id: 'book_issues_returns', name: 'Issues & Returns', icon: ArrowLeftRight, description: 'Issue 30-day loans, return books & process fines' },
  { id: 'user_management', name: 'User Management', icon: Users, description: 'Map HRMS IDs, dynamic roles & user page privileges' },
  { id: 'settings', name: 'Settings', icon: Settings, description: 'Library lending policies, tariffs & system configuration' }
];

const ROLE_COLORS = {
  zinc: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function UserManagementView({ onToast }) {
  const [activeTab, setActiveTab] = useState('mapped_users'); // 'mapped_users' | 'roles'
  const [loading, setLoading] = useState(false);

  // Mapped library users (persisted in localStorage and live from DB)
  const [mappedUsers, setMappedUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_mapped_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    try {
      if (mappedUsers && mappedUsers.length > 0) {
        localStorage.setItem('lm_mapped_users', JSON.stringify(mappedUsers));
      }
    } catch {}
  }, [mappedUsers]);

  // Search in Mapped Users
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [privilegeModalUser, setPrivilegeModalUser] = useState(null);
  const [changeRoleUser, setChangeRoleUser] = useState(null);

  // Create User Form State (HRMS ID Mapping)
  const [hrmsSearchResults, setHrmsSearchResults] = useState([]);
  const [isHrmsDropdownOpen, setIsHrmsDropdownOpen] = useState(false);
  const hrmsDropdownRef = useRef(null);
  const [userForm, setUserForm] = useState({
    emp_no: '',
    verifiedEmployee: null,
    verifying: false,
    role_name: '',
    page_privileges: []
  });

  // Create Role Form State
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: 'zinc',
    page_privileges: ['dashboard', 'all_books']
  });

  // Fetch Mapped Users and Roles on mount
  const loadData = async () => {
    setLoading(true);
    try {
      // Strictly fetch mapped library staff users from HRMS assignments
      const assignRes = await fetch('/api/roles/assignments');
      const assignData = await assignRes.json();
      if (assignData && Array.isArray(assignData.users)) {
        setMappedUsers(assignData.users);
      } else if (assignData && assignData.assignments) {
        const list = Object.keys(assignData.assignments).map(empNo => ({
          emp_no: empNo,
          name: assignData.assignments[empNo].employee_name || `Employee #${empNo}`,
          department: assignData.assignments[empNo].department || 'General',
          division: assignData.assignments[empNo].division || '',
          role: assignData.assignments[empNo].role_name,
          page_privileges: assignData.assignments[empNo].page_privileges || ['dashboard', 'all_books'],
          assigned_by: assignData.assignments[empNo].assigned_by,
          assigned_at: assignData.assignments[empNo].assigned_at
        }));
        setMappedUsers(list);
      }

      // 2. Fetch Roles (merged with standard library roles)
      const roleRes = await fetch('/api/roles');
      const roleData = await roleRes.json();
      const seen = new Set();
      const mergedRoles = [];

      if (roleData && Array.isArray(roleData.roles)) {
        for (const r of roleData.roles) {
          const norm = (r.name || '').trim().toLowerCase();
          if (!seen.has(norm)) {
            seen.add(norm);
            mergedRoles.push(r);
          }
        }
      }

      setRoles(mergedRoles);

      // 3. Fetch HRMS Departments
      const deptRes = await fetch('/api/hrms/departments');
      const deptData = await deptRes.json();
      if (deptData && Array.isArray(deptData.departments)) {
        setDepartments(deptData.departments);
      }
    } catch (err) {
      console.error('Error loading user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dynamic live HRMS lookup: shows all users matching that number as you type
  const hrmsDebounceRef = useRef(null);
  useEffect(() => {
    const cleanId = String(userForm.emp_no || '').trim();
    if (!cleanId) {
      setHrmsSearchResults([]);
      setIsHrmsDropdownOpen(false);
      setUserForm(prev => ({ ...prev, verifying: false }));
      return;
    }

    if (userForm.verifiedEmployee && (String(userForm.verifiedEmployee.emp_no) === cleanId || String(userForm.verifiedEmployee.hrms_id) === cleanId)) {
      return;
    }

    clearTimeout(hrmsDebounceRef.current);
    setUserForm(prev => ({ ...prev, verifying: true }));

    hrmsDebounceRef.current = setTimeout(async () => {
      try {
        const searchRes = await fetch('/api/hrms/employees?search=' + encodeURIComponent(cleanId) + '&limit=25');
        const searchData = await searchRes.json();
        if (searchData.employees && Array.isArray(searchData.employees)) {
          setHrmsSearchResults(searchData.employees);
          setIsHrmsDropdownOpen(true);
        } else {
          setHrmsSearchResults([]);
        }
      } catch (err) {
        console.warn('HRMS search error:', err.message);
        setHrmsSearchResults([]);
      } finally {
        setUserForm(prev => ({ ...prev, verifying: false }));
      }
    }, 200);

    return () => clearTimeout(hrmsDebounceRef.current);
  }, [userForm.emp_no, userForm.verifiedEmployee]);

  // Click outside listener to dismiss HRMS search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hrmsDropdownRef.current && !hrmsDropdownRef.current.contains(e.target)) {
        setIsHrmsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper when role changes in Create User Form
  const handleRoleChangeInForm = (newRoleName) => {
    const targetRole = roles.find(r => r.name === newRoleName);
    const defaultPrivs = targetRole?.page_privileges || ['dashboard', 'all_books'];
    setUserForm(prev => ({
      ...prev,
      role_name: newRoleName,
      page_privileges: defaultPrivs
    }));
  };

  // Action: Submit Create User Account Mapping
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    const cleanId = String(userForm.emp_no || '').trim();
    if (!cleanId) {
      if (onToast) onToast('Please enter an HRMS Employee ID.', 'danger');
      return;
    }

    if (!userForm.role_name) {
      if (onToast) onToast('Please select a library role to assign.', 'danger');
      return;
    }

    const empName = userForm.verifiedEmployee?.name || `Employee #${cleanId}`;
    const empDept = userForm.verifiedEmployee?.department || 'General';
    const empDiv = userForm.verifiedEmployee?.division || '';
    const empEmail = userForm.verifiedEmployee?.email || '';

    try {
      const res = await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_no: cleanId,
          employee_name: empName,
          department: empDept,
          division: empDiv,
          email: empEmail,
          role_name: userForm.role_name,
          page_privileges: userForm.page_privileges
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to map user account');

      if (onToast) {
        onToast(`User account created for ${empName} (#${cleanId}) with role "${userForm.role_name}"!`, 'success');
      }

      // Add to local mappedUsers state
      const newEntry = {
        emp_no: cleanId,
        name: empName,
        department: empDept,
        division: empDiv,
        email: empEmail,
        role: userForm.role_name,
        page_privileges: userForm.page_privileges,
        assigned_by: 'Superadmin',
        assigned_at: new Date().toISOString()
      };

      setMappedUsers(prev => {
        const filtered = prev.filter(u => u.emp_no !== cleanId);
        return [newEntry, ...filtered];
      });

      setIsCreateUserModalOpen(false);
      setUserForm({
        emp_no: '',
        verifiedEmployee: null,
        verifying: false,
        role_name: '',
    page_privileges: []
      });
      setActiveTab('mapped_users');
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Action: Delete User Account
  const handleDeleteUser = async (user) => {
    const isSuperadmin = (user.role || '').toLowerCase() === 'superadmin' || String(user.emp_no).toLowerCase() === 'superadmin';
    if (isSuperadmin) {
      if (onToast) onToast('Superadmin account cannot be deleted.', 'danger');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user account for ${user.name} (#${user.emp_no})? This will revoke their library access.`)) {
      return;
    }

    try {
      // 1. Delete HRMS user assignment
      const res = await fetch(`/api/roles/assignments/${user.emp_no}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user mapping');

      // 2. Also delete from patron/user directory if id is present
      if (user.id) {
        await fetch(`/api/users/${user.id}`, { method: 'DELETE' }).catch(() => {});
      }

      if (onToast) onToast(`User account for ${user.name} (#${user.emp_no}) deleted successfully.`, 'info');
      setMappedUsers(prev => prev.filter(u => u.emp_no !== user.emp_no));
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Action: Toggle Individual User Page Privilege (Instant Optimistic Update + Dual Sync)
  const handleToggleUserPrivilege = async (pageId, currentStatus) => {
    if (!privilegeModalUser) return;
    const nextStatus = !currentStatus;
    const empNo = privilegeModalUser.emp_no;
    const currentList = privilegeModalUser.page_privileges || [];
    
    // 1. Compute new privileges list
    const updatedPrivileges = nextStatus
      ? [...new Set([...currentList, pageId])]
      : currentList.filter(p => p !== pageId);

    // 2. Immediately update modal state and mappedUsers list (optimistic UI)
    setPrivilegeModalUser(prev => ({
      ...prev,
      page_privileges: updatedPrivileges
    }));

    setMappedUsers(prev => {
      const updated = prev.map(u => {
        if (u.emp_no === empNo) {
          return { ...u, page_privileges: updatedPrivileges };
        }
        return u;
      });
      try {
        localStorage.setItem('lm_mapped_users', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (onToast) {
      onToast(
        `${nextStatus ? 'Granted' : 'Revoked'} "${pageId}" for ${privilegeModalUser.name} (#${empNo})`,
        nextStatus ? 'success' : 'info'
      );
    }

    // 3. Persist to backend
    try {
      const res = await fetch('/api/roles/user-privilege', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_no: empNo,
          page_id: pageId,
          is_granted: nextStatus
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server failed to save privilege');
      }

      // If the modified user is currently logged in, update session immediately
      try {
        const activeUserRaw = localStorage.getItem('lm_jwt_user');
        if (activeUserRaw) {
          const activeUser = JSON.parse(activeUserRaw);
          if (String(activeUser.patron_id || activeUser.username) === String(empNo)) {
            activeUser.permissions = updatedPrivileges;
            localStorage.setItem('lm_jwt_user', JSON.stringify(activeUser));
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('Failed to save privilege:', err);
      if (onToast) onToast(`Error saving privilege: ${err.message}`, 'danger');
    }
  };

  // Action: Change User Role
  const handleChangeRoleSubmit = async (e) => {
    e.preventDefault();
    if (!changeRoleUser || !changeRoleUser.newRole) return;

    const targetRole = roles.find(r => r.name === changeRoleUser.newRole);
    const newPrivileges = targetRole?.page_privileges || ['dashboard', 'all_books'];

    try {
      const res = await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_no: changeRoleUser.emp_no,
          employee_name: changeRoleUser.name,
          department: changeRoleUser.department,
          role_name: changeRoleUser.newRole,
          page_privileges: newPrivileges
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change role');

      if (onToast) onToast(`Updated role to "${changeRoleUser.newRole}" for ${changeRoleUser.name}!`, 'success');

      setMappedUsers(prev => prev.map(u => {
        if (u.emp_no === changeRoleUser.emp_no) {
          return { ...u, role: changeRoleUser.newRole, page_privileges: newPrivileges };
        }
        return u;
      }));

      setChangeRoleUser(null);
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Action: Create Dynamic Role
  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      if (onToast) onToast('Please enter a role name.', 'danger');
      return;
    }

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          color: roleForm.color || 'zinc',
          page_privileges: roleForm.page_privileges
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create role');

      if (onToast) onToast(`Role "${roleForm.name}" created!`, 'success');

      if (data.role) {
        setRoles(prev => [data.role, ...prev]);
      } else {
        loadData();
      }

      setIsCreateRoleModalOpen(false);
      setRoleForm({
        name: '',
        description: '',
        color: 'zinc',
        page_privileges: ['dashboard', 'all_books']
      });
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Action: Open Edit Role Modal
  const handleOpenEditRole = (role) => {
    const isSuperadmin = (role.name || '').toLowerCase().trim() === 'superadmin' || String(role.id).toLowerCase().trim() === 'superadmin';
    if (isSuperadmin) {
      if (onToast) onToast('Superadmin role is protected and cannot be edited.', 'warning');
      return;
    }
    setEditingRole({
      id: role.id,
      name: role.name,
      originalName: role.name,
      description: role.description || '',
      color: role.color || 'zinc',
      page_privileges: Array.isArray(role.page_privileges) ? [...role.page_privileges] : ['dashboard', 'all_books'],
      is_system: isSuperadmin
    });
  };

  // Action: Submit Edit Role
  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editingRole.name.trim()) {
      if (onToast) onToast('Role name cannot be empty.', 'danger');
      return;
    }

    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRole.name.trim(),
          description: editingRole.description.trim(),
          color: editingRole.color,
          page_privileges: editingRole.page_privileges
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      if (onToast) onToast(`Role "${editingRole.name}" updated successfully!`, 'success');

      // Update role in roles list
      setRoles(prev => prev.map(r => (r.id === editingRole.id ? { ...r, ...data.role } : r)));

      // If role name was changed, update any active mapped users with this role
      if (editingRole.originalName !== editingRole.name.trim()) {
        setMappedUsers(prev => prev.map(u => {
          if (u.role?.toLowerCase() === editingRole.originalName.toLowerCase()) {
            return { ...u, role: editingRole.name.trim() };
          }
          return u;
        }));
      }

      setEditingRole(null);
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Action: Delete Role (Only Superadmin is strictly blocked, all other roles are deletable)
  const handleDeleteRole = async (role) => {
    const isSuperadmin = (role.name || '').toLowerCase().trim() === 'superadmin' || String(role.id).toLowerCase().trim() === 'superadmin';
    if (isSuperadmin) {
      if (onToast) onToast('Superadmin role is protected and cannot be deleted.', 'danger');
      return;
    }

    const assignedCount = mappedUsers.filter(u => u.role?.toLowerCase() === role.name?.toLowerCase()).length;
    const promptMsg = assignedCount > 0
      ? `Delete role "${role.name}"? ${assignedCount} active user(s) with this role will have their role unassigned.`
      : `Are you sure you want to delete role "${role.name}"?`;

    if (!window.confirm(promptMsg)) return;

    try {
      // Optimistically remove from roles state
      setRoles(prev => prev.filter(r => (r.id !== role.id && r.name?.toLowerCase() !== role.name?.toLowerCase())));

      // Reset any users mapped to this role
      setMappedUsers(prev => {
        const updated = prev.map(u => {
          if (u.role?.toLowerCase() === role.name?.toLowerCase()) {
            return { ...u, role: 'Unassigned' };
          }
          return u;
        });
        try {
          localStorage.setItem('lm_mapped_users', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (onToast) onToast(`Role "${role.name}" deleted successfully.`, 'info');

      // Call backend DELETE endpoint
      await fetch(`/api/roles/${role.id || encodeURIComponent(role.name)}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      if (onToast) onToast(err.message, 'danger');
    }
  };

  // Filtered mapped users
  const filteredUsers = mappedUsers.filter(u => {
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (!userSearchTerm) return true;
    const q = userSearchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.emp_no && u.emp_no.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.division && u.division.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Main Heading Only & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            User Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Map HRMS employee IDs to create library user accounts, manage dynamic roles, and assign page privileges
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setUserForm({
                emp_no: '',
                verifiedEmployee: null,
                verifying: false,
                role_name: '',
    page_privileges: []
              });
              setIsCreateUserModalOpen(true);
            }}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>

          <button
            onClick={() => setIsCreateRoleModalOpen(true)}
            className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Full-Width Metric Strip */}
      <div className="border-t border-b border-zinc-200 grid grid-cols-2 lg:grid-cols-4 py-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Active Library Accounts</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{mappedUsers.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Mapped from HRMS IDs</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Roles Available</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{roles.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Dynamic & system roles</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">HRMS Database</span>
          <div className="text-xs font-mono font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>LIVE CLUSTER CONNECTED</span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Zero local user storage</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Page Privileges</span>
          <div className="text-xs font-bold text-zinc-800 mt-1">Role-Based + Individual</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Granular toggle per user</span>
        </div>
      </div>

      {/* Tabs Navigation (Exact 2 Tabs) */}
      <div className="flex items-center justify-between border-b border-zinc-200">
        <div className="flex items-center gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('mapped_users')}
            className={`pb-3 transition-colors ${
              activeTab === 'mapped_users'
                ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Library Users ({mappedUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 transition-colors ${
              activeTab === 'roles'
                ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Roles & Privileges ({roles.length})
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-1.5 text-zinc-400 hover:text-zinc-800 transition-colors"
          title="Refresh User Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-800' : ''}`} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: MAPPED LIBRARY USERS ONLY */}
      {/* ============================================================ */}
      {activeTab === 'mapped_users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search mapped users by name, HRMS ID, or department..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-700 bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="All">All Roles ({roles.length})</option>
                {roles.map(r => (
                  <option key={r.id || r.name} value={r.name}>{r.name}</option>
                ))}
              </select>

              <button
                onClick={() => setIsCreateUserModalOpen(true)}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create User</span>
              </button>
            </div>
          </div>

          {/* User Table (Shows ONLY mapped accounts) */}
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center border-t border-b border-zinc-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs text-zinc-600 font-medium">
                {mappedUsers.length === 0 
                  ? 'No library user accounts created yet.' 
                  : 'No users match your search or filter.'}
              </div>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                Users are created individually by mapping an HRMS Employee ID with custom permissions.
              </p>
              <button
                onClick={() => setIsCreateUserModalOpen(true)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium"
              >
                + Create User Account
              </button>
            </div>
          ) : (
            <div className="border-t border-b border-zinc-200 overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-3">HRMS ID & Member</th>
                    <th className="py-3 px-3">Department & Division</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Allowed Page Privileges</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUsers.map((user, idx) => {
                    const roleObj = roles.find(r => r.name?.toLowerCase() === (user.role || '').toLowerCase());
                    const roleColorClass = ROLE_COLORS[roleObj?.color || 'zinc'] || ROLE_COLORS.zinc;
                    const privs = user.page_privileges || [];
                    const isSuperadminUser = (user.role || '').toLowerCase() === 'superadmin' || String(user.emp_no).toLowerCase() === 'superadmin';

                    return (
                      <tr key={`${user.emp_no || user.id || 'usr'}-${idx}`} className="hover:bg-zinc-50/70 transition-colors">
                        {/* Member */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
                              {(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-zinc-900">{user.name}</div>
                              <span className="font-mono text-[11px] text-zinc-500">HRMS #{user.emp_no}</span>
                            </div>
                          </div>
                        </td>

                        {/* Department & Division */}
                        <td className="py-3 px-3 text-zinc-600">
                          <div className="font-medium text-zinc-900">{user.department || 'General Department'}</div>
                          {user.division && (
                            <div className="text-[11px] text-zinc-500 font-medium">{user.division}</div>
                          )}
                          
                        </td>

                        {/* Role */}
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${roleColorClass}`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Page Privileges */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {PAGE_PRIVILEGES_LIST.map(p => {
                              const isAllowed = privs.includes(p.id);
                              return (
                                <span
                                  key={p.id}
                                  title={`${p.name}: ${isAllowed ? 'Allowed' : 'Revoked'}`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    isAllowed
                                      ? 'bg-zinc-900 text-white font-semibold'
                                      : 'bg-zinc-100 text-zinc-400 line-through'
                                  }`}
                                >
                                  {p.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actions: Role, Privileges, and prominent Delete (Superadmin has no edit options) */}
                        <td className="py-3 px-3 text-right">
                          {isSuperadminUser ? (
                            <span 
                              className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 rounded-md border border-zinc-200 inline-flex items-center gap-1.5 cursor-default" 
                              title="Superadmin account cannot be edited or modified"
                            >
                              <Lock className="w-3 h-3 text-zinc-400" />
                              <span>Protected Superadmin</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setChangeRoleUser({ ...user, newRole: user.role })}
                                className="px-2 py-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[11px] font-medium rounded transition-colors"
                              >
                                Role
                              </button>

                              <button
                                onClick={() => setPrivilegeModalUser(user)}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium rounded transition-colors flex items-center gap-1"
                              >
                                <Key className="w-3 h-3" />
                                <span>Privileges</span>
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                                title={`Delete user ${user.name}`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ROLES & PRIVILEGES (WITH EDIT & DELETE ACTIONS) */}
      {/* ============================================================ */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="font-bold text-sm text-zinc-900">Dynamic Roles Matrix</h2>
              <p className="text-zinc-500 mt-0.5">
                Configure institutional roles, edit default page permissions, or delete unused roles (Superadmin is permanently protected).
              </p>
            </div>

            <button
              onClick={() => setIsCreateRoleModalOpen(true)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Role</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role, idx) => {
              const isSuperadmin = (role.name || '').toLowerCase().trim() === 'superadmin' || String(role.id).toLowerCase().trim() === 'superadmin';
              const rolePrivs = role.page_privileges || [];
              const colorClass = ROLE_COLORS[role.color || 'zinc'] || ROLE_COLORS.zinc;
              const userCount = mappedUsers.filter(u => u.role?.toLowerCase() === role.name?.toLowerCase()).length;

              return (
                <div
                  key={`${role.id || role.name}-${idx}`}
                  className="border border-zinc-200 rounded-lg p-4 space-y-3 flex flex-col justify-between hover:border-zinc-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${colorClass}`}>
                        {role.name}
                      </span>
                      {isSuperadmin ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-white flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Protected</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400">
                          Dynamic Role
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 line-clamp-2">
                      {role.description || 'Institutional role with configured page privileges.'}
                    </p>

                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider block mb-1.5">
                        Allowed Page Privileges ({rolePrivs.length}/6)
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {PAGE_PRIVILEGES_LIST.map(p => {
                          const hasPriv = rolePrivs.includes(p.id);
                          return (
                            <span
                              key={p.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                hasPriv
                                  ? 'bg-zinc-900 text-white font-semibold'
                                  : 'bg-zinc-100 text-zinc-400 line-through'
                              }`}
                            >
                              {p.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Role Card Footer with Edit and Delete Action Buttons */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {userCount} Active {userCount === 1 ? 'User' : 'Users'}
                    </span>

                    {isSuperadmin ? (
                      <span
                        className="px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 rounded border border-zinc-200 flex items-center gap-1.5 cursor-not-allowed"
                        title="Superadmin role is sovereign and cannot be edited or deleted"
                      >
                        <Lock className="w-3 h-3 text-zinc-400" />
                        <span>Fixed System Role</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Edit Role Button */}
                        <button
                          onClick={() => handleOpenEditRole(role)}
                          className="px-2 py-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-[11px] font-medium rounded flex items-center gap-1 transition-colors"
                          title={`Edit ${role.name}`}
                        >
                          <Edit3 className="w-3 h-3 text-zinc-500" />
                          <span>Edit</span>
                        </button>

                        {/* Delete Role Button */}
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title={`Delete ${role.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 1: CREATE USER (HRMS ID MAPPING MODAL) */}
      {/* ============================================================ */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-base text-zinc-900">Create User</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Map an HRMS Employee ID to create a library user account</p>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              {/* HRMS Employee ID Lookup (Shows all matching users with that number while typing) */}
              <div className="relative" ref={hrmsDropdownRef}>
                <label className="block font-medium text-zinc-700 mb-1">
                  HRMS Employee ID / Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={userForm.emp_no}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserForm(prev => ({ ...prev, emp_no: val, verifiedEmployee: null }));
                      setIsHrmsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (hrmsSearchResults.length > 0 && !userForm.verifiedEmployee) {
                        setIsHrmsDropdownOpen(true);
                      }
                    }}
                    placeholder="Type HRMS number (e.g. 111, 2145, 171, 0151)..."
                    className="w-full pl-3 pr-10 py-2 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {userForm.verifying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : userForm.verifiedEmployee ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Type any number to show all matching HRMS users, then select one to assign library privileges.
                </span>

                {/* Dropdown: Shows all matching users with that number */}
                {isHrmsDropdownOpen && !userForm.verifiedEmployee && userForm.emp_no && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-100 p-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching HRMS Employees ({hrmsSearchResults.length})</span>
                      <span className="text-zinc-400 font-normal">Select an employee</span>
                    </div>

                    {hrmsSearchResults.length > 0 ? (
                      hrmsSearchResults.map(emp => (
                        <div
                          key={emp.hrms_id || emp.emp_no}
                          onClick={() => {
                            setUserForm(prev => ({
                              ...prev,
                              emp_no: emp.emp_no,
                              verifiedEmployee: emp
                            }));
                            setIsHrmsDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-blue-50/70 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="overflow-hidden">
                            <div className="font-bold text-zinc-900 flex items-center gap-1.5 truncate">
                              <span>{emp.name || emp.employee_name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
                                #{emp.emp_no}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{emp.department || 'General'}</span>
                              {emp.division && <span>• {emp.division}</span>}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md shrink-0">
                            Select
                          </span>
                        </div>
                      ))
                    ) : !userForm.verifying ? (
                      <div className="p-3 text-center text-xs text-zinc-400">
                        No HRMS employees found matching "{userForm.emp_no}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Verified Employee Preview Card (Strictly without email) */}
              {userForm.verifiedEmployee && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{userForm.verifiedEmployee.name || userForm.verifiedEmployee.employee_name}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                        #{userForm.verifiedEmployee.emp_no}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm(prev => ({ ...prev, verifiedEmployee: null }));
                          setIsHrmsDropdownOpen(true);
                        }}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-medium ml-1 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-900 pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-700 text-[10px] block font-semibold uppercase">Division:</span>
                      <strong>{userForm.verifiedEmployee.division || 'Main Campus Division'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] block font-semibold uppercase">Department:</span>
                      <strong>{userForm.verifiedEmployee.department || 'General'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Role Selection: Clean Dropdown */}
              <div>
                <label className="block font-semibold text-zinc-700 text-xs mb-1.5">
                  Assign Library Role *
                </label>

                {/* Dropdown Selector */}
                <select
                  required
                  value={userForm.role_name}
                  onChange={(e) => handleRoleChangeInForm(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-zinc-900 font-medium"
                >
                  <option value="" disabled>-- Select a Library Role --</option>
                  {roles
                    .filter(r => !r.is_system && (r.name || '').toLowerCase() !== 'superadmin' && String(r.id).toLowerCase() !== 'superadmin')
                    .map(r => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name} ({r.page_privileges?.length || 0} privileges)
                      </option>
                    ))}
                </select>

                {/* Selected Role Description Card */}
                {(() => {
                  const currRole = roles.find(r => r.name === userForm.role_name);
                  if (!currRole) return null;
                  return (
                    <div className="mt-2 p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs">{currRole.name} Role Selected</div>
                        <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">{currRole.description || 'Pre-configured library role with designated page access.'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Page Privileges Checklist */}
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Page Privileges for this User
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-zinc-200 rounded-lg bg-zinc-50/40">
                  {PAGE_PRIVILEGES_LIST.map(p => {
                    const isChecked = userForm.page_privileges.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm(prev => ({
                                ...prev,
                                page_privileges: [...prev.page_privileges, p.id]
                              }));
                            } else {
                              setUserForm(prev => ({
                                ...prev,
                                page_privileges: prev.page_privileges.filter(x => x !== p.id)
                              }));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                        />
                        <span className={isChecked ? 'font-semibold text-zinc-900' : 'text-zinc-500'}>
                          {p.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!userForm.emp_no}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 2: CREATE DYNAMIC ROLE */}
      {/* ============================================================ */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Create Role</h3>
                <p className="text-xs text-zinc-500">Configure a dynamic role and select its default page privileges</p>
              </div>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. Department Coordinator or Research Scholar"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Brief summary of duties and permissions"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Badge Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {['zinc', 'purple', 'blue', 'emerald', 'cyan', 'amber', 'rose'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, color })}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border capitalize ${ROLE_COLORS[color]} ${
                        roleForm.color === color ? 'ring-2 ring-zinc-900 font-bold' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Default Page Privileges
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-zinc-200 rounded-lg">
                  {PAGE_PRIVILEGES_LIST.map(p => {
                    const isChecked = roleForm.page_privileges.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoleForm(prev => ({
                                ...prev,
                                page_privileges: [...prev.page_privileges, p.id]
                              }));
                            } else {
                              setRoleForm(prev => ({
                                ...prev,
                                page_privileges: prev.page_privileges.filter(x => x !== p.id)
                              }));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                        />
                        <span className={isChecked ? 'font-semibold text-zinc-900' : 'text-zinc-500'}>
                          {p.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 3: EDIT ROLE MODAL */}
      {/* ============================================================ */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-base text-zinc-900">
                  Edit Role: {editingRole.originalName}
                </h3>
                <p className="text-xs text-zinc-500">
                  Modify role details and page permissions
                </p>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Role Name * {editingRole.is_system && <span className="text-[10px] text-zinc-400 font-normal">(Superadmin name is fixed)</span>}
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole.is_system}
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Role description"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Badge Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {['zinc', 'purple', 'blue', 'emerald', 'cyan', 'amber', 'rose'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, color })}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border capitalize ${ROLE_COLORS[color]} ${
                        editingRole.color === color ? 'ring-2 ring-zinc-900 font-bold' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Allowed Page Privileges
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-zinc-200 rounded-lg bg-zinc-50/40">
                  {PAGE_PRIVILEGES_LIST.map(p => {
                    const isChecked = editingRole.page_privileges.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRole(prev => ({
                                ...prev,
                                page_privileges: [...prev.page_privileges, p.id]
                              }));
                            } else {
                              setEditingRole(prev => ({
                                ...prev,
                                page_privileges: prev.page_privileges.filter(x => x !== p.id)
                              }));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                        />
                        <span className={isChecked ? 'font-semibold text-zinc-900' : 'text-zinc-500'}>
                          {p.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 4: INDIVIDUAL PAGE PRIVILEGES MODAL */}
      {/* ============================================================ */}
      {privilegeModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Page Privileges: {privilegeModalUser.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  HRMS #{privilegeModalUser.emp_no} • Assigned Role: <strong className="text-zinc-800">{privilegeModalUser.role}</strong>
                </p>
              </div>
              <button onClick={() => setPrivilegeModalUser(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] text-zinc-400 block mb-2">
                Toggle individual access for each of the 6 pages independently of their role:
              </span>

              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                {PAGE_PRIVILEGES_LIST.map(p => {
                  const Icon = p.icon;
                  const isGranted = (privilegeModalUser.page_privileges || []).includes(p.id);

                  return (
                    <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-md ${isGranted ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">{p.name}</div>
                          <div className="text-[11px] text-zinc-400">{p.description}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleUserPrivilege(p.id, isGranted)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          isGranted
                            ? 'bg-zinc-900 text-white'
                            : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        {isGranted ? 'Granted' : 'Denied'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 text-right">
              <button
                onClick={() => setPrivilegeModalUser(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 5: CHANGE USER ROLE */}
      {/* ============================================================ */}
      {changeRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Change Role</h3>
                <p className="text-xs text-zinc-500">{changeRoleUser.name} (HRMS #{changeRoleUser.emp_no})</p>
              </div>
              <button onClick={() => setChangeRoleUser(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Select New Role</label>
                <select
                  required
                  value={changeRoleUser.newRole}
                  onChange={(e) => setChangeRoleUser({ ...changeRoleUser, newRole: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
                >
                  {roles
                    .filter(r => !r.is_system && (r.name || '').toLowerCase() !== 'superadmin' && String(r.id).toLowerCase() !== 'superadmin')
                    .map(r => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name} ({r.page_privileges?.length || 0} pages allowed)
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangeRoleUser(null)}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium"
                >
                  Update Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
