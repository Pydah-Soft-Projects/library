const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const hrmsUri = process.env.HRMS_MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://teampydah:TeamPydah@teampydah.y4zj6wh.mongodb.net/hrms';

let hrmsConnection = null;
let deptCache = null;
let deptCacheTime = 0;
let divCache = null;
let divCacheTime = 0;

function getHrmsConnection() {
  if (!hrmsConnection || hrmsConnection.readyState === 0) {
    hrmsConnection = mongoose.createConnection(hrmsUri);
    hrmsConnection.on('connected', () => {
      console.log('🍃 HRMS MongoDB connection established successfully');
    });
    hrmsConnection.on('error', (err) => {
      console.error('❌ HRMS MongoDB Connection Error:', err.message);
    });
  }
  return hrmsConnection;
}

async function getDepartmentMap() {
  const now = Date.now();
  if (deptCache && (now - deptCacheTime < 300000)) {
    return deptCache;
  }

  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const depts = await conn.db.collection('departments').find({}).toArray();
    deptCache = {};
    depts.forEach(d => {
      deptCache[d._id.toString()] = d.name || d.department_name || 'General';
    });
    deptCacheTime = now;
    return deptCache;
  } catch (err) {
    console.error('Failed to load HRMS departments:', err.message);
    return deptCache || {};
  }
}

async function getDivisionMap() {
  const now = Date.now();
  if (divCache && (now - divCacheTime < 300000)) {
    return divCache;
  }

  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const divs = await conn.db.collection('divisions').find({}).toArray();
    divCache = {};
    divs.forEach(d => {
      divCache[d._id.toString()] = d.name || d.division_name || '';
    });
    divCacheTime = now;
    return divCache;
  } catch (err) {
    console.error('Failed to load HRMS divisions:', err.message);
    return divCache || {};
  }
}

async function getDepartments() {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const depts = await conn.db.collection('departments').find({}).toArray();
    return depts.map(d => ({
      id: d._id.toString(),
      name: d.name || d.department_name || 'General',
      code: d.code || ''
    }));
  } catch (err) {
    console.error('Failed to get HRMS departments:', err.message);
    return [];
  }
}

async function getDivisions() {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const divs = await conn.db.collection('divisions').find({}).toArray();
    return divs.map(d => ({
      id: d._id.toString(),
      name: d.name || d.division_name || '',
      code: d.code || ''
    }));
  } catch (err) {
    console.error('Failed to get HRMS divisions:', err.message);
    return [];
  }
}

async function getEmployees({ search = '', department = '', division = '', status = 'all', page = 1, limit = 50 } = {}) {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const deptMap = await getDepartmentMap();
    const divMap = await getDivisionMap();

    const query = {};

    if (status === 'active') {
      query.is_active = true;
    } else if (status === 'inactive') {
      query.is_active = false;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { employee_name: { $regex: term, $options: 'i' } },
        { emp_no: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone_number: { $regex: term, $options: 'i' } }
      ];
    }

    const collection = conn.db.collection('employees');
    const total = await collection.countDocuments(query);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const rawEmployees = await collection
      .find(query)
      .sort({ emp_no: 1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const employees = rawEmployees.map(e => {
      const deptName = (e.department_id && deptMap[e.department_id.toString()]) || 'General';
      const divName = (e.division_id && divMap[e.division_id.toString()]) || '';
      return {
        hrms_id: e._id.toString(),
        emp_no: e.emp_no,
        name: e.employee_name,
        employee_name: e.employee_name,
        email: e.email ? String(e.email).trim() : '',
        phone: e.phone_number || '',
        gender: e.gender || 'Not specified',
        department: deptName,
        division: divName,
        is_active: e.is_active !== false,
        source: 'HRMS Database (Direct Live Fetch)'
      };
    });

    let filteredEmployees = employees;
    if (department && department !== 'All') {
      filteredEmployees = filteredEmployees.filter(e => e.department.toLowerCase() === department.toLowerCase());
    }
    if (division && division !== 'All') {
      filteredEmployees = filteredEmployees.filter(e => e.division.toLowerCase() === division.toLowerCase());
    }

    return {
      total,
      page: pageNum,
      limit: limitNum,
      employees: filteredEmployees
    };
  } catch (err) {
    console.error('Error fetching HRMS employees:', err.message);
    throw err;
  }
}

async function getEmployeeByEmpNo(empNo) {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const deptMap = await getDepartmentMap();
    const divMap = await getDivisionMap();

    const employee = await conn.db.collection('employees').findOne({
      emp_no: String(empNo).trim()
    });

    if (!employee) return null;

    const deptName = (employee.department_id && deptMap[employee.department_id.toString()]) || 'General';
    const divName = (employee.division_id && divMap[employee.division_id.toString()]) || '';

    return {
      hrms_id: employee._id.toString(),
      emp_no: employee.emp_no,
      name: employee.employee_name,
      employee_name: employee.employee_name,
      email: employee.email ? String(employee.email).trim() : '',
      phone: employee.phone_number || '',
      gender: employee.gender || 'Not specified',
      department: deptName,
      division: divName,
      is_active: employee.is_active !== false,
      source: 'HRMS Database'
    };
  } catch (err) {
    console.error('Error finding HRMS employee by emp_no:', err.message);
    return null;
  }
}


async function verifyHrmsCredentials(identifier, password) {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const cleanId = String(identifier || '').trim();
    const lowerId = cleanId.toLowerCase();
    const deptMap = await getDepartmentMap();
    const divMap = await getDivisionMap();

    // 1. Check in HRMS employees collection
    let emp = await conn.db.collection('employees').findOne({
      $or: [
        { emp_no: cleanId },
        { emp_no: lowerId },
        { email: lowerId },
        { email: cleanId }
      ]
    });

    // 2. Check in HRMS users collection if not found in employees
    let hrmsUser = null;
    if (!emp) {
      hrmsUser = await conn.db.collection('users').findOne({
        $or: [
          { employeeId: cleanId },
          { email: lowerId },
          { email: cleanId }
        ]
      });
      if (hrmsUser && hrmsUser.employeeId) {
        emp = await conn.db.collection('employees').findOne({
          emp_no: hrmsUser.employeeId
        });
      }
    }

    if (!emp && !hrmsUser) {
      return { success: false, error: `No employee account found in HRMS matching "${cleanId}". Please check your HRMS Employee ID or Institutional Email.` };
    }

    const target = emp || hrmsUser;
    if (target.is_active === false || target.isActive === false) {
      return { success: false, error: 'This HRMS employee account is inactive or disabled.' };
    }

    // 3. Verify password directly against HRMS password fields
    let isMatch = false;
    const bcryptHash = target.password || hrmsUser?.password;
    const plainPwd = target.plain_password || hrmsUser?.plain_password;

    if (bcryptHash && typeof bcryptHash === 'string' && bcryptHash.startsWith('$2')) {
      try {
        isMatch = await bcrypt.compare(password, bcryptHash);
      } catch (_) {}
    }
    if (!isMatch && plainPwd) {
      isMatch = (plainPwd === password);
    }

    // If password is not configured in HRMS, allow employee ID
    if (!isMatch && !bcryptHash && !plainPwd && password === String(target.emp_no || target.employeeId)) {
      isMatch = true;
    }

    if (!isMatch) {
      return { success: false, error: 'Invalid password. Please enter your valid HRMS password.' };
    }

    const empNo = emp?.emp_no || hrmsUser?.employeeId || cleanId;
    const empName = emp?.employee_name || hrmsUser?.name || `Employee #${empNo}`;
    const deptName = (emp?.department_id && deptMap[emp.department_id.toString()]) || 'General';
    const divName = (emp?.division_id && divMap[emp.division_id.toString()]) || '';
    const email = emp?.email || hrmsUser?.email || '';

    return {
      success: true,
      employee: {
        emp_no: empNo,
        name: empName,
        department: deptName,
        division: divName,
        email,
        source: 'HRMS Live Direct'
      }
    };
  } catch (err) {
    console.error('Error verifying HRMS credentials:', err.message);
    return { success: false, error: 'Failed to connect to HRMS database: ' + err.message };
  }
}


module.exports = {
  verifyHrmsCredentials,
  getHrmsConnection,
  getEmployees,
  getDepartments,
  getDivisions,
  getEmployeeByEmpNo
};
