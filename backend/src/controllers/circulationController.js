const mongoose = require('mongoose');
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const Fine = require('../models/Fine');
const User = require('../models/User');
const Setting = require('../models/Setting');
const Reservation = require('../models/Reservation');
const { logAudit } = require('../services/auditService');
const sdmsService = require('../services/sdmsService');
const hrmsService = require('../services/hrmsService');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// 1. Issue Book to Patron (Persisted dynamically in MongoDB)
async function issueBook(req, res) {
  try {
    const { barcode, barcodes, books: reqBooks, patron_id, user_id, due_date, loan_days } = req.body || {};
    const patronType = String(req.body?.patron_type || 'student').trim().toLowerCase();
    if (!['student', 'faculty'].includes(patronType)) {
      return res.status(400).json({ error: 'Patron type must be student or faculty.' });
    }

    // 1. Collect all barcodes / book numbers to issue
    let itemsToIssue = [];
    if (Array.isArray(barcodes) && barcodes.length > 0) {
      itemsToIssue = barcodes.map(b => String(b).trim()).filter(Boolean);
    } else if (Array.isArray(reqBooks) && reqBooks.length > 0) {
      itemsToIssue = reqBooks.map(b => String(b.barcode || b.accession || b).trim()).filter(Boolean);
    } else if (barcode) {
      itemsToIssue = [String(barcode).trim()];
    }

    if (itemsToIssue.length === 0) {
      return res.status(400).json({ error: 'Book barcode or accession number is required to issue.' });
    }

    // 2. Identify the patron in the selected institutional directory.
    const cleanPatronId = String(patron_id || user_id || '').trim();
    if (!cleanPatronId) {
      return res.status(400).json({ error: 'Student PIN or faculty employee number is required to issue book.' });
    }

    let patronName = req.body.patron_name ? String(req.body.patron_name).trim() : '';
    let patronDept = req.body.department ? String(req.body.department).trim() : 'General';

    if (patronType === 'faculty') {
      const hrmsEmployee = await hrmsService.getEmployeeByEmpNo(cleanPatronId);
      if (!hrmsEmployee || hrmsEmployee.is_active === false) {
        return res.status(404).json({ error: `Active HRMS faculty member #${cleanPatronId} was not found.` });
      }
      patronName = hrmsEmployee.name || patronName || cleanPatronId;
      patronDept = hrmsEmployee.department || patronDept;
    } else {
      const sdmsStudent = await sdmsService.getStudentByPin(cleanPatronId).catch(() => null);
      if (sdmsStudent) {
        patronName = sdmsStudent.name || patronName || cleanPatronId;
        patronDept = sdmsStudent.department || patronDept;
      } else if (!patronName) {
        patronName = `Student #${cleanPatronId}`;
      }
    }

    // 3. Verify Account Hold / Overdue Check directly from Loan and Fine collections
    const patronLoanScope = patronType === 'student'
      ? { $or: [{ patron_type: 'student' }, { patron_type: { $exists: false } }] }
      : { patron_type: 'faculty' };
    const existingOverdues = await Loan.countDocuments({
      patron_id: { $regex: new RegExp(`^${cleanPatronId}$`, 'i') },
      ...patronLoanScope,
      status: 'Overdue'
    });
    const unpaidFines = await Fine.find({
      patron_id: { $regex: new RegExp(`^${cleanPatronId}$`, 'i') },
      status: 'Unpaid'
    }).lean();

    if (existingOverdues > 0 || unpaidFines.length > 0) {
      const totalDues = unpaidFines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      return res.status(403).json({
        error: `PATRON ACCOUNT FROZEN: Borrowing privilege suspended for ${patronName} (${cleanPatronId}) due to ${existingOverdues} overdue book(s) or ₹${totalDues} unpaid fine(s).`,
        overdue_items: existingOverdues,
        unpaid_fines_inr: totalDues
      });
    }

    // 4. Fetch dynamic system settings for lending policies
    const settings = await Setting.findOne({ key: 'system_settings' }).lean();
    const defaultLoanDays = settings?.default_loan_days || 30;
    const maxQuota = settings?.max_books_quota || 4;

    const currentLoansCount = await Loan.countDocuments({
      patron_id: { $regex: new RegExp(`^${cleanPatronId}$`, 'i') },
      ...patronLoanScope,
      status: { $in: ['Borrowed', 'Overdue', 'Active'] }
    });

    if (currentLoansCount + itemsToIssue.length > maxQuota) {
      return res.status(403).json({
        error: `Borrowing quota reached: Patron ${patronName} (${cleanPatronId}) already has ${currentLoansCount} active loans and cannot borrow ${itemsToIssue.length} more books (Institutional limit: ${maxQuota} books).`
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
    const dueDateFormatted = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // 6. Issue each book
    const createdLoans = [];
    for (const itemBarcode of itemsToIssue) {
      const cleanBarcode = String(itemBarcode).trim();
      const strippedBarcode = cleanBarcode.replace(/[\s\-_]/g, '');
      if (/^\d+\s*[-–]\s*\d+$/.test(cleanBarcode)) {
        return res.status(400).json({ error: 'Enter one individual book number, not an accession range.' });
      }

      // Find book in MongoDB Atlas
      let book = await Book.findOne({
        $or: [
          { barcode: cleanBarcode },
          { accession: cleanBarcode },
          { barcode: strippedBarcode },
          { accession: strippedBarcode },
          { title_id: cleanBarcode },
          { titleId: cleanBarcode },
          { title_id: strippedBarcode },
          { titleId: strippedBarcode },
          { 'copies_detail.barcode': cleanBarcode },
          { 'copies_detail.barcode': strippedBarcode },
          { 'copies_detail.accession': cleanBarcode },
          { 'copies_detail.accession': strippedBarcode }
        ]
      });

      if (!book && /^\d+$/.test(cleanBarcode)) {
        const rangedBooks = await Book.find({ accession: /^\s*\d+\s*[-–]\s*\d+\s*$/ });
        const number = Number(cleanBarcode);
        book = rangedBooks.find(candidate => {
          const range = String(candidate.accession).match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
          return range && number >= Number(range[1]) && number <= Number(range[2]);
        }) || null;
      }

      if (!book) {
        return res.status(404).json({ error: `Book with barcode/accession [${cleanBarcode}] not found in catalog.` });
      }

      if (book.available <= 0) {
        return res.status(400).json({ error: `All copies of "${book.title}" are currently on loan.` });
      }

      // Resolve and reserve only the exact copy number requested.
      let singleAccession = cleanBarcode;
      const normalizeBookNumber = value => String(value || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
      if (Array.isArray(book.copies_detail) && book.copies_detail.length > 0) {
        const copy = book.copies_detail.find(c =>
          [c.barcode, c.accession, c.serial_no].some(code =>
            normalizeBookNumber(code) === normalizeBookNumber(cleanBarcode)
          )
        );
        if (!copy || String(copy.status || '').toLowerCase() !== 'available') {
          return res.status(400).json({ error: `Book number [${cleanBarcode}] is not an available individual copy.` });
        }
        copy.status = 'Borrowed';
        singleAccession = copy.accession || copy.barcode || copy.serial_no || cleanBarcode;
      } else {
        const range = String(book.accession || '').match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
        if (range) {
          const number = Number(cleanBarcode);
          if (!/^\d+$/.test(cleanBarcode) || number < Number(range[1]) || number > Number(range[2])) {
            return res.status(400).json({ error: 'Enter one individual book number from the catalog accession range.' });
          }
          const existingCopyLoan = await Loan.findOne({
            book_id: book._id,
            accession: cleanBarcode,
            status: { $in: ['Borrowed', 'Overdue', 'Active'] }
          }).select('_id').lean();
          if (existingCopyLoan) {
            return res.status(400).json({ error: `Book number [${cleanBarcode}] is already issued.` });
          }
        } else if (Number(book.total || 1) > 1) {
          return res.status(400).json({ error: 'This title needs individual copy numbers in the catalog before it can be issued by book number.' });
        }
      }

      // Create Loan in MongoDB
      const loanDoc = await Loan.create({
        book_id: book._id,
        book_title: book.title,
        book_barcode: singleAccession,
        accession: singleAccession,
        user_id: null,
        patron_id: cleanPatronId,
        patron_type: patronType,
        patron_name: patronName,
        department: patronDept,
        shelf_location: book.shelf || '',
        staff_id: req.user?.userId || 'ADMIN',
        issue_date: issueDate,
        due_date: dueDateObj,
        status: 'Borrowed',
        renewals_count: 0
      });

      // Decrement book available count in MongoDB
      book.available = Math.max(0, book.available - 1);
      await book.save();

      // Log forensic audit trail in MongoDB
      await logAudit({
        actor_id: req.user?.userId || 'ADMIN',
        action_key: 'circulation.issue',
        target_resource: `LOAN:${loanDoc._id.toString()}`,
        payload: {
          patron: patronName,
          patron_id: cleanPatronId,
          book: book.title,
          accession: singleAccession,
          due_date: dueDateObj.toISOString()
        }
      });

      createdLoans.push({
        id: loanDoc._id.toString(),
        bookTitle: book.title,
        bookBarcode: cleanBarcode,
        accession: singleAccession,
        patronName: patronName,
        patronId: cleanPatronId,
        patronType,
        department: patronDept,
        shelfLocation: book.shelf || 'Central Stack',
        issueDateFormatted: 'Today',
        dueDateFormatted,
        issue_date: issueDate.toISOString(),
        due_date: dueDateObj.toISOString(),
        status: 'Borrowed',
        renewalsCount: 0
      });
    }

    res.status(201).json({
      message: createdLoans.length === 1
        ? `Book "${createdLoans[0].bookTitle}" successfully issued to ${patronName}.`
        : `${createdLoans.length} books successfully issued to ${patronName}.`,
      loan: createdLoans[0],
      loans: createdLoans,
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
        status: { $in: ['Borrowed', 'Overdue', 'Active'] }
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

    // Returns handled directly via Loan/Fine ledgers without touching User schema

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

    const returnDateFormatted = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    res.json({
      message: `Book "${loan.book_title}" returned successfully.`,
      reshelf_location: book?.shelf || 'Central Stack',
      fine_assessed: fineAmount > 0,
      fine_amount_inr: fineAmount,
      fine: fineDoc ? fineDoc.toObject() : null,
      loan: {
        id: loan._id.toString(),
        _id: loan._id.toString(),
        bookTitle: loan.book_title,
        accession: loan.accession,
        patronId: loan.patron_id,
        patronName: loan.patron_name,
        status: 'Returned',
        return_date: now.toISOString(),
        returnDate: now.toISOString(),
        returnDateFormatted: returnDateFormatted
      }
    });
  } catch (err) {
    console.error('Error returning book:', err);
    res.status(500).json({ error: 'Failed to return book: ' + err.message });
  }
}

async function manualReturnBook(req, res) {
  try {
    const {
      barcode,
      accession,
      patron_id,
      patron_type,
      patron_name,
      department,
      issue_date,
      due_date
    } = req.body || {};
    const scannedCode = String(barcode || accession || '').trim();
    const patronId = String(patron_id || '').trim();
    const patronType = String(patron_type || '').trim().toLowerCase();
    const issueDate = new Date(issue_date);
    const dueDate = new Date(due_date);

    if (!scannedCode || !patronId || !['student', 'faculty'].includes(patronType)) {
      return res.status(400).json({ error: 'Book barcode, borrower ID, and valid borrower type are required.' });
    }
    if (!issue_date || !due_date || Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime()) || dueDate < issueDate) {
      return res.status(400).json({ error: 'Valid issue and due dates are required; due date cannot be before issue date.' });
    }

    let patron;
    if (patronType === 'faculty') {
      patron = await hrmsService.getEmployeeByEmpNo(patronId);
      if (!patron || patron.is_active === false) {
        return res.status(404).json({ error: `Active HRMS faculty member #${patronId} was not found.` });
      }
    } else {
      patron = await sdmsService.getStudentByPin(patronId);
      if (!patron) {
        return res.status(404).json({ error: `Student #${patronId} was not found in SDMS.` });
      }
    }

    const strippedCode = scannedCode.replace(/[\s\-_]/g, '');
    const book = await Book.findOne({
      $or: [
        { barcode: scannedCode },
        { accession: scannedCode },
        { title_id: scannedCode },
        { titleId: scannedCode },
        { barcode: strippedCode },
        { accession: strippedCode },
        { title_id: strippedCode },
        { titleId: strippedCode },
        { 'copies_detail.barcode': scannedCode },
        { 'copies_detail.accession': scannedCode },
        { 'copies_detail.serial_no': scannedCode },
        { 'copies_detail.barcode': strippedCode },
        { 'copies_detail.accession': strippedCode },
        { 'copies_detail.serial_no': strippedCode }
      ]
    });
    if (!book) {
      return res.status(404).json({ error: `Book [${scannedCode}] was not found in the catalog.` });
    }

    const normalizeCode = value => String(value || '').replace(/[\s\-_]/g, '').toLowerCase();
    const normalizedScannedCode = normalizeCode(scannedCode);
    const copies = Array.isArray(book.copies_detail) ? book.copies_detail : [];
    let copy = copies.find(item =>
      [item.barcode, item.accession, item.serial_no].some(code => normalizeCode(code) === normalizedScannedCode)
    );
    if (!copy && normalizeCode(book.barcode) !== normalizedScannedCode &&
        normalizeCode(book.accession) !== normalizedScannedCode &&
        normalizeCode(book.title_id) !== normalizedScannedCode &&
        normalizeCode(book.titleId) !== normalizedScannedCode) {
      return res.status(404).json({ error: `Copy [${scannedCode}] was not found in the catalog.` });
    }
    if (!copy && copies.length > 0) {
      copy = copies.find(item => String(item.status || '').toLowerCase() === 'borrowed') || copies[0];
    }

    const wasBorrowed = copy
      ? String(copy.status || '').toLowerCase() === 'borrowed'
      : Number(book.available || 0) < Number(book.total || 0);
    if (copy) copy.status = 'Available';
    if (wasBorrowed) {
      book.available = Math.min(Number(book.total || 0), Number(book.available || 0) + 1);
    }

    const now = new Date();
    const resolvedPatronName = patron.name || patron.employee_name || patron.student_name || patron_name || patronId;
    const resolvedDepartment = patron.department || department || 'General';
    const loan = await Loan.create({
      book_id: book._id,
      book_title: book.title,
      book_barcode: copy?.barcode || copy?.accession || copy?.serial_no || scannedCode,
      accession: copy?.accession || book.accession || scannedCode,
      patron_id: patronId,
      patron_type: patronType,
      patron_name: resolvedPatronName,
      department: resolvedDepartment,
      shelf_location: book.shelf || '',
      staff_id: req.user?.userId || 'ADMIN',
      issue_date: issueDate,
      due_date: dueDate,
      return_date: now,
      status: 'Returned',
      renewals_count: 0
    });
    await book.save();

    await logAudit({
      actor_id: req.user?.userId || 'STAFF',
      action_key: 'circulation.manual_return',
      target_resource: `LOAN:${loan._id.toString()}`,
      payload: {
        book: book.title,
        accession: loan.accession,
        patron: resolvedPatronName,
        patron_id: patronId,
        patron_type: patronType,
        original_issue_date: issueDate.toISOString(),
        original_due_date: dueDate.toISOString(),
        manual_return: true
      }
    });

    const formatDate = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return res.status(201).json({
      message: `Book "${book.title}" recorded as manually returned.`,
      loan: {
        id: loan._id.toString(),
        _id: loan._id.toString(),
        bookTitle: loan.book_title,
        bookBarcode: loan.book_barcode,
        accession: loan.accession,
        patronId: loan.patron_id,
        patronType: loan.patron_type,
        patronName: loan.patron_name,
        department: loan.department,
        shelfLocation: loan.shelf_location || book.shelf || 'Central Stack',
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        return_date: now.toISOString(),
        returnDate: now.toISOString(),
        issueDateFormatted: formatDate(issueDate),
        dueDateFormatted: formatDate(dueDate),
        returnDateFormatted: formatDate(now),
        status: 'Returned'
      },
      book: {
        id: book._id.toString(),
        barcode: book.barcode,
        accession: book.accession,
        available: book.available,
        total: book.total,
        shelf: book.shelf,
        copies_detail: book.copies_detail
      }
    });
  } catch (err) {
    console.error('Error recording manual book return:', err);
    return res.status(500).json({ error: 'Failed to record manual return: ' + err.message });
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
        status: { $in: ['Borrowed', 'Overdue', 'Active'] }
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
    const bookIds = [...new Set(rawLoans.map(loan => loan.book_id?.toString()).filter(Boolean))];
    const catalogBooks = bookIds.length
      ? await Book.find({ _id: { $in: bookIds } }).select('shelf').lean()
      : [];
    const shelfByBookId = new Map(catalogBooks.map(book => [book._id.toString(), book.shelf]));

    const formattedLoans = rawLoans.map(l => {
      const issueDate = l.issue_date ? new Date(l.issue_date) : new Date(l.created_at || Date.now());
      const dueDate = l.due_date ? new Date(l.due_date) : new Date();
      const rawReturnDate = l.return_date || (l.status === 'Returned' && l.updated_at ? l.updated_at : null);
      const returnDateObj = rawReturnDate ? new Date(rawReturnDate) : null;
      const returnDateFormatted = returnDateObj && !isNaN(returnDateObj.getTime())
        ? returnDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : (l.status === 'Returned' ? 'Returned' : null);

      let singleAcc = l.accession || l.book_barcode || '';

      return {
        id: l._id.toString(),
        _id: l._id.toString(),
        loan_id: l._id.toString(),
        bookId: l.book_id?.toString() || null,
        bookTitle: l.book_title,
        book_title: l.book_title,
        bookBarcode: singleAcc,
        accession: singleAcc,
        patronName: l.patron_name,
        patronId: l.patron_id,
        patronType: l.patron_type || 'student',
        department: l.department || 'General',
        shelfLocation: l.shelf_location || shelfByBookId.get(l.book_id?.toString()) || 'Not mapped in catalog',
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        return_date: returnDateObj ? returnDateObj.toISOString() : null,
        returnDate: returnDateObj ? returnDateObj.toISOString() : null,
        issueDateFormatted: issueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        dueDateFormatted: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        returnDateFormatted: returnDateFormatted,
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

// 8. Bulk Import Circulations (Excel / CSV Spreadsheet Import)
async function bulkImportCirculations(req, res) {
  try {
    const { circulations } = req.body || {};
    if (!Array.isArray(circulations) || circulations.length === 0) {
      return res.status(400).json({ error: 'Array of circulation records is required.' });
    }

    const createdLoans = [];
    const errors = [];

    for (let i = 0; i < circulations.length; i++) {
      const item = circulations[i];
      const patronIdValue = [
        item.patronId,
        item.patron_id,
        item.memberId,
        item.member_id,
        item.employeeId,
        item.empNo,
        item.studentPin,
        item.pinNo,
        item.rollNo
      ].find(value => value !== undefined && value !== null && String(value).trim() !== '');
      const patronId = String(patronIdValue ?? '').trim();
      const patronType = /^\d+$/.test(patronId) ? 'faculty' : 'student';
      const patronName = String(
        item.patronName ||
        item.patron_name ||
        item.memberName ||
        item.employeeName ||
        item.studentName ||
        item.name ||
        (patronType === 'faculty' ? 'Faculty Borrower' : 'Student Borrower')
      ).trim();
      const accession = String(item.accession || item.accessionNo || item.serialNo || item.barcode || '').trim();
      const bookTitle = String(item.bookTitle || item.title || item.book_title || 'Library Holding').trim();
      const statusRaw = String(item.status || 'Active').trim();
      const isReturned = statusRaw.toLowerCase() === 'returned';
      const isOverdue = statusRaw.toLowerCase() === 'overdue';
      const status = isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Active';

      const issueDate = item.issueDate ? new Date(item.issueDate) : new Date();
      const dueDate = item.dueDate ? new Date(item.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const returnDate = isReturned ? (item.returnDate ? new Date(item.returnDate) : new Date()) : null;

      if (!patronId && !accession && !bookTitle) {
        continue;
      }

      try {
        const titleId = String(item.bookTitleId || item.titleId || item.title_id || '').trim();
        const barcode = String(item.bookBarcode || item.barcode || '').trim();
        const normalizeBookCode = value => String(value || '').replace(/[\s\-_]/g, '').toLowerCase();
        const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let catalogBook = null;
        if (titleId) {
          catalogBook = await Book.findOne({
            $or: [{ title_id: titleId }, { titleId }]
          });
        }
        if (bookTitle && bookTitle !== 'Library Holding') {
          if (!catalogBook) {
            catalogBook = await Book.findOne({
              title: { $regex: `^${escapeRegex(bookTitle)}$`, $options: 'i' }
            });
          }
        }
        if (!catalogBook && (!titleId || bookTitle === 'Library Holding')) {
          const lookupCodes = [...new Set([accession, barcode].filter(Boolean).flatMap(value => [
            value,
            value.replace(/[\s\-_]/g, '')
          ]))];
          const bookLookup = lookupCodes.flatMap(code => [
            { accession: code },
            { barcode: code },
            { 'copies_detail.accession': code },
            { 'copies_detail.barcode': code },
            { 'copies_detail.serial_no': code }
          ]);
          catalogBook = bookLookup.length ? await Book.findOne({ $or: bookLookup }) : null;
        }

        const isAccessionRange = value => /^\s*\d+\s*[-–]\s*\d+\s*$/.test(String(value || ''));
        const copyIdentifiers = [accession, barcode].filter(value => value && !isAccessionRange(value));
        const individualIdentifier = copyIdentifiers[0] || '';
        const catalogCopy = catalogBook && Array.isArray(catalogBook.copies_detail)
          ? catalogBook.copies_detail.find(copy =>
              [copy.accession, copy.barcode, copy.serial_no].some(copyCode =>
                copyIdentifiers.some(identifier =>
                  normalizeBookCode(identifier) === normalizeBookCode(copyCode)
                )
              )
            )
          : null;
        let linkedCatalogBook = catalogBook;
        if (!isReturned && catalogBook && copyIdentifiers.length > 0 && Array.isArray(catalogBook.copies_detail) &&
            catalogBook.copies_detail.length > 0 && !catalogCopy) {
          linkedCatalogBook = null;
        }

        if (!isReturned && !individualIdentifier) {
          errors.push({ index: i, error: 'An individual accession or barcode is required; title-level ranges cannot be borrowed.' });
          continue;
        }

        const catalogRange = catalogBook && !catalogCopy
          ? String(catalogBook.accession || '').match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/)
          : null;
        const accessionNumber = /^\d+$/.test(individualIdentifier) ? Number(individualIdentifier) : NaN;
        const isSingleCopyBaseMatch = Boolean(
          catalogBook &&
          Number(catalogBook.total || 1) === 1 &&
          copyIdentifiers.some(identifier =>
            [catalogBook.accession, catalogBook.barcode].some(baseCode =>
              normalizeBookCode(identifier) === normalizeBookCode(baseCode)
            )
          )
        );
        const isInCatalogRange = Boolean(
          catalogRange &&
          Number.isFinite(accessionNumber) &&
          accessionNumber >= Number(catalogRange[1]) &&
          accessionNumber <= Number(catalogRange[2])
        );
        if (!isReturned && catalogBook && individualIdentifier && !catalogCopy &&
            ((!catalogRange || !isInCatalogRange) && !isSingleCopyBaseMatch)) {
          linkedCatalogBook = null;
        }

        const mappedAccession = catalogCopy?.accession || individualIdentifier || (isReturned ? accession : '') || '';
        const mappedBarcode = catalogCopy?.barcode || catalogCopy?.serial_no ||
          (barcode && !isAccessionRange(barcode) ? barcode : '') || mappedAccession;

        if (!isReturned && linkedCatalogBook && accession) {
          const activeCopyLoan = await Loan.findOne({
            book_id: linkedCatalogBook._id,
            status: { $ne: 'Returned' },
            return_date: null,
            $or: [
              { accession: mappedAccession },
              { book_barcode: mappedBarcode }
            ]
          }).select('_id').lean();
          if (activeCopyLoan) {
            errors.push({ index: i, error: `Book number [${mappedAccession}] already has an active loan; duplicate row skipped.` });
            continue;
          }
        }

        const newLoan = await Loan.create({
          book_id: linkedCatalogBook?._id,
          patron_id: patronId || 'GENERAL',
          patron_type: patronType,
          patron_name: patronName,
          accession: mappedAccession || 'AC-BULK',
          book_barcode: mappedBarcode || 'BC-BULK',
          book_title: linkedCatalogBook?.title || bookTitle,
          department: item.department || 'General',
          shelf_location: linkedCatalogBook?.shelf || '',
          status: status,
          issue_date: issueDate,
          due_date: dueDate,
          return_date: returnDate
        });

        if (linkedCatalogBook && !isReturned) {
          if (catalogCopy && String(catalogCopy.status || '').toLowerCase() === 'available') {
            catalogCopy.status = 'Borrowed';
          }
          linkedCatalogBook.available = Math.max(0, Number(linkedCatalogBook.available ?? linkedCatalogBook.total ?? 1) - 1);
          await linkedCatalogBook.save();
        }

        const retDate = newLoan.return_date ? new Date(newLoan.return_date) : null;
        createdLoans.push({
          id: newLoan._id.toString(),
          _id: newLoan._id.toString(),
          bookId: linkedCatalogBook?._id.toString() || null,
          accession: newLoan.accession,
          bookBarcode: newLoan.book_barcode,
          bookTitle: newLoan.book_title,
          shelfLocation: newLoan.shelf_location || 'Not mapped in catalog',
          patronId: newLoan.patron_id,
          patronType: newLoan.patron_type,
          patronName: newLoan.patron_name,
          department: newLoan.department,
          status: newLoan.status,
          issue_date: newLoan.issue_date ? newLoan.issue_date.toISOString() : '',
          due_date: newLoan.due_date ? newLoan.due_date.toISOString() : '',
          return_date: retDate ? retDate.toISOString() : '',
          returnDate: retDate ? retDate.toISOString() : '',
          issueDateFormatted: newLoan.issue_date ? newLoan.issue_date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          dueDateFormatted: newLoan.due_date ? newLoan.due_date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          returnDateFormatted: retDate ? retDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
        });
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'circulation.bulk_import',
      target_resource: 'LOANS',
      payload: { count: createdLoans.length, errorsCount: errors.length }
    });

    res.json({
      message: `Successfully imported ${createdLoans.length} circulation records.`,
      count: createdLoans.length,
      loans: createdLoans,
      errors
    });
  } catch (err) {
    console.error('Error in bulkImportCirculations:', err);
    res.status(500).json({ error: 'Failed to bulk import circulations: ' + err.message });
  }
}

module.exports = {
  issueBook,
  returnBook,
  manualReturnBook,
  renewLoan,
  getActiveLoans,
  getReservations,
  createReservation,
  cancelReservation,
  bulkImportCirculations
};
