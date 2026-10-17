const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Standard institutional demo passwords
const PASSWORDS = {
  'admin@collegelibrary.in': 'admin123',
  'librarian@collegelibrary.in': 'lib123',
  'desk.staff@collegelibrary.in': 'staff123',
  'priya.cs23@college.edu.in': 'student123',
  'rahul.me24@college.edu.in': 'student123'
};

function login(req, res) {
  const { identifier, email, password } = req.body || {};
  const loginInput = (identifier || email || '').trim().toLowerCase();

  if (!loginInput) {
    return res.status(400).json({ error: 'Institutional Email or Student Roll Number is required.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required to authenticate.' });
  }

  // 1. Match by Email or Patron Roll ID
  const user = db.users.find(u => 
    u.email.toLowerCase() === loginInput || 
    (u.patron_id && u.patron_id.toLowerCase() === loginInput)
  );

  if (!user) {
    return res.status(401).json({ 
      error: `No institutional account found matching "${loginInput}". Please verify credentials.` 
    });
  }

  // 2. Password Check (allow configured password or universal fallback for testing)
  const expectedPassword = PASSWORDS[user.email] || 'password123';
  const isMatch = password === expectedPassword || password === 'password123' || password === 'demo123' || password === user.patron_id;

  if (!isMatch) {
    return res.status(401).json({ 
      error: 'Invalid password. Hint: Use standard demo passwords (admin123, lib123, staff123, student123).' 
    });
  }

  // 3. Resolve Role & Effective Permissions (with dynamic overrides)
  const role = db.roles.find(r => r.id === user.role_id) || { name: 'Student' };
  const basePermissions = db.role_permissions[user.role_id] || [];
  const userOverrides = db.user_permission_overrides[user.id] || {};
  const effectivePermissions = new Set(basePermissions);

  Object.entries(userOverrides).forEach(([permKey, isGranted]) => {
    if (isGranted) effectivePermissions.add(permKey);
    else effectivePermissions.delete(permKey);
  });

  const permissionsList = Array.from(effectivePermissions);

  // 4. Construct Standard JWT Payload
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: role.name,
    roleId: user.role_id,
    patronId: user.patron_id || null,
    department: user.department || null,
    permissions: permissionsList
  };

  // 5. Sign Cryptographic JWT (24-hour expiration)
  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256',
    issuer: 'CampusLibraryAuthService',
    subject: String(user.id)
  });

  // Calculate decoded expiration for client convenience
  const decoded = jwt.decode(token);

  logAudit({
    actor_id: user.id,
    action_key: 'auth.jwt_login',
    target_resource: 'SECURITY',
    payload: { 
      email: user.email, 
      role: role.name, 
      patron_id: user.patron_id,
      expires_at: new Date(decoded.exp * 1000).toISOString()
    }
  });

  res.json({
    message: 'JWT Authentication successful',
    token,
    token_type: 'Bearer',
    expires_in: 86400, // 24 hours in seconds
    expires_at: new Date(decoded.exp * 1000).toISOString(),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: role.name,
      role_id: user.role_id,
      patron_id: user.patron_id || null,
      department: user.department || null,
      permissions: permissionsList
    }
  });
}

function verify(req, res) {
  // Uses authenticateToken middleware
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  res.json({
    valid: true,
    user
  });
}

function me(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired JWT token' });
    }

    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    const role = db.roles.find(r => r.id === user.role_id);
    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: role.name,
        role_id: user.role_id,
        patron_id: user.patron_id || null,
        department: user.department || null,
        permissions: decoded.permissions || []
      },
      jwt_claims: {
        issuer: decoded.iss,
        issued_at: new Date(decoded.iat * 1000).toISOString(),
        expires_at: new Date(decoded.exp * 1000).toISOString()
      }
    });
  });
}

function refresh(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Cannot refresh invalid token' });
    }

    const newTokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      roleId: decoded.roleId,
      patronId: decoded.patronId,
      department: decoded.department,
      permissions: decoded.permissions
    };

    const newToken = jwt.sign(newTokenPayload, JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256',
      issuer: 'CampusLibraryAuthService',
      subject: String(decoded.userId)
    });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      token_type: 'Bearer',
      expires_in: 86400
    });
  });
}

function register(req, res) {
  const { full_name, email, password, department, role, phone, patron_id } = req.body || {};

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required to register.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An institutional account with this email already exists. Please sign in.' });
  }

  // Resolve role: Default to Student (id: 4)
  const roleName = role ? role.trim() : 'Student';
  const roleObj = db.roles.find(r => r.name.toLowerCase() === roleName.toLowerCase()) || { id: 4, name: 'Student' };

  // Generate unique patron ID (Roll Number) if not provided
  const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const generatedPatronId = patron_id && patron_id.trim() 
    ? patron_id.trim().toUpperCase() 
    : `STU-${new Date().getFullYear()}-${String(1000 + newId).slice(-4)}`;

  const newUser = {
    id: newId,
    role_id: roleObj.id,
    full_name: full_name.trim(),
    email: cleanEmail,
    phone: phone ? phone.trim() : '+91 98450 ' + String(10000 + newId),
    patron_id: generatedPatronId,
    department: department ? department.trim() : 'Computer Science & Engineering',
    status: 'Active',
    created_at: new Date()
  };

  db.users.push(newUser);
  PASSWORDS[cleanEmail] = password;

  // Resolve permissions
  const basePermissions = db.role_permissions[roleObj.id] || ['catalog.read', 'circulation.reserve', 'fines.read'];

  // Sign real JWT token for immediate login
  const tokenPayload = {
    userId: newUser.id,
    email: newUser.email,
    fullName: newUser.full_name,
    role: roleObj.name,
    roleId: newUser.role_id,
    patronId: newUser.patron_id,
    department: newUser.department,
    permissions: basePermissions
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256',
    issuer: 'CampusLibraryAuthService',
    subject: String(newUser.id)
  });

  logAudit({
    actor_id: newUser.id,
    action_key: 'auth.new_member_registration',
    target_resource: 'PATRONS',
    payload: {
      email: newUser.email,
      full_name: newUser.full_name,
      patron_id: newUser.patron_id,
      role: roleObj.name,
      department: newUser.department
    }
  });

  res.status(201).json({
    message: 'Member registered successfully! Welcome to the Central Campus Library.',
    token,
    token_type: 'Bearer',
    user: {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      role: roleObj.name,
      role_id: newUser.role_id,
      patron_id: newUser.patron_id,
      department: newUser.department,
      status: newUser.status,
      permissions: basePermissions
    }
  });
}

function resetPassword(req, res) {
  const { identifier, newPassword } = req.body || {};
  const loginInput = (identifier || '').trim().toLowerCase();

  if (!loginInput) {
    return res.status(400).json({ error: 'Institutional Email or Roll Number is required.' });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const user = db.users.find(u => 
    u.email.toLowerCase() === loginInput || 
    (u.patron_id && u.patron_id.toLowerCase() === loginInput)
  );

  if (!user) {
    return res.status(404).json({ error: `No registered account found matching "${loginInput}".` });
  }

  PASSWORDS[user.email] = newPassword;

  logAudit({
    actor_id: user.id,
    action_key: 'auth.password_reset',
    target_resource: 'SECURITY',
    payload: { email: user.email, patron_id: user.patron_id }
  });

  res.json({
    message: `Password updated successfully for ${user.full_name}. You may now log in with your new credentials.`,
    email: user.email
  });
}

module.exports = {
  login,
  register,
  resetPassword,
  verify,
  me,
  refresh
};


