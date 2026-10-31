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

// In-memory LRU/TTL caches to eliminate repeat AWS RDS roundtrips
const searchCache = new Map();
const studentCache = new Map();
const photoCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const PHOTO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL
const MAX_CACHE_ENTRIES = 250;

function pruneCache(cache) {
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

/**
 * High-performance search for SDMS students
 * Excludes multi-megabyte base64 photos from batch list for ~15x speedup
 */
async function searchStudents(query = '', limit = 20) {
  const clean = String(query || '').trim();
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const cacheKey = `${clean.toLowerCase()}:${limitNum}`;

  // 1. Return immediately from RAM cache if valid
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const p = getPool();
    // Exclude massive blob `student_photo` in search list for fast latency & low bandwidth
    let sql = `
      SELECT 
        s.id,
        s.student_name,
        s.pin_no,
        s.admission_number,
        s.current_year,
        s.current_semester,
        s.email,
        r.roll_number,
        b.name AS branch_name,
        b.code AS branch_code,
        c.name AS course_name,
        c.code AS course_code,
        (CASE WHEN s.student_photo IS NOT NULL AND s.student_photo != '' THEN 1 ELSE 0 END) AS has_photo
      FROM students s
      LEFT JOIN student_roll_numbers r ON s.id = r.student_id
      LEFT JOIN course_branches b ON s.branch_id = b.id
      LEFT JOIN courses c ON s.course_id = c.id
    `;
    const params = [];

    if (clean) {
      const patternStart = `${clean}%`;
      const patternAny = `%${clean}%`;
      const patternWord = `% ${clean}%`;

      sql += `
        WHERE 
          s.pin_no LIKE ? OR 
          s.admission_number LIKE ? OR 
          r.roll_number LIKE ? OR
          s.student_name LIKE ?
        ORDER BY 
          (CASE 
            WHEN s.pin_no = ? THEN 1
            WHEN s.pin_no LIKE ? THEN 2
            WHEN s.student_name LIKE ? THEN 3
            WHEN s.student_name LIKE ? THEN 4
            ELSE 5 
          END),
          s.id DESC
        LIMIT ?
      `;

      params.push(
        patternStart, patternStart, patternStart, patternAny,
        clean, patternStart, patternStart, patternWord,
        limitNum
      );
    } else {
      sql += ` WHERE (s.student_name IS NOT NULL AND s.student_name != '') ORDER BY s.id DESC LIMIT ?`;
      params.push(limitNum);
    }

    const [rows] = await p.query(sql, params);

    const formatted = rows.map(s => {
      const pin = s.pin_no || s.roll_number || s.admission_number || `STU-${s.id}`;
      const branchDisplay = s.branch_name || s.branch_code || '';
      const courseDisplay = s.course_code || s.course_name || '';
      const dept = branchDisplay && courseDisplay
        ? `${branchDisplay} (${courseDisplay})`
        : (branchDisplay || courseDisplay || 'General');

      // Use efficient dedicated browser-cached photo endpoint URL
      const photoEndpoint = s.has_photo ? `/api/sdms/students/${encodeURIComponent(pin)}/photo` : null;

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
        email: s.email ? String(s.email).trim() : '',
        photo: photoEndpoint,
        image: photoEndpoint,
        photo_url: photoEndpoint,
        has_photo: !!s.has_photo,
        status: 'Active',
        source: 'SDMS Database'
      };
    });

    // Save to in-memory cache
    pruneCache(searchCache);
    searchCache.set(cacheKey, { data: formatted, timestamp: Date.now() });

    return formatted;
  } catch (err) {
    console.error('Error querying SDMS students:', err.message);
    pool = null;
    return [];
  }
}

/**
 * Get single student by PIN number, Roll Number, or Admission Number
 * Returns full profile including high-res photo for selected patron
 */
async function getStudentByPin(pinOrId) {
  const clean = String(pinOrId || '').trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  const cached = studentCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const p = getPool();
    const sql = `
      SELECT 
        s.*,
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

    const photoUrl = s.student_photo || s.photo || s.image || s.student_image || s.profile_photo || s.photo_url || s.image_url || null;

    const studentObj = {
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
      email: s.email ? String(s.email).trim() : '',
      photo: photoUrl,
      image: photoUrl,
      photo_url: photoUrl,
      student_photo: photoUrl,
      has_photo: !!photoUrl,
      status: 'Active',
      source: 'SDMS Database'
    };

    // Cache student profile & photo
    pruneCache(studentCache);
    studentCache.set(cacheKey, { data: studentObj, timestamp: Date.now() });
    if (s.pin_no) studentCache.set(String(s.pin_no).toLowerCase(), { data: studentObj, timestamp: Date.now() });

    if (photoUrl) {
      photoCache.set(cacheKey, { data: photoUrl, timestamp: Date.now() });
      if (s.pin_no) photoCache.set(String(s.pin_no).toLowerCase(), { data: photoUrl, timestamp: Date.now() });
    }

    return studentObj;
  } catch (err) {
    console.error('Error fetching SDMS student by PIN:', err.message);
    throw err;
  }
}

/**
 * Get individual photo for a student by PIN/ID (for fast browser caching)
 */
async function getStudentPhoto(pinOrId) {
  const clean = String(pinOrId || '').trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  const cached = photoCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < PHOTO_CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const p = getPool();
    const sql = `
      SELECT s.student_photo, s.pin_no
      FROM students s
      LEFT JOIN student_roll_numbers r ON s.id = r.student_id
      WHERE s.pin_no = ? OR s.admission_number = ? OR r.roll_number = ? OR s.id = ?
      LIMIT 1
    `;
    const [rows] = await p.query(sql, [clean, clean, clean, clean]);
    const photo = rows[0]?.student_photo || null;

    if (photo) {
      pruneCache(photoCache);
      photoCache.set(cacheKey, { data: photo, timestamp: Date.now() });
      if (rows[0]?.pin_no) {
        photoCache.set(String(rows[0].pin_no).toLowerCase(), { data: photo, timestamp: Date.now() });
      }
    }

    return photo;
  } catch (err) {
    console.error('Error fetching student photo:', err.message);
    return null;
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
  getStudentByPin,
  getStudentPhoto
};
