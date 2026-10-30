const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    const host = process.env.DB_HOST || 'student-database.cfu0qmo26gh3.ap-south-1.rds.amazonaws.com';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'admin';
    const password = process.env.DB_PASSWORD || 'Student!0000';
    const database = process.env.DB_NAME || 'student_database';
    const useSsl = process.env.DB_SSL !== 'false';

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000
    });

    console.log(`🍃 SDMS MySQL Connection Pool initialized for ${database} at ${host}`);
  }
  return pool;
}

/**
 * Search students from SDMS database by name, PIN number, admission number, or roll number
 */
async function searchStudents(query = '', limit = 25) {
  const clean = String(query || '').trim();
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  try {
    const p = getPool();
    let sql = `
      SELECT 
        s.id,
        s.student_name,
        s.admission_number,
        s.pin_no,
        s.email,
        s.current_year,
        s.current_semester,
        r.roll_number,
        b.name AS branch_name,
        b.code AS branch_code,
        c.name AS course_name,
        c.code AS course_code
      FROM students s
      LEFT JOIN student_roll_numbers r ON s.id = r.student_id
      LEFT JOIN course_branches b ON s.branch_id = b.id
      LEFT JOIN courses c ON s.course_id = c.id
    `;
    const params = [];

    if (clean) {
      sql += `
        WHERE 
          s.student_name LIKE ? OR 
          s.pin_no LIKE ? OR 
          s.admission_number LIKE ? OR 
          r.roll_number LIKE ?
      `;
      const pattern = `%${clean}%`;
      params.push(pattern, pattern, pattern, pattern);
    } else {
      sql += ` WHERE (s.student_name IS NOT NULL AND s.student_name != '') `;
    }

    sql += ` ORDER BY s.id DESC LIMIT ?`;
    params.push(limitNum);

    const [rows] = await p.query(sql, params);

    return rows.map(s => {
      const pin = s.pin_no || s.roll_number || s.admission_number || `STU-${s.id}`;
      const branchDisplay = s.branch_name || s.branch_code || '';
      const courseDisplay = s.course_code || s.course_name || '';
      const dept = branchDisplay && courseDisplay
        ? `${branchDisplay} (${courseDisplay})`
        : (branchDisplay || courseDisplay || 'General');

      return {
        id: s.id,
        name: s.student_name || 'Student',
        student_name: s.student_name || 'Student',
        pin_no: s.pin_no || '',
        admission_number: s.admission_number || '',
        roll_number: s.roll_number || s.pin_no || s.admission_number,
        rollNo: pin,
        department: dept,
        year: s.current_year ? `${s.current_year}${getOrdinal(s.current_year)} Year` : '1st Year',
        semester: s.current_semester ? `Sem ${s.current_semester}` : '',
        email: s.email || `${pin.toLowerCase()}@pydah.edu.in`,
        status: 'Active',
        source: 'SDMS Database'
      };
    });
  } catch (err) {
    console.error('Error querying SDMS students:', err.message);
    throw err;
  }
}

/**
 * Get single student by PIN number, Roll Number, or Admission Number
 */
async function getStudentByPin(pinOrId) {
  const clean = String(pinOrId || '').trim();
  if (!clean) return null;

  try {
    const p = getPool();
    const sql = `
      SELECT 
        s.id,
        s.student_name,
        s.admission_number,
        s.pin_no,
        s.email,
        s.current_year,
        s.current_semester,
        r.roll_number,
        b.name AS branch_name,
        b.code AS branch_code,
        c.name AS course_name,
        c.code AS course_code
      FROM students s
      LEFT JOIN student_roll_numbers r ON s.id = r.student_id
      LEFT JOIN course_branches b ON s.branch_id = b.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 
        s.pin_no = ? OR 
        s.admission_number = ? OR 
        r.roll_number = ? OR 
        s.id = ?
      LIMIT 1
    `;
    const [rows] = await p.query(sql, [clean, clean, clean, clean]);
    if (!rows || rows.length === 0) return null;

    const s = rows[0];
    const pin = s.pin_no || s.roll_number || s.admission_number || `STU-${s.id}`;
    const branchDisplay = s.branch_name || s.branch_code || '';
    const courseDisplay = s.course_code || s.course_name || '';
    const dept = branchDisplay && courseDisplay
      ? `${branchDisplay} (${courseDisplay})`
      : (branchDisplay || courseDisplay || 'General');

    return {
      id: s.id,
      name: s.student_name || 'Student',
      student_name: s.student_name || 'Student',
      pin_no: s.pin_no || '',
      admission_number: s.admission_number || '',
      roll_number: s.roll_number || s.pin_no || s.admission_number,
      rollNo: pin,
      department: dept,
      year: s.current_year ? `${s.current_year}${getOrdinal(s.current_year)} Year` : '1st Year',
      semester: s.current_semester ? `Sem ${s.current_semester}` : '',
      email: s.email || `${pin.toLowerCase()}@pydah.edu.in`,
      status: 'Active',
      source: 'SDMS Database'
    };
  } catch (err) {
    console.error('Error fetching SDMS student by PIN:', err.message);
    throw err;
  }
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

module.exports = {
  getPool,
  searchStudents,
  getStudentByPin
};
