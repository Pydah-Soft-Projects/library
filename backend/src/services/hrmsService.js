const mongoose = require('mongoose');

const hrmsUri = process.env.HRMS_MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://teampydah:TeamPydah@teampydah.y4zj6wh.mongodb.net/hrms';

let hrmsConnection = null;
let deptCache = null;
let deptCacheTime = 0;

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

async function getDepartments() {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const depts = await conn.db.collection('departments').find({}).toArray();
    return depts.map(d => ({
      id: d._id.toString(),
      name: d.name || d.department_name || 'General'
    }));
  } catch (err) {
    console.error('Failed to get HRMS departments:', err.message);
    return [];
  }
}

async function getEmployees({ search = '', department = '', status = 'all', page = 1, limit = 50 } = {}) {
  try {
    const conn = getHrmsConnection();
    await conn.asPromise();
    const deptMap = await getDepartmentMap();

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
      return {
        hrms_id: e._id.toString(),
        emp_no: e.emp_no,
        name: e.employee_name,
        email: e.email || `${e.emp_no.toLowerCase()}@pydah.edu.in`,
        phone: e.phone_number || '',
        gender: e.gender || 'Not specified',
        department: deptName,
        is_active: e.is_active !== false,
        source: 'HRMS Database (Direct Live Fetch)'
      };
    });

    // If department filter applied
    let filteredEmployees = employees;
    if (department && department !== 'All') {
      filteredEmployees = employees.filter(e => e.department.toLowerCase() === department.toLowerCase());
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

    const employee = await conn.db.collection('employees').findOne({
      emp_no: String(empNo).trim()
    });

    if (!employee) return null;

    const deptName = (employee.department_id && deptMap[employee.department_id.toString()]) || 'General';
    return {
      hrms_id: employee._id.toString(),
      emp_no: employee.emp_no,
      name: employee.employee_name,
      email: employee.email || `${employee.emp_no.toLowerCase()}@pydah.edu.in`,
      phone: employee.phone_number || '',
      gender: employee.gender || 'Not specified',
      department: deptName,
      is_active: employee.is_active !== false,
      source: 'HRMS Database'
    };
  } catch (err) {
    console.error('Error finding HRMS employee by emp_no:', err.message);
    return null;
  }
}

module.exports = {
  getHrmsConnection,
  getEmployees,
  getDepartments,
  getEmployeeByEmpNo
};
