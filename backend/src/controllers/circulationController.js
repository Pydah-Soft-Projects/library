const mongoose = require('mongoose');
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const Fine = require('../models/Fine');
const User = require('../models/User');
const Setting = require('../models/Setting');
const Reservation = require('../models/Reservation');
const { logAudit } = require('../services/auditService');
const sdmsService = require('../services/sdmsService');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// 1. Issue Book to Patron (Persisted dynamically in MongoDB)
async function issueBook(req, res) {
  try {
    const { barcode, patron_id, user_id, due_date, loan_days } = req.body || {};

    if (!barcode) {
      return res.status(400).json({ error: 'Book barcode or accession number is required to issue.' });
    }

    const cleanBarcode = String(barcode).trim();
    const strippedBarcode = cleanBarcode.replace(/[\s\-_]/g, '');

    // 1. Find book in MongoDB Atlas
    const book = await Book.findOne({
      $or: [
        { barcode: cleanBarcode },
        { accession: cleanBarcode },
        { barcode: strippedBarcode },
        { accession: strippedBarcode },
        { 'copies_detail.barcode': cleanBarcode },
        { 'copies_detail.barcode': strippedBarcode },
        { 'copies_detail.accession': cleanBarcode },
        { 'copies_detail.accession': strippedBarcode }
      ]
    });

    if (!book) {
      return res.status(404).json({ error: `Book with barcode/accession [${cleanBarcode}] not found in catalog.` });
    }

    if (book.available <= 0) {
      return res.status(400).json({ error: `All copies of "${book.title}" are currently on loan.` });
    }

    // 2. Find patron in MongoDB Atlas
    let student = null;
    if (patron_id) {
      const cleanPatronId = String(patron_id).trim();
      student = await User.findOne({
        $or: [
          { patron_id: cleanPatronId },
          { patron_id: cleanPatronId.toUpperCase() },
          { email: cleanPatronId.toLowerCase() },
          { username: cleanPatronId.toLowerCase() },
          { full_name: new RegExp(`^${cleanPatronId}$`, 'i') }
        ]
      });
    } else if (user_id) {
      try {
        if (mongoose.Types.ObjectId.isValid(user_id)) {
          student = await User.findById(user_id);
        }
      } catch (_) {}
    }

    if (!student && patron_id) {
      const cleanPatronId = String(patron_id).trim();
      const sdmsStudent = await sdmsService.getStudentByPin(cleanPatronId).catch(() => null);
      if (sdmsStudent) {
        student = await User.create({
          username: (sdmsStudent.pin_no || sdmsStudent.rollNo || cleanPatronId).toLowerCase(),
          full_name: sdmsStudent.name,
          email: sdmsStudent.email,
          patron_id: sdmsStudent.pin_no || sdmsStudent.rollNo || cleanPatronId,
          department: sdmsStudent.department,
          role: 'Student',
          role_id: 4,
          status: 'Active',
          password: await bcrypt.hash('student123', 10)
        });
      }
    }

    if (!student) {
      return res.status(404).json({
        error: `Cannot issue book: Student / Patron "${patron_id || user_id || 'Unknown'}" not found in Library or SDMS database.`
      });
    }

    const patronDocId = student._id;

    // 3. Verify Account Hold / Overdue Check from MongoDB
    const existingOverdues = await Loan.countDocuments({
      user_id: patronDocId,
      status: 'Overdue'
    });
    const unpaidFines = await Fine.find({
      user_id: patronDocId,
      status: 'Unpaid'
    }).lean();

    if (existingOverdues > 0 || unpaidFines.length > 0 || student.status === 'Frozen') {
      const totalDues = unpaidFines.reduce((sum, f) => sum + f.amount, 0);
      return res.status(403).json({
        error: 'PATRON ACCOUNT FROZEN: Borrowing privilege suspended due to overdue loans or unpaid penalties.',
        overdue_items: existingOverdues,
        unpaid_fines_inr: totalDues
      });
    }

    // 4. Fetch dynamic system settings for lending policies
    const settings = await Setting.findOne({ key: 'system_settings' }).lean();
    const defaultLoanDays = settings?.default_loan_days || 30;
    const maxQuota = settings?.max_books_quota || 4;

    const currentLoansCount = await Loan.countDocuments({
      user_id: patronDocId,
      status: { $in: ['Borrowed', 'Overdue'] }
    });

    if (currentLoansCount >= maxQuota) {
      return res.status(403).json({
        error: `Borrowing quota reached. Patron already has ${currentLoansCount} active loans (Limit: ${maxQuota}).`
      });
    }

    // 5. Calculate due date
    const issueDate = new Date();
    let dueDateObj = new Date();
    if (due_date) {
      const parsed = new Date(due_date);
      if (!isNaN(parsed.getTime())) {
        dueDateObj = parsed;
      } else {
        dueDateObj.setDate(issueDate.getDate() + defaultLoanDays);
      }
    } else if (loan_days) {
      dueDateObj.setDate(issueDate.getDate() + parseInt(loan_days, 10));
    } else {
      dueDateObj.setDate(issueDate.getDate() + defaultLoanDays);
    }

    // 6. Create Loan in MongoDB
    const loanDoc = await Loan.create({
      book_id: book._id,
      book_title: book.title,
      book_barcode: cleanBarcode,
      accession: book.accession,
      user_id: student._id,
      patron_id: student.patron_id || student.username || `PATRON-${student._id.toString().slice(-4)}`,
      patron_name: student.full_name,
      department: student.department || 'General',
      staff_id: req.user?.userId || 'ADMIN',
      issue_date: issueDate,
      due_date: dueDateObj,
      status: 'Borrowed',
      renewals_count: 0
    });

    // 7. Decrement book available count in MongoDB
    book.available = Math.max(0, book.available - 1);
    if (Array.isArray(book.copies_detail)) {
      const copy = book.copies_detail.find(c => 
        c.barcode === cleanBarcode || c.accession === cleanBarcode ||
        c.barcode === strippedBarcode || c.accession === strippedBarcode
      );
      if (copy) copy.status = 'Borrowed';
    }
    await book.save();

    // 8. Log forensic audit trail in MongoDB
    await logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'circulation.issue',
      target_resource: `LOAN:${loanDoc._id.toString()}`,
      payload: {
        patron: student.full_name,
        patron_id: student.patron_id,
        book: book.title,
        accession: book.accession,
        due_date: dueDateObj.toISOString()
      }
    });

    const dueDateFormatted = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    res.status(201).json({
      message: `Book "${book.title}" successfully issued to ${student.full_name}.`,
      loan: {
        id: loanDoc._id.toString(),
        bookTitle: book.title,
        bookBarcode: cleanBarcode,
        accession: book.accession,
        patronName: student.full_name,
        patronId: student.patron_id || student.username,
        department: student.department,
        issueDateFormatted: 'Today',
        dueDateFormatted,
        issue_date: issueDate.toISOString(),
        due_date: dueDateObj.toISOString(),
        status: 'Borrowed',
        renewalsCount: 0
      },
      book: {
        id: book._id.toString(),
        title: book.title,
        accession: book.accession,
        remaining_copies: book.available
      },
      due_date_formatted: dueDateFormatted
    });
  } catch (err) {
    console.error('Error in issueBook:', err);
    res.status(500).json({ error: 'Failed to issue book: ' + err.message });
  }
}

// 2. Return Book (Persisted dynamically in MongoDB)
async function returnBook(req, res) {
  try {
    const { barcode, borrow_id } = req.body || {};

    let loan = null;
    if (borrow_id && mongoose.Types.ObjectId.isValid(borrow_id)) {
      loan = await Loan.findById(borrow_id);
    }

    if (!loan && barcode) {
      const cleanBarcode = String(barcode).trim();
      const strippedBarcode = cleanBarcode.replace(/[\s\-_]/g, '');

      loan = await Loan.findOne({
        $or: [
          { book_barcode: cleanBarcode },
          { accession: cleanBarcode },
          { book_barcode: strippedBarcode },
          { accession: strippedBarcode },
          { patron_id: cleanBarcode },
          { patron_id: cleanBarcode.toUpperCase() },
          { patron_name: new RegExp(`^${cleanBarcode}$`, 'i') }
        ],
        status: { $in: ['Borrowed', 'Overdue'] }
      }).sort({ created_at: -1 });
    }

    if (!loan) {
      return res.status(404).json({ error: 'No active checkout found for this book / barcode.' });
    }

    const now = new Date();
    const dueDate = new Date(loan.due_date);
    loan.return_date = now;
    loan.status = 'Returned';
    await loan.save();

    let fineAmount = 0;
    let fineDoc = null;

    // Check overdue and assess fine dynamically
    if (now > dueDate) {
      const settings = await Setting.findOne({ key: 'system_settings' }).lean();
      const dailyRate = settings?.daily_fine_rate || 5.0;

      const overdueMs = now - dueDate;
      const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
      fineAmount = overdueDays * dailyRate;

      fineDoc = await Fine.create({
        loan_id: loan._id,
        user_id: loan.user_id,
        patron_id: loan.patron_id,
        patron_name: loan.patron_name,
        book_title: loan.book_title,
        amount: fineAmount,
        status: 'Unpaid'
      });
    }

    // Restore book stock in MongoDB
    let book = null;
    if (loan.book_id) {
      book = await Book.findById(loan.book_id);
    }
    if (!book && loan.accession) {
      book = await Book.findOne({ accession: loan.accession });
    }

    if (book) {
      book.available = Math.min(book.total, book.available + 1);
      if (Array.isArray(book.copies_detail)) {
        const copy = book.copies_detail.find(c => 
          c.barcode === loan.book_barcode || c.accession === loan.accession
        );
        if (copy) copy.status = 'Available';
      }
      await book.save();
    }

    // Automatically restore active account if no more pending fines or overdues
    if (loan.user_id) {
      const remainingOverdues = await Loan.countDocuments({ user_id: loan.user_id, status: 'Overdue' });
      const remainingFines = await Fine.countDocuments({ user_id: loan.user_id, status: 'Unpaid' });
      if (remainingOverdues === 0 && remainingFines === 0) {
        await User.findByIdAndUpdate(loan.user_id, { status: 'Active' });
      }
    }

    await logAudit({
      actor_id: req.user?.userId || 'STAFF',
      action_key: 'circulation.return',
      target_resource: `LOAN:${loan._id.toString()}`,
      payload: {
        book: loan.book_title,
        patron: loan.patron_name,
        overdue_fine: fineAmount
      }
    });

    res.json({
      message: `Book "${loan.book_title}" returned successfully.`,
      reshelf_location: book?.shelf || 'Central Stack',
      fine_assessed: fineAmount > 0,
      fine_amount_inr: fineAmount,
      fine: fineDoc ? fineDoc.toObject() : null
    });
  } catch (err) {
    console.error('Error returning book:', err);
    res.status(500).json({ error: 'Failed to return book: ' + err.message });
  }
}

// 3. Renew Loan (+15 Days Extension)
async function renewLoan(req, res) {
  try {
    const { loan_id, barcode } = req.body || {};

    let loan = null;
    if (loan_id && mongoose.Types.ObjectId.isValid(loan_id)) {
      loan = await Loan.findById(loan_id);
    } else if (barcode) {
      loan = await Loan.findOne({
        $or: [{ book_barcode: barcode }, { accession: barcode }],
        status: { $in: ['Borrowed', 'Overdue'] }
      }).sort({ created_at: -1 });
    }

    if (!loan) {
      return res.status(404).json({ error: 'Active loan not found for renewal.' });
    }

    const settings = await Setting.findOne({ key: 'system_settings' }).lean();
    const maxRenewals = settings?.max_renewals || 2;

    if ((loan.renewals_count || 0) >= maxRenewals) {
      return res.status(400).json({
        error: `Renewal quota reached (Max ${maxRenewals} renewals allowed for "${loan.book_title}"). Please return book to desk.`
      });
    }

    const currentDue = new Date(loan.due_date);
    const validCurrentDue = isNaN(currentDue.getTime()) ? new Date() : currentDue;
    validCurrentDue.setDate(validCurrentDue.getDate() + 15);

    loan.due_date = validCurrentDue;
    loan.status = 'Borrowed';
    loan.renewals_count = (loan.renewals_count || 0) + 1;
    await loan.save();

    const newDueDateStr = validCurrentDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    await logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'circulation.renew',
      target_resource: `LOAN:${loan._id.toString()}`,
      payload: {
        book: loan.book_title,
        patron: loan.patron_name,
        new_due_date: newDueDateStr,
        renewal_number: loan.renewals_count
      }
    });

    res.json({
      message: `Renewal approved (+15 Days) for "${loan.book_title}". New Due Date: ${newDueDateStr}`,
      loan: {
        id: loan._id.toString(),
        bookTitle: loan.book_title,
        bookBarcode: loan.book_barcode,
        accession: loan.accession,
        patronName: loan.patron_name,
        patronId: loan.patron_id,
        dueDateFormatted: newDueDateStr,
        renewalsCount: loan.renewals_count,
        status: loan.status
      }
    });
  } catch (err) {
    console.error('Error renewing loan:', err);
    res.status(500).json({ error: 'Failed to renew loan: ' + err.message });
  }
}

// 4. Get Active Circulation Loans (Live from MongoDB Atlas)
async function getActiveLoans(req, res) {
  try {
    const rawLoans = await Loan.find().sort({ created_at: -1 }).lean();

    const formattedLoans = rawLoans.map(l => {
      const issueDate = l.issue_date ? new Date(l.issue_date) : new Date(l.created_at || Date.now());
      const dueDate = l.due_date ? new Date(l.due_date) : new Date();

      return {
        id: l._id.toString(),
        _id: l._id.toString(),
        loan_id: l._id.toString(),
        bookTitle: l.book_title,
        book_title: l.book_title,
        bookBarcode: l.book_barcode || l.accession,
        accession: l.accession,
        patronName: l.patron_name,
        patronId: l.patron_id,
        department: l.department || 'General',
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        issueDateFormatted: issueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        dueDateFormatted: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: l.status || 'Borrowed',
        renewalsCount: l.renewals_count || 0
      };
    });

    res.json({
      total: formattedLoans.length,
      loans: formattedLoans
    });
  } catch (err) {
    console.error('Error fetching active loans from MongoDB:', err);
    res.status(500).json({ error: 'Failed to retrieve active loans from database' });
  }
}

// 5. Reservations & Holds (Persisted dynamically in MongoDB)
async function getReservations(req, res) {
  try {
    const reservations = await Reservation.find({ status: 'Active' }).sort({ created_at: -1 }).lean();
    const formatted = reservations.map(r => ({
      id: r._id.toString(),
      bookId: r.book_id ? r.book_id.toString() : null,
      bookTitle: r.book_title,
      bookAccession: r.book_accession,
      studentId: r.student_id,
      studentName: r.student_name,
      shelfLocation: r.shelf_location,
      expiresIn: r.expires_in,
      reservedAtFormatted: r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : 'Recently',
      status: r.status
    }));
    res.json({ total: formatted.length, reservations: formatted });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Failed to retrieve hold reservations' });
  }
}

async function createReservation(req, res) {
  try {
    const { book_id, book_title, book_accession, student_id, student_name, shelf_location } = req.body || {};
    if (!book_title || !student_id) {
      return res.status(400).json({ error: 'Book title and Student ID are required to reserve.' });
    }

    const existing = await Reservation.findOne({
      book_title,
      student_id,
      status: 'Active'
    });

    if (existing) {
      return res.status(409).json({ error: `You already have an active hold on "${book_title}".` });
    }

    const reservation = await Reservation.create({
      book_id: book_id && mongoose.Types.ObjectId.isValid(book_id) ? book_id : null,
      book_title,
      book_accession: book_accession || '',
      student_id,
      student_name: student_name || student_id,
      shelf_location: shelf_location || 'Central Stack',
      status: 'Active'
    });

    await logAudit({
      actor_id: student_id,
      action_key: 'circulation.reserve',
      target_resource: `RESERVATION:${reservation._id.toString()}`,
      payload: { book: book_title, student: student_name }
    });

    res.status(201).json({
      message: `Hold confirmed for "${book_title}"! Pick up at ${reservation.shelf_location} within 48h.`,
      reservation: {
        id: reservation._id.toString(),
        bookTitle: reservation.book_title,
        bookAccession: reservation.book_accession,
        studentId: reservation.student_id,
        studentName: reservation.student_name,
        shelfLocation: reservation.shelf_location,
        status: reservation.status
      }
    });
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Failed to place reservation: ' + err.message });
  }
}

async function cancelReservation(req, res) {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Reservation.findByIdAndUpdate(id, { status: 'Cancelled' });
    } else {
      await Reservation.findOneAndUpdate({ student_id: id, status: 'Active' }, { status: 'Cancelled' });
    }
    res.json({ message: 'Hold reservation successfully released.' });
  } catch (err) {
    console.error('Error cancelling reservation:', err);
    res.status(500).json({ error: 'Failed to release reservation' });
  }
}

module.exports = {
  issueBook,
  returnBook,
  renewLoan,
  getActiveLoans,
  getReservations,
  createReservation,
  cancelReservation
};
