const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system_settings'
    },
    default_loan_days: {
      type: Number,
      default: 30
    },
    daily_fine_rate: {
      type: Number,
      default: 5.0
    },
    max_books_quota: {
      type: Number,
      default: 4
    },
    max_renewals: {
      type: Number,
      default: 2
    },
    library_name: {
      type: String,
      default: 'Central Campus Academic Library'
    },
    desk_email: {
      type: String,
      default: 'circulation@college.edu.in'
    },
    operating_hours: {
      type: String,
      default: '08:30 AM – 08:00 PM (Mon – Sat)'
    },
    updated_by: {
      type: String,
      default: 'Superadmin'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

settingSchema.set('toJSON', { virtuals: true });
settingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Setting', settingSchema);
