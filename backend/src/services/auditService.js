const AuditLog = require('../models/AuditLog');
const db = require('../config/db');

async function logAudit({ actor_id, action_key, target_resource, payload, ip_address = '127.0.0.1' }) {
  const timestamp = new Date();
  const entry = {
    actor_id: actor_id || null,
    action_key,
    target_resource,
    payload: payload || {},
    ip_address,
    timestamp
  };

  // Add to in-memory fallback
  db.audit_logs.unshift({
    id: db.audit_logs.length + 1,
    ...entry,
    timestamp: timestamp.toISOString()
  });

  // Persist to MongoDB Atlas database
  try {
    const doc = await AuditLog.create(entry);
    return doc.toObject();
  } catch (err) {
    console.error('Failed to persist audit log to MongoDB:', err.message);
    return entry;
  }
}

async function getAuditLogs(limit = 50) {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();
    if (logs && logs.length > 0) {
      return logs.map(l => ({
        id: l._id.toString(),
        actor_id: l.actor_id,
        action_key: l.action_key,
        target_resource: l.target_resource,
        payload: l.payload,
        ip_address: l.ip_address,
        timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
      }));
    }
  } catch (err) {
    console.error('Failed to retrieve audit logs from MongoDB:', err.message);
  }
  return db.audit_logs.slice(0, limit);
}

module.exports = {
  logAudit,
  getAuditLogs
};
