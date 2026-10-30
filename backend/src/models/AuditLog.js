const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: {
      type: String,
      default: null
    },
    action_key: {
      type: String,
      required: true
    },
    target_resource: {
      type: String,
      default: ''
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip_address: {
      type: String,
      default: '127.0.0.1'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

auditLogSchema.set('toJSON', { virtuals: true });
auditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
