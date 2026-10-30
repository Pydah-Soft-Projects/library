const db = require('../config/db');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

function getMatrix(req, res) {
  res.json({
    roles: db.roles,
    permissions: db.permissions,
    base_mappings: db.role_permissions,
    user_overrides: db.user_permission_overrides
  });
}

async function setOverride(req, res) {
  const { user_id, permission_key, is_granted } = req.body || {};

  if (!user_id || !permission_key) {
    return res.status(400).json({ error: 'user_id and permission_key are required' });
  }

  let user = null;
  try {
    user = await User.findById(user_id);
  } catch (_) {}

  if (!user) {
    user = await User.findOne({
      $or: [
        { patron_id: String(user_id) },
        { email: String(user_id).toLowerCase() }
      ]
    });
  }

  if (!user) {
    return res.status(404).json({ error: 'Target user account not found' });
  }

  const uid = user._id.toString();
  if (!db.user_permission_overrides[uid]) {
    db.user_permission_overrides[uid] = {};
  }

  db.user_permission_overrides[uid][permission_key] = Boolean(is_granted);

  logAudit({
    actor_id: req.user?.userId || '1',
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
    overrides: db.user_permission_overrides[uid]
  });
}

module.exports = {
  getMatrix,
  setOverride
};
