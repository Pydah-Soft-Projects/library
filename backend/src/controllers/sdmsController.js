const sdmsService = require('../services/sdmsService');

async function getStudents(req, res) {
  try {
    const { search = '', limit = 30 } = req.query;
    const students = await sdmsService.searchStudents(search, limit);
    res.json({
      total: students.length,
      students
    });
  } catch (err) {
    console.error('SDMS getStudents controller error:', err.message);
    res.json({ total: 0, students: [], error: err.message });
  }
}

async function getStudentByPin(req, res) {
  try {
    const { pin } = req.params;
    const student = await sdmsService.getStudentByPin(pin);
    if (!student) {
      return res.status(404).json({ error: `Student with PIN / Roll Number "${pin}" not found in SDMS.` });
    }
    res.json({ student });
  } catch (err) {
    console.error('SDMS getStudentByPin controller error:', err.message);
    res.status(500).json({ error: 'Failed to lookup student in SDMS: ' + err.message });
  }
}

module.exports = {
  getStudents,
  getStudentByPin
};
