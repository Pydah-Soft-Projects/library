const db = require('../config/db');
const { logAudit } = require('../services/auditService');

function getMatrix(req, res) {
  res.json({
    roles: db.roles,
    permissions: db.permissions,
    base_mappings: db.role_permissions,
    user_overrides: db.user_permission_overrides
  });
}

function setOverride(req, res) {
  const { user_id, permission_key, is_granted } = req.body || {};

  if (!user_id || !permission_key) {
    return res.status(400).json({ error: 'user_id and permission_key are required' });
  }

  const user = db.users.find(u => u.id === parseInt(user_id, 10));
  if (!user) {
    return res.status(404).json({ error: 'Target user account not found' });
  }

  if (!db.user_permission_overrides[user.id]) {
    db.user_permission_overrides[user.id] = {};
  }

  db.user_permission_overrides[user.id][permission_key] = Boolean(is_granted);

  logAudit({
    actor_id: 1, // Superadmin
    action_key: 'system.overrides.manage',
    target_resource: `USER:${user.id}`,
    payload: {
      permission: permission_key,
      granted: Boolean(is_granted),
      target_user: user.full_name
    }
  });

  res.json({
    message: `Dynamic override successfully ${is_granted ? 'granted' : 'revoked'} for ${user.full_name}.`,
    user_id: user.id,
    overrides: db.user_permission_overrides[user.id]
  });
}

module.exports = {
  getMatrix,
  setOverride
};
