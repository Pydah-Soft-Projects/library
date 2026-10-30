const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const HrmsUserRole = require('../models/HrmsUserRole');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../services/auditService');

// Available 6 Page Privileges in the system
const PAGE_PRIVILEGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Overview metrics, live circulation statistics, and activity feed' },
  { id: 'book_creation', name: 'Create Book', description: 'Accession and add new book holdings with barcodes' },
  { id: 'all_books', name: 'All Books', description: 'Browse, search, edit, and inspect physical library catalog' },
  { id: 'book_issues_returns', name: 'Issues & Returns', description: 'Issue 30-day loans, return books, and manage fines' },
  { id: 'user_management', name: 'User Management', description: 'HRMS employee directory, role assignments & page permissions' },
  { id: 'settings', name: 'Settings', description: 'Library lending policies, fine tariffs, and system settings' }
];

// Initial baseline roles seeded into database if not present
const INITIAL_BASELINE_ROLES = [
  {
    name: 'Superadmin',
    description: 'Sovereign governance, dynamic capability delegation & security audits',
    color: 'zinc',
    is_system: true,
    permissions: ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings']
  },
  {
    name: 'Chief Librarian',
    description: 'Acquisitions, catalog management, membership tiers, and reporting',
    color: 'purple',
    is_system: false,
    permissions: ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'settings']
  },
  {
    name: 'Front-Desk Sub-staff',
    description: 'Circulation desk operations, checkout/returns, and fine receipt collection',
    color: 'blue',
    is_system: false,
    permissions: ['dashboard', 'all_books', 'book_issues_returns']
  },
  {
    name: 'Faculty / Scholar',
    description: 'Faculty patron membership: extended borrowing quota',
    color: 'emerald',
    is_system: false,
    permissions: ['dashboard', 'all_books']
  },
  {
    name: 'Student / Patron',
    description: 'Patron end-user self-service search and personal loan tracker',
    color: 'cyan',
    is_system: false,
    permissions: ['dashboard', 'all_books']
  }
];

let rolesSeeded = false;
async function ensureSeedRoles() {
  if (rolesSeeded) return;
  try {
    for (const r of INITIAL_BASELINE_ROLES) {
      const exists = await Role.findOne({ name: { $regex: new RegExp(`^${r.name}$`, 'i') } });
      if (!exists) {
        await Role.create({
          name: r.name,
          description: r.description,
          color: r.color,
          permissions: r.permissions,
          is_system: r.is_system
        });
      } else if (r.name.toLowerCase() === 'superadmin' && !exists.is_system) {
        exists.is_system = true;
        await exists.save();
      } else if (r.name.toLowerCase() !== 'superadmin' && exists.is_system) {
        exists.is_system = false;
        await exists.save();
      }
    }
    rolesSeeded = true;
  } catch (err) {
    console.error('Error ensuring baseline roles in DB:', err.message);
  }
}

async function getRoles(req, res) {
  try {
    await ensureSeedRoles();

    const allRoles = await Role.find().sort({ is_system: -1, created_at: 1 }).lean();
    
    // Get assignment counts for each role from HrmsUserRole
    const assignments = await HrmsUserRole.find().lean();
    const assignmentCounts = {};
    assignments.forEach(a => {
      assignmentCounts[a.role_name] = (assignmentCounts[a.role_name] || 0) + 1;
    });

    const rolesList = allRoles.map(r => {
      const isSuperadmin = (r.name || '').toLowerCase().trim() === 'superadmin';
      return {
        id: r._id.toString(),
        name: r.name,
        description: r.description || '',
        color: r.color || 'zinc',
        page_privileges: r.permissions && r.permissions.length > 0 ? r.permissions : (r.page_privileges || ['dashboard', 'all_books']),
        is_system: isSuperadmin,
        is_superadmin: isSuperadmin,
        created_at: r.created_at,
        assigned_count: assignmentCounts[r.name] || 0
      };
    });

    res.json({
      total: rolesList.length,
      roles: rolesList,
      available_page_privileges: PAGE_PRIVILEGES
    });
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'Failed to retrieve roles list' });
  }
}

async function createRole(req, res) {
  try {
    const { name, description, color, page_privileges } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is mandatory' });
    }

    const cleanName = name.trim();

    const existing = await Role.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ error: `Role with name "${cleanName}" already exists` });
    }

    const privileges = Array.isArray(page_privileges) && page_privileges.length > 0 
      ? page_privileges 
      : ['dashboard', 'all_books'];

    const newRole = await Role.create({
      name: cleanName,
      description: description ? description.trim() : `Dynamic institutional role: ${cleanName}`,
      color: color || 'zinc',
      permissions: privileges,
      is_system: false
    });

    logAudit({
      actor_id: req.user?.userId || 'SUPERADMIN',
      action_key: 'system.role.create',
      target_resource: `ROLE:${newRole._id.toString()}`,
      payload: { role_name: cleanName, page_privileges: privileges }
    });

    res.status(201).json({
      message: `Role "${cleanName}" created successfully!`,
      role: {
        id: newRole._id.toString(),
        name: newRole.name,
        description: newRole.description,
        color: newRole.color,
        page_privileges: privileges,
        is_system: false
      }
    });
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ error: 'Failed to create role: ' + err.message });
  }
}

async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description, color, page_privileges } = req.body || {};

    let role = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      role = await Role.findById(id);
    } else {
      role = await Role.findOne({ name: id });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const oldName = role.name;
    const isSuperadmin = role.name.toLowerCase() === 'superadmin' || role.is_system;

    if (name && !isSuperadmin) {
      const cleanName = name.trim();
      // Check duplicate name
      const conflict = await Role.findOne({ 
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') }, 
        _id: { $ne: role._id } 
      });
      if (conflict) {
        return res.status(409).json({ error: `A role with name "${cleanName}" already exists` });
      }
      role.name = cleanName;
    }

    if (description !== undefined) role.description = description.trim();
    if (color !== undefined) role.color = color;

    if (Array.isArray(page_privileges)) {
      role.permissions = isSuperadmin 
        ? PAGE_PRIVILEGES.map(p => p.id) 
        : page_privileges;
    }

    await role.save();

    // If role name changed, update any active user assignments
    if (name && name.trim() !== oldName) {
      await HrmsUserRole.updateMany({ role_name: oldName }, { role_name: name.trim() });
    }

    res.json({
      message: `Role "${role.name}" updated successfully!`,
      role: {
        id: role._id.toString(),
        name: role.name,
        description: role.description,
        color: role.color,
        page_privileges: role.permissions,
        is_system: isSuperadmin
      }
    });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Failed to update role: ' + err.message });
  }
}

async function deleteRole(req, res) {
  try {
    const { id } = req.params;

    let role = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      role = await Role.findById(id);
    } else {
      role = await Role.findOne({ name: id });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // STRICT CHECK: ONLY SUPERADMIN CANNOT BE DELETED
    if (
      role.name.toLowerCase().trim() === 'superadmin' || 
      String(id).toLowerCase().trim() === 'superadmin'
    ) {
      return res.status(403).json({ error: 'Superadmin role is protected and cannot be deleted.' });
    }

    const roleName = role.name;
    await Role.findByIdAndDelete(role._id);

    // Remove or reset role assignments for this role
    await HrmsUserRole.deleteMany({ role_name: roleName });

    logAudit({
      actor_id: req.user?.userId || 'SUPERADMIN',
      action_key: 'system.role.delete',
      target_resource: `ROLE:${role._id.toString()}`,
      payload: { role_name: roleName }
    });

    res.json({
      message: `Role "${roleName}" has been successfully deleted.`
    });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ error: 'Failed to delete role: ' + err.message });
  }
}

// Assign Role and Page Privileges to an HRMS User (without storing user records locally)
async function assignRoleToHrmsUser(req, res) {
  try {
    const { emp_no, role_name, employee_name, department, page_privileges } = req.body || {};

    if (!emp_no || !role_name) {
      return res.status(400).json({ error: 'emp_no and role_name are required' });
    }

    const cleanEmpNo = String(emp_no).trim();
    const cleanRoleName = String(role_name).trim();

    // Verify role exists in Role collection
    const roleDoc = await Role.findOne({ name: { $regex: new RegExp(`^${cleanRoleName}$`, 'i') } });

    // Role default page privileges
    const roleDefaultPages = roleDoc ? roleDoc.permissions : ['dashboard', 'all_books'];
    const assignedPages = Array.isArray(page_privileges) && page_privileges.length > 0 
      ? page_privileges 
      : roleDefaultPages;

    let assignment = await HrmsUserRole.findOne({ emp_no: cleanEmpNo });
    if (assignment) {
      assignment.role_name = roleDoc ? roleDoc.name : cleanRoleName;
      assignment.employee_name = employee_name || assignment.employee_name || '';
      assignment.department = department || assignment.department || '';
      assignment.page_privileges = assignedPages;
      assignment.assigned_by = req.user?.fullName || 'Superadmin';
      assignment.assigned_at = new Date();
      await assignment.save();
    } else {
      assignment = await HrmsUserRole.create({
        emp_no: cleanEmpNo,
        employee_name: employee_name || '',
        department: department || '',
        role_name: roleDoc ? roleDoc.name : cleanRoleName,
        page_privileges: assignedPages,
        assigned_by: req.user?.fullName || 'Superadmin'
      });
    }

    // Also sync/upsert into User directory so login & circulation recognize this account
    try {
      const isSuper = cleanRoleName.toLowerCase() === 'superadmin';
      const defaultHash = await bcrypt.hash('superadmin123', 10);
      await User.findOneAndUpdate(
        { $or: [{ username: cleanEmpNo }, { patron_id: cleanEmpNo }] },
        {
          username: cleanEmpNo,
          full_name: employee_name || `Employee #${cleanEmpNo}`,
          email: `${cleanEmpNo.toLowerCase()}@pydah.edu.in`,
          role: roleDoc ? roleDoc.name : cleanRoleName,
          role_id: isSuper ? 1 : 2,
          patron_id: cleanEmpNo,
          department: department || 'General',
          status: 'Active',
          permissions: assignedPages,
          password: defaultHash
        },
        { upsert: true, new: true }
      );
    } catch (upsertErr) {
      console.warn('Could not sync user to Mongo users collection:', upsertErr.message);
    }

    logAudit({
      actor_id: req.user?.userId || 'SUPERADMIN',
      action_key: 'system.hrms_role.assign',
      target_resource: `HRMS_EMP:${cleanEmpNo}`,
      payload: { emp_no: cleanEmpNo, role: cleanRoleName, page_privileges: assignedPages }
    });

    res.json({
      message: `Role "${assignment.role_name}" successfully assigned to Employee #${cleanEmpNo}`,
      assignment
    });
  } catch (err) {
    console.error('Error assigning role to HRMS user:', err);
    res.status(500).json({ error: 'Failed to assign role to HRMS user: ' + err.message });
  }
}

// Toggle individual page privilege override for a specific user
async function setUserPagePrivilegeOverride(req, res) {
  try {
    const { emp_no, page_id, is_granted } = req.body || {};

    if (!emp_no || !page_id) {
      return res.status(400).json({ error: 'emp_no and page_id are required' });
    }

    const cleanEmpNo = String(emp_no).trim();

    let assignment = await HrmsUserRole.findOne({ emp_no: cleanEmpNo });
    if (!assignment) {
      // Default to Faculty/Scholar if not previously assigned
      assignment = await HrmsUserRole.create({
        emp_no: cleanEmpNo,
        role_name: 'Faculty / Scholar',
        page_privileges: ['dashboard', 'all_books'],
        assigned_by: req.user?.fullName || 'Superadmin'
      });
    }

    let currentPrivileges = new Set(assignment.page_privileges || []);
    if (is_granted) {
      currentPrivileges.add(page_id);
    } else {
      currentPrivileges.delete(page_id);
    }

    assignment.page_privileges = Array.from(currentPrivileges);
    await assignment.save();

    logAudit({
      actor_id: req.user?.userId || 'SUPERADMIN',
      action_key: 'system.user_privilege.override',
      target_resource: `HRMS_EMP:${cleanEmpNo}`,
      payload: { emp_no: cleanEmpNo, page_id, is_granted }
    });

    res.json({
      message: `Page privilege "${page_id}" ${is_granted ? 'granted' : 'revoked'} for Employee #${cleanEmpNo}`,
      page_privileges: assignment.page_privileges
    });
  } catch (err) {
    console.error('Error setting individual user privilege override:', err);
    res.status(500).json({ error: 'Failed to update user page privilege: ' + err.message });
  }
}

async function getHrmsUserRoles(req, res) {
  try {
    const assignments = await HrmsUserRole.find().sort({ assigned_at: -1 }).lean();
    const map = {};
    const users = assignments.map(a => {
      map[a.emp_no] = {
        role_name: a.role_name,
        page_privileges: a.page_privileges || [],
        assigned_by: a.assigned_by,
        assigned_at: a.assigned_at
      };
      return {
        id: a._id.toString(),
        emp_no: a.emp_no,
        name: a.employee_name || `Employee #${a.emp_no}`,
        department: a.department || 'General',
        email: `${String(a.emp_no).toLowerCase()}@pydah.edu.in`,
        role: a.role_name,
        page_privileges: a.page_privileges || [],
        assigned_by: a.assigned_by,
        assigned_at: a.assigned_at
      };
    });

    res.json({
      total: assignments.length,
      assignments: map,
      users
    });
  } catch (err) {
    console.error('Error fetching HRMS user role assignments:', err);
    res.status(500).json({ error: 'Failed to retrieve HRMS role assignments' });
  }
}

async function deleteHrmsUserAssignment(req, res) {
  try {
    const { empNo } = req.params;
    const cleanEmpNo = String(empNo).trim();

    if (cleanEmpNo.toLowerCase() === 'superadmin') {
      return res.status(403).json({ error: 'Superadmin account is protected and cannot be deleted.' });
    }

    let deleted = await HrmsUserRole.findOneAndDelete({ emp_no: cleanEmpNo });
    if (!deleted && mongoose.Types.ObjectId.isValid(cleanEmpNo)) {
      deleted = await HrmsUserRole.findByIdAndDelete(cleanEmpNo);
    }

    logAudit({
      actor_id: req.user?.userId || 'SUPERADMIN',
      action_key: 'system.hrms_role.delete',
      target_resource: `HRMS_EMP:${cleanEmpNo}`,
      payload: { emp_no: cleanEmpNo }
    });

    res.json({ message: `Revoked library account mapping for Employee #${cleanEmpNo}` });
  } catch (err) {
    console.error('Error removing HRMS role mapping:', err);
    res.status(500).json({ error: 'Failed to revoke user mapping: ' + err.message });
  }
}

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToHrmsUser,
  setUserPagePrivilegeOverride,
  getHrmsUserRoles,
  deleteHrmsUserAssignment,
  DEFAULT_SYSTEM_ROLES: INITIAL_BASELINE_ROLES,
  PAGE_PRIVILEGES
};
