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

async function getStudentPhoto(req, res) {
  try {
    const photo = await sdmsService.getStudentPhoto(req.params.pin);
    if (!photo) {
      return res.status(404).json({ error: 'Student photo not found.' });
    }

    const binaryPhoto = Buffer.isBuffer(photo)
      ? photo
      : Buffer.isBuffer(photo?.buffer)
        ? photo.buffer
        : Buffer.isBuffer(photo?.data)
          ? photo.data
          : null;
    if (binaryPhoto) {
      res.type(photo?.contentType || photo?.mimetype || 'image/jpeg').send(binaryPhoto);
      return;
    }

    const value = typeof photo === 'string'
      ? photo.trim()
      : typeof photo?.data === 'string' ? photo.data.trim() : '';
    if (!value) {
      return res.status(404).json({ error: 'Student photo format is not supported.' });
    }
    if (/^https?:\/\//i.test(value)) {
      return res.redirect(302, value);
    }
    const dataUrl = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
    const contentType = dataUrl?.[1] || photo?.contentType || photo?.mimetype || 'image/jpeg';
    const base64 = dataUrl ? dataUrl[2] : value;
    res.type(contentType).send(Buffer.from(base64, 'base64'));
  } catch (err) {
    console.error('SDMS getStudentPhoto controller error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve student photo.' });
  }
}

module.exports = {
  getStudents,
  getStudentByPin,
  getStudentPhoto
};
