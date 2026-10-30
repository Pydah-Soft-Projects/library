const hrmsService = require('../services/hrmsService');
const HrmsUserRole = require('../models/HrmsUserRole');

async function getEmployees(req, res) {
  try {
    const { search = '', department = '', status = 'all', page = 1, limit = 50 } = req.query || {};

    const result = await hrmsService.getEmployees({
      search,
      department,
      status,
      page,
      limit
    });

    // Fetch assigned roles from HrmsUserRole collection
    const empNos = result.employees.map(e => e.emp_no);
    const assignedRoles = await HrmsUserRole.find({ emp_no: { $in: empNos } }).lean();
    const roleMap = {};
    const privMap = {};
    assignedRoles.forEach(r => {
      roleMap[r.emp_no] = r.role_name;
      privMap[r.emp_no] = r.page_privileges || [];
    });

    // Decorate employees with live assigned role & privileges without storing employee data in library DB
    const decoratedEmployees = result.employees.map(e => ({
      ...e,
      role: roleMap[e.emp_no] || 'Faculty / Scholar',
      page_privileges: privMap[e.emp_no] || ['dashboard', 'all_books']
    }));

    res.json({
      total: result.total,
      page: result.page,
      limit: result.limit,
      employees: decoratedEmployees
    });
  } catch (err) {
    console.error('HRMS getEmployees controller error:', err);
    res.status(500).json({ error: 'Failed to query HRMS database: ' + err.message });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await hrmsService.getDepartments();
    res.json({
      total: departments.length,
      departments
    });
  } catch (err) {
    console.error('HRMS getDepartments controller error:', err);
    res.status(500).json({ error: 'Failed to fetch HRMS departments' });
  }
}

async function getEmployeeByEmpNo(req, res) {
  try {
    const { empNo } = req.params;
    const employee = await hrmsService.getEmployeeByEmpNo(empNo);
    if (!employee) {
      return res.status(404).json({ error: `HRMS Employee #${empNo} not found` });
    }

    const assigned = await HrmsUserRole.findOne({ emp_no: String(empNo).trim() }).lean();

    res.json({
      employee: {
        ...employee,
        role: assigned?.role_name || 'Faculty / Scholar'
      }
    });
  } catch (err) {
    console.error('HRMS getEmployeeByEmpNo error:', err);
    res.status(500).json({ error: 'Failed to find employee in HRMS' });
  }
}

module.exports = {
  getEmployees,
  getDepartments,
  getEmployeeByEmpNo
};
