const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'campus_library_jwt_secret_key_2026_super_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No JWT token provided. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired: JWT token has expired. Please log in again.' });
      }
      return res.status(403).json({ error: 'Forbidden: Invalid or tampered JWT signature.' });
    }

    req.user = decoded;
    next();
  });
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Superadmin bypasses permission checks
    if (req.user.role === 'Superadmin' || req.user.role_id === 1) {
      return next();
    }

    const permissions = req.user.permissions || [];
    if (!permissions.includes(permissionKey)) {
      return res.status(403).json({ 
        error: `Access Denied: Patron or staff role does not hold required privilege [${permissionKey}].` 
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requirePermission
};
