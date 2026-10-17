const db = require('../config/db');
const { logAudit } = require('../services/auditService');

const LOAN_DAYS = 30;
const DAILY_FINE_RATE = 5.0; // ₹5 / day

function issueBook(req, res) {
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

  // 3. Find patron strictly from registered members
  let student = null;
  if (patron_id) {
    const cleanId = String(patron_id).trim().toLowerCase();
    student = db.users.find(u => 
      (u.patron_id && u.patron_id.toLowerCase() === cleanId) || 
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.full_name && u.full_name.toLowerCase() === cleanId)
    );

    // If patron was enrolled in frontend (e.g., Ananya, Karthik, or new signups):
    if (!student && req.body.patron_name && (cleanId.startsWith('stu-') || cleanId.startsWith('fac-'))) {
      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      student = {
        id: newId,
        role_id: 4,
        full_name: req.body.patron_name,
        email: `${cleanId.replace(/[^a-z0-9]/g, '')}@college.edu.in`,
        phone: '+91 98450 ' + String(10000 + newId),
        patron_id: patron_id,
        department: req.body.department || 'Engineering',
        status: 'Active',
        created_at: new Date()
      };
      db.users.push(student);
    }
  } else if (user_id) {
    student = db.users.find(u => u.id === parseInt(user_id, 10));
  }

  if (!student) {
    return res.status(404).json({ error: `Cannot issue book: Patron "${patron_id || 'Unknown'}" is not registered in the campus library database. Please onboard the patron first.` });
  }

  // 4. Verify Account Hold / Overdue Check (Section 5.3 of README)
  const existingOverdues = db.borrow_records.filter(r => r.user_id === student.id && r.status === 'Overdue');
  const unpaidFines = db.fines.filter(f => f.user_id === student.id && f.status === 'Unpaid');

  if (existingOverdues.length > 0 || unpaidFines.length > 0) {
    const totalDues = unpaidFines.reduce((sum, f) => sum + f.amount, 0);
    return res.status(403).json({
      error: 'PATRON ACCOUNT FROZEN: Borrowing privilege suspended due to overdue loans or unpaid penalties.',
      overdue_items: existingOverdues.length,
      unpaid_fines_inr: totalDues
    });
  }

  // 5. Calculate due date (preset 7, 14, 21, 30 days, manual date, or default)
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
    user_id: student.id,
    book_id: book.id,
    staff_id: 3, // Desk Assistant
    issue_date: issueDate.toISOString(),
    due_date: dueDate.toISOString(),
    return_date: null,
    status: 'Borrowed'
  };

  db.borrow_records.push(loanRecord);

  logAudit({
    actor_id: 3,
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
    actor_id: 3,
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

function getActiveLoans(req, res) {
  const active = db.borrow_records.filter(r => r.status === 'Borrowed' || r.status === 'Overdue').map(r => {
    const b = db.books.find(book => book.id === r.book_id);
    const u = db.users.find(user => user.id === r.user_id);
    return {
      ...r,
      book_title: b ? b.title : 'Unknown',
      accession_no: b ? b.accession_no : 'Unknown',
      patron_name: u ? u.full_name : 'Unknown',
      patron_id: u ? u.patron_id : 'Unknown'
    };
  });

  res.json({
    total: active.length,
    loans: active
  });
}

module.exports = {
  issueBook,
  returnBook,
  getActiveLoans
};
