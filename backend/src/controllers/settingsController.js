const Setting = require('../models/Setting');
const { logAudit } = require('../services/auditService');

const DEFAULT_SETTINGS = {
  key: 'system_settings',
  default_loan_days: 30,
  daily_fine_rate: 5.0,
  max_books_quota: 4,
  max_renewals: 2,
  library_name: 'Central Campus Academic Library',
  desk_email: 'circulation@college.edu.in',
  operating_hours: '08:30 AM – 08:00 PM (Mon – Sat)',
  updated_by: 'Superadmin'
};

async function getSettings(req, res) {
  try {
    // Strictly prevent browser or intermediary caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    let settings = await Setting.findOne({ key: 'system_settings' }).lean();
    if (!settings) {
      settings = await Setting.create(DEFAULT_SETTINGS);
      settings = settings.toObject();
    }
    res.json({
      settings: {
        id: settings._id ? settings._id.toString() : 'system_settings',
        ...settings
      }
    });
  } catch (err) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Failed to retrieve system settings' });
  }
}

async function updateSettings(req, res) {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const updateData = {
      default_loan_days: req.body.default_loan_days !== undefined && !isNaN(Number(req.body.default_loan_days)) 
        ? Number(req.body.default_loan_days) 
        : 30,
      daily_fine_rate: req.body.daily_fine_rate !== undefined && !isNaN(Number(req.body.daily_fine_rate)) 
        ? Number(req.body.daily_fine_rate) 
        : 5.0,
      max_books_quota: req.body.max_books_quota !== undefined && !isNaN(Number(req.body.max_books_quota)) 
        ? Number(req.body.max_books_quota) 
        : 4,
      max_renewals: req.body.max_renewals !== undefined && !isNaN(Number(req.body.max_renewals)) 
        ? Number(req.body.max_renewals) 
        : 2,
      library_name: (req.body.library_name || '').trim() || DEFAULT_SETTINGS.library_name,
      desk_email: (req.body.desk_email || '').trim() || DEFAULT_SETTINGS.desk_email,
      operating_hours: (req.body.operating_hours || '').trim() || DEFAULT_SETTINGS.operating_hours,
      updated_by: req.user?.fullName || req.user?.username || 'Superadmin',
      updated_at: new Date()
    };

    const updated = await Setting.findOneAndUpdate(
      { key: 'system_settings' },
      { $set: updateData },
      { new: true, upsert: true }
    ).lean();

    logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'system.settings_update',
      target_resource: 'SETTINGS',
      payload: updateData
    });

    res.json({
      message: 'System settings successfully updated and saved in database.',
      settings: {
        id: updated._id ? updated._id.toString() : 'system_settings',
        ...updated
      }
    });
  } catch (err) {
    console.error('Error updating system settings:', err);
    res.status(500).json({ error: 'Failed to update system settings: ' + err.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  DEFAULT_SETTINGS
};
