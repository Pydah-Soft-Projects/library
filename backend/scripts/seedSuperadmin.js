const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const SUPERADMIN_PERMISSIONS = [
  'catalog.read', 'catalog.create', 'catalog.update', 'catalog.delete',
  'circulation.issue', 'circulation.return', 'circulation.renew', 'circulation.reserve',
  'fines.read', 'fines.collect', 'fines.waive',
  'patrons.read', 'patrons.manage',
  'system.roles.manage', 'system.overrides.manage', 'system.audit.read'
];

async function seedSuperadmin() {
  const mongoUri = process.env.MongoDB_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ Error: MongoDB URI not found in .env (MongoDB_URI / MONGODB_URI)');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin';
    const rawPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
    const fullName = process.env.SUPERADMIN_NAME || 'System Superadmin';

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

    // Look for existing superadmin by username, email, or role
    let superadmin = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
        { role: 'Superadmin' }
      ]
    });

    if (superadmin) {
      console.log(`ℹ️ Existing Superadmin account found (${superadmin.email}). Updating credentials...`);
      superadmin.username = username.toLowerCase();
      superadmin.email = email.toLowerCase();
      superadmin.full_name = fullName;
      superadmin.password = hashedPassword;
      superadmin.role = 'Superadmin';
      superadmin.role_id = 1;
      superadmin.patron_id = 'SUPERADMIN';
      superadmin.department = 'System Administration';
      superadmin.status = 'Active';
      superadmin.permissions = SUPERADMIN_PERMISSIONS;
      await superadmin.save();
      console.log('✅ Superadmin account updated successfully!');
    } else {
      console.log('Creating new Superadmin account in MongoDB...');
      superadmin = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        full_name: fullName,
        password: hashedPassword,
        role: 'Superadmin',
        role_id: 1,
        patron_id: 'SUPERADMIN',
        department: 'System Administration',
        status: 'Active',
        permissions: SUPERADMIN_PERMISSIONS
      });
      console.log('✅ Superadmin account created successfully!');
    }

    console.log('\n=======================================================');
    console.log('👑 SUPERADMIN SEED COMPLETE');
    console.log('=======================================================');
    console.log(` • User ID:       ${superadmin._id}`);
    console.log(` • Identifier:    ${username}`);
    console.log(` • Email:         ${email}`);
    console.log(` • Password:      ${rawPassword}`);
    console.log(` • Role:          Superadmin (ID: 1)`);
    console.log(` • Patron ID:     SUPERADMIN`);
    console.log(` • Status:        Active`);
    console.log(` • Permissions:   All ${SUPERADMIN_PERMISSIONS.length} capabilities granted`);
    console.log('=======================================================\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed Superadmin:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

seedSuperadmin();
