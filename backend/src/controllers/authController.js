const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const User = require('../models/User');
const HrmsUserRole = require('../models/HrmsUserRole');
const Role = require('../models/Role');
const hrmsService = require('../services/hrmsService');
const { PAGE_PRIVILEGES } = require('./roleController');
const { logAudit } = require('../services/auditService');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const ALL_PAGE_PRIVILEGES = [
  'dashboard',
  'book_creation',
  'all_books',
  'book_issues_returns',
  'user_management',
  'settings'
];

async function login(req, res) {
  try {
    const { identifier, email, password } = req.body || {};
    const rawInput = (identifier || email || '').trim();
    const loginInput = rawInput.toLowerCase();

    if (!loginInput) {
      return res.status(400).json({ error: 'HRMS Employee ID, Username, or Institutional Email is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required to authenticate.' });
    }

    // 1. First, verify whether the user is present in our database (User collection or HrmsUserRole)
    const dbUser = await User.findOne({
      $or: [
        { username: loginInput },
        { username: rawInput },
        { email: loginInput },
        { patron_id: rawInput },
        { patron_id: loginInput.toUpperCase() }
      ]
    });

    const hrmsAssignment = await HrmsUserRole.findOne({
      $or: [
        { emp_no: rawInput },
        { emp_no: loginInput },
        { emp_no: loginInput.toUpperCase() },
        { email: loginInput }
      ]
    }).lean();

    // If user is NOT present in our database, reject immediately without checking HRMS
    if (!dbUser && !hrmsAssignment) {
      return res.status(401).json({
        error: 'User account is not registered in the library database. Please contact library administration to grant portal access.'
      });
    }

    let authenticatedUser = null;
    let authSource = null;

    // 2. If the user has a local database password (e.g. system administrator / superadmin), verify bcrypt password
    if (dbUser && dbUser.password) {
      const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatch) {
        const isSuperadmin = (dbUser.role || '').toLowerCase().trim() === 'superadmin';
        authenticatedUser = {
          id: dbUser._id.toString(),
          emp_no: dbUser.patron_id || dbUser.username,
          username: dbUser.username,
          full_name: dbUser.full_name,
          email: dbUser.email,
          role: dbUser.role || (isSuperadmin ? 'Superadmin' : 'Librarian'),
          department: dbUser.department || 'Governance & Administration',
          division: 'Administration',
          status: dbUser.status || 'Active',
          permissions: isSuperadmin ? ALL_PAGE_PRIVILEGES : (dbUser.permissions || ['dashboard', 'all_books']),
          source: 'Database User'
        };
        authSource = 'Database';
      }
    }

    // 3. If present in our database (assigned via HrmsUserRole or HRMS-backed user), verify password in HRMS
    if (!authenticatedUser && (hrmsAssignment || dbUser)) {
      const empNoToCheck = hrmsAssignment?.emp_no || dbUser?.patron_id || dbUser?.username || rawInput;
      const hrmsAuth = await hrmsService.verifyHrmsCredentials(empNoToCheck, password).catch(() => ({ success: false }));

      if (hrmsAuth && hrmsAuth.success) {
        const emp = hrmsAuth.employee;

        // Resolve Library Page Privileges & Assigned Role from database assignment
        let roleName = hrmsAssignment?.role_name || dbUser?.role;
        let permissions = hrmsAssignment?.page_privileges || dbUser?.permissions;

        if (!roleName) {
          const defaultRole = await Role.findOne({ is_system: false }).sort({ created_at: 1 }).lean();
          roleName = defaultRole?.name || 'Librarian';
          permissions = defaultRole?.permissions || ['dashboard', 'all_books'];
        }

        if (!permissions || permissions.length === 0) {
          const roleDoc = await Role.findOne({ name: { $regex: new RegExp(`^${roleName}$`, 'i') } }).lean();
          permissions = roleDoc?.permissions || ['dashboard', 'all_books'];
        }

        authenticatedUser = {
          id: emp.emp_no,
          emp_no: emp.emp_no,
          username: emp.emp_no,
          full_name: emp.name || hrmsAssignment?.employee_name || dbUser?.full_name,
          email: emp.email || hrmsAssignment?.email || dbUser?.email,
          role: roleName,
          department: emp.department || hrmsAssignment?.department || dbUser?.department,
          division: emp.division || hrmsAssignment?.division,
          status: 'Active',
          permissions,
          source: 'HRMS Live Direct Authentication'
        };
        authSource = 'HRMS';
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
    }

    // 3. Construct Standard JWT Payload
    const isSuperadmin = authenticatedUser.role === 'Superadmin';
    const tokenPayload = {
      userId: authenticatedUser.id,
      emp_no: authenticatedUser.emp_no,
      email: authenticatedUser.email,
      fullName: authenticatedUser.full_name,
      role: authenticatedUser.role,
      roleId: isSuperadmin ? 1 : 2,
      patronId: authenticatedUser.emp_no,
      department: authenticatedUser.department,
      division: authenticatedUser.division,
      permissions: authenticatedUser.permissions
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    logAudit({
      actor_id: authenticatedUser.emp_no,
      action_key: `auth.login.${authSource.toLowerCase()}`,
      target_resource: `AUTH:${authenticatedUser.emp_no}`,
      payload: { name: authenticatedUser.full_name, department: authenticatedUser.department, role: authenticatedUser.role }
    });

    res.json({
      message: `Authenticated successfully as ${authenticatedUser.full_name}`,
      token,
      token_type: 'Bearer',
      user: authenticatedUser
    });
  } catch (err) {
    console.error('Error in authentication login:', err);
    res.status(500).json({ error: 'Server authentication error occurred. Please try again.' });
  }
}

function verify(req, res) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  res.json({
    valid: true,
    user
  });
}

async function me(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired JWT token' });
    }

    try {
      const empNo = decoded.emp_no || decoded.userId;

      // 1. Check if user is in database (like root superadmin)
      const dbUser = await User.findOne({
        $or: [
          { username: String(empNo).toLowerCase() },
          { patron_id: String(empNo) },
          { _id: (empNo && empNo.length === 24) ? empNo : null }
        ]
      }).lean();

      if (dbUser) {
        const isSuperadmin = (dbUser.role || '').toLowerCase().trim() === 'superadmin';
        return res.json({
          user: {
            id: dbUser._id.toString(),
            emp_no: dbUser.patron_id || dbUser.username,
            username: dbUser.username,
            full_name: dbUser.full_name,
            email: dbUser.email,
            role: dbUser.role,
            role_id: isSuperadmin ? 1 : 2,
            department: dbUser.department || 'Governance & Administration',
            division: 'Administration',
            status: dbUser.status || 'Active',
            permissions: isSuperadmin ? ALL_PAGE_PRIVILEGES : (dbUser.permissions || ['dashboard', 'all_books']),
            source: 'Database User'
          }
        });
      }

      // 2. Fetch live employee details directly from HRMS
      const hrmsEmp = await hrmsService.getEmployeeByEmpNo(empNo).catch(() => null);
      const assignment = await HrmsUserRole.findOne({ emp_no: String(empNo) }).lean();

      const roleName = assignment?.role_name || decoded.role || 'Librarian';
      const permissions = assignment?.page_privileges || decoded.permissions || ['dashboard', 'all_books'];

      res.json({
        user: {
          id: empNo,
          emp_no: empNo,
          username: empNo,
          full_name: hrmsEmp?.name || decoded.fullName || `Employee #${empNo}`,
          email: hrmsEmp?.email || decoded.email || '',
          department: hrmsEmp?.department || decoded.department || 'General',
          division: hrmsEmp?.division || decoded.division || '',
          role: roleName,
          status: 'Active',
          permissions,
          source: 'HRMS Live'
        }
      });
    } catch (dbErr) {
      console.error('Error fetching user profile:', dbErr);
      res.status(500).json({ error: 'Error fetching profile data.' });
    }
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
      emp_no: decoded.emp_no || decoded.userId,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      roleId: decoded.roleId,
      patronId: decoded.patronId,
      department: decoded.department,
      division: decoded.division,
      permissions: decoded.permissions
    };

    const newToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      token_type: 'Bearer'
    });
  });
}

async function register(req, res) {
  res.status(400).json({
    error: 'Direct user registration is disabled. Users are automatically verified and managed live from institutional HRMS.'
  });
}

async function resetPassword(req, res) {
  res.status(400).json({
    error: 'Password reset must be performed directly in your institutional HRMS employee portal.'
  });
}

module.exports = {
  login,
  verify,
  me,
  refresh,
  register,
  resetPassword
};
