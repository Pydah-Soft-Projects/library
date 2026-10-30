const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const HrmsUserRole = require('../models/HrmsUserRole');
const { logAudit } = require('../services/auditService');

const SYSTEM_PERMISSIONS = [
  { id: 1, key: 'catalog.read', module: 'catalog', description: 'Search and read catalog holdings' },
  { id: 2, key: 'catalog.create', module: 'catalog', description: 'Accession new book titles and copies' },
  { id: 3, key: 'catalog.update', module: 'catalog', description: 'Edit book metadata, shelf location, or edition' },
  { id: 4, key: 'catalog.delete', module: 'catalog', description: 'Purge / weed out destroyed or archived volumes' },
  { id: 5, key: 'circulation.issue', module: 'circulation', description: 'Issue loans to registered patrons' },
  { id: 6, key: 'circulation.return', module: 'circulation', description: 'Process returns, check overdue, and release copies' },
  { id: 7, key: 'circulation.renew', module: 'circulation', description: 'Extend loan period subject to hold queue' },
  { id: 8, key: 'circulation.reserve', module: 'circulation', description: 'Place hold reservation on checked-out titles' },
  { id: 9, key: 'fines.read', module: 'fines', description: 'View fine ledgers and payment receipts' },
  { id: 10, key: 'fines.collect', module: 'fines', description: 'Collect fine payments via Cash or UPI QR' },
  { id: 11, key: 'fines.waive', module: 'fines', description: 'Grant official fine waivers with mandatory reason' },
  { id: 12, key: 'patrons.read', module: 'patrons', description: 'Inspect patron borrowing history and hold status' },
  { id: 13, key: 'patrons.manage', module: 'patrons', description: 'Add, update or freeze patron accounts' },
  { id: 14, key: 'system.roles.manage', module: 'system', description: 'Configure system roles and base permission sets' },
  { id: 15, key: 'system.overrides.manage', module: 'system', description: 'Grant dynamic per-user capability overrides' },
  { id: 16, key: 'system.audit.read', module: 'system', description: 'Read immutable forensic audit trails' }
];

async function getMatrix(req, res) {
  try {
    const roles = await Role.find().lean();
    const baseMappings = {};
    roles.forEach((r, idx) => {
      const perms = r.permissions || [];
      baseMappings[r._id.toString()] = perms;
      baseMappings[r.name] = perms;
      baseMappings[idx + 1] = perms;
    });

    // Fetch user overrides from HrmsUserRole and Users in MongoDB
    const hrmsRoles = await HrmsUserRole.find().lean();
    const userOverrides = {};
    hrmsRoles.forEach(hr => {
      if (hr.individual_overrides && typeof hr.individual_overrides === 'object') {
        userOverrides[hr.emp_no] = hr.individual_overrides;
      }
    });

    res.json({
      roles: roles.map((r, i) => ({
        id: r._id.toString(),
        name: r.name,
        description: r.description,
        color: r.color,
        is_system: r.is_system,
        permissions: r.permissions || []
      })),
      permissions: SYSTEM_PERMISSIONS,
      base_mappings: baseMappings,
      user_overrides: userOverrides
    });
  } catch (err) {
    console.error('Error fetching RBAC matrix from MongoDB:', err);
    res.status(500).json({ error: 'Failed to retrieve RBAC matrix' });
  }
}

async function setOverride(req, res) {
  try {
    const { user_id, permission_key, is_granted } = req.body || {};

    if (!user_id || !permission_key) {
      return res.status(400).json({ error: 'user_id and permission_key are required' });
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(user_id)) {
      user = await User.findById(user_id);
    }

    if (!user) {
      user = await User.findOne({
        $or: [
          { patron_id: String(user_id) },
          { username: String(user_id).toLowerCase() },
          { email: String(user_id).toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'Target user account not found in database' });
    }

    const uid = user._id.toString();

    // Update User.permissions in MongoDB
    let currentPerms = new Set(user.permissions || []);
    if (is_granted) {
      currentPerms.add(permission_key);
    } else {
      currentPerms.delete(permission_key);
    }
    user.permissions = Array.from(currentPerms);
    await user.save();

    // Update HrmsUserRole if mapped
    if (user.patron_id) {
      const hrmsRole = await HrmsUserRole.findOne({ emp_no: user.patron_id });
      if (hrmsRole) {
        if (!hrmsRole.individual_overrides) hrmsRole.individual_overrides = new Map();
        hrmsRole.individual_overrides.set(permission_key, Boolean(is_granted));
        await hrmsRole.save();
      }
    }

    await logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'system.overrides.manage',
      target_resource: `USER:${uid}`,
      payload: {
        permission: permission_key,
        granted: Boolean(is_granted),
        target_user: user.full_name
      }
    });

    res.json({
      message: `Dynamic override successfully ${is_granted ? 'granted' : 'revoked'} for ${user.full_name}.`,
      user_id: uid,
      permissions: user.permissions
    });
  } catch (err) {
    console.error('Error setting permission override:', err);
    res.status(500).json({ error: 'Failed to set permission override: ' + err.message });
  }
}

module.exports = {
  getMatrix,
  setOverride
};
