const db = require('../config/db');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

const LOAN_DAYS = 30;
const DAILY_FINE_RATE = 5.0; // ₹5 / day

async function issueBook(req, res) {
  const { barcode, patron_id, user_id } = req.body || {};

  // 1. Find book
  const book = db.books.find(b => b.barcode === barcode || b.accession_no === barcode);
  if (!book) {
    return res.status(404).json({ error: `Book with barcode/accession [${barcode}] not found.` });
  }

  // 2. Check availability
  if (book.available_copies <= 0) {
    return res.status(400).json({ error: `All copies of "${book.title}" are currently on loan.` });
  }

  // 3. Find patron strictly from registered MongoDB members
  let student = null;
  if (patron_id) {
    const cleanId = String(patron_id).trim();
    student = await User.findOne({
      $or: [
        { patron_id: cleanId.toUpperCase() },
        { patron_id: cleanId },
        { email: cleanId.toLowerCase() },
        { username: cleanId.toLowerCase() },
        { full_name: new RegExp(`^${cleanId}$`, 'i') }
      ]
    });
  } else if (user_id) {
    try {
      student = await User.findById(user_id);
    } catch (_) {}
  }

  if (!student) {
    return res.status(404).json({ error: `Cannot issue book: Patron "${patron_id || user_id || 'Unknown'}" is not registered in the library database. Please register the member first.` });
  }

  const patronDocId = student._id.toString();

  // 4. Verify Account Hold / Overdue Check
  const existingOverdues = db.borrow_records.filter(r => String(r.user_id) === patronDocId && r.status === 'Overdue');
  const unpaidFines = db.fines.filter(f => String(f.user_id) === patronDocId && f.status === 'Unpaid');

  if (existingOverdues.length > 0 || unpaidFines.length > 0) {
    const totalDues = unpaidFines.reduce((sum, f) => sum + f.amount, 0);
    return res.status(403).json({
      error: 'PATRON ACCOUNT FROZEN: Borrowing privilege suspended due to overdue loans or unpaid penalties.',
      overdue_items: existingOverdues.length,
      unpaid_fines_inr: totalDues
    });
  }

  // 5. Calculate due date
  const issueDate = new Date();
  let dueDate = new Date();
  if (req.body.due_date) {
    const parsed = new Date(req.body.due_date);
    if (!isNaN(parsed.getTime())) {
      dueDate = parsed;
    } else {
      dueDate.setDate(issueDate.getDate() + LOAN_DAYS);
    }
  } else if (req.body.loan_days) {
    dueDate.setDate(issueDate.getDate() + parseInt(req.body.loan_days, 10));
  } else {
    dueDate.setDate(issueDate.getDate() + LOAN_DAYS);
  }

  book.available_copies--;

  const loanRecord = {
    id: db.borrow_records.length + 1,
    user_id: patronDocId,
    patron_id: student.patron_id || `PATRON-${patronDocId.slice(-4)}`,
    patron_name: student.full_name,
    book_id: book.id,
    staff_id: req.user?.userId || 'ADMIN',
    issue_date: issueDate.toISOString(),
    due_date: dueDate.toISOString(),
    return_date: null,
    status: 'Borrowed'
  };

  db.borrow_records.push(loanRecord);

  logAudit({
    actor_id: req.user?.userId || 'SYSTEM',
    action_key: 'circulation.issue',
    target_resource: `LOAN:${loanRecord.id}`,
    payload: {
      patron: student.full_name,
      book: book.title,
      accession: book.accession_no,
      due_date: dueDate.toISOString()
    }
  });

  res.status(201).json({
    message: `Book "${book.title}" successfully issued to ${student.full_name}.`,
    loan: loanRecord,
    book: {
      title: book.title,
      accession: book.accession_no,
      remaining_copies: book.available_copies
    },
    due_date_formatted: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  });
}

function returnBook(req, res) {
  const { barcode, borrow_id } = req.body || {};

  let record = null;
  if (borrow_id) {
    record = db.borrow_records.find(r => r.id === parseInt(borrow_id, 10));
  } else if (barcode) {
    const book = db.books.find(b => b.barcode === barcode || b.accession_no === barcode);
    if (book) {
      record = db.borrow_records.find(r => r.book_id === book.id && (r.status === 'Borrowed' || r.status === 'Overdue'));
    }
  }

  if (!record) {
    return res.status(404).json({ error: 'No active checkout found for this book / accession ID.' });
  }

  const book = db.books.find(b => b.id === record.book_id);
  const now = new Date();
  const dueDate = new Date(record.due_date);
  record.return_date = now.toISOString();

  let fineAmount = 0;
  let fineRecord = null;

  if (now > dueDate) {
    const overdueMs = now - dueDate;
    const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
    fineAmount = overdueDays * DAILY_FINE_RATE;

    record.status = 'Returned';

    fineRecord = {
      id: db.fines.length + 1,
      borrow_id: record.id,
      user_id: record.user_id,
      amount: fineAmount,
      status: 'Unpaid',
      paid_at: null,
      collected_by: null,
      waiver_reason: null,
      created_at: now.toISOString()
    };
    db.fines.push(fineRecord);
  } else {
    record.status = 'Returned';
  }

  if (book && book.available_copies < book.total_copies) {
    book.available_copies++;
  }

  logAudit({
    actor_id: req.user?.userId || 'SYSTEM',
    action_key: 'circulation.return',
    target_resource: `LOAN:${record.id}`,
    payload: {
      book: book ? book.title : 'Unknown',
      overdue_fine: fineAmount
    }
  });

  res.json({
    message: `Book "${book ? book.title : ''}" returned successfully.`,
    reshelf_location: book ? book.shelf_location : 'Stack',
    fine_assessed: fineAmount > 0,
    fine_amount_inr: fineAmount,
    fine: fineRecord
  });
}

async function getActiveLoans(req, res) {
  try {
    const users = await User.find().select('full_name patron_id').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const active = db.borrow_records.filter(r => r.status === 'Borrowed' || r.status === 'Overdue').map(r => {
      const b = db.books.find(book => book.id === r.book_id);
      const u = userMap.get(String(r.user_id));
      return {
        ...r,
        book_title: b ? b.title : 'Unknown',
        accession_no: b ? b.accession_no : 'Unknown',
        patron_name: u ? u.full_name : (r.patron_name || 'Unknown'),
        patron_id: u ? u.patron_id : (r.patron_id || 'Unknown')
      };
    });

    res.json({
      total: active.length,
      loans: active
    });
  } catch (err) {
    console.error('Error fetching active loans:', err);
    res.status(500).json({ error: 'Failed to retrieve active loans' });
  }
}

module.exports = {
  issueBook,
  returnBook,
  getActiveLoans
};
