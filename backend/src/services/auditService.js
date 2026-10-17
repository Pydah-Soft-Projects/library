const db = require('../config/db');

function logAudit({ actor_id, action_key, target_resource, payload, ip_address = '127.0.0.1' }) {
  const entry = {
    id: db.audit_logs.length + 1,
    actor_id: actor_id || null,
    action_key,
    target_resource,
    payload: payload || {},
    ip_address,
    timestamp: new Date().toISOString()
  };
  db.audit_logs.unshift(entry);
  return entry;
}

function getAuditLogs(limit = 50) {
  return db.audit_logs.slice(0, limit);
}

module.exports = {
  logAudit,
  getAuditLogs
};
