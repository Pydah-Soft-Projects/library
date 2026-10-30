const mongoose = require('mongoose');

const hrmsUserRoleSchema = new mongoose.Schema(
  {
    emp_no: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    employee_name: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      default: ''
    },
    role_name: {
      type: String,
      required: true,
      trim: true
    },
    // Page privileges granted specifically to this individual user (or individual overrides)
    page_privileges: {
      type: [String],
      default: []
    },
    // Granular override map: e.g. { "settings": true, "book_creation": false }
    individual_overrides: {
      type: Map,
      of: Boolean,
      default: {}
    },
    assigned_by: {
      type: String,
      default: 'Superadmin'
    },
    assigned_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

hrmsUserRoleSchema.set('toJSON', { virtuals: true });
hrmsUserRoleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('HrmsUserRole', hrmsUserRoleSchema);
