import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftRight, User, Calendar, Clock, AlertTriangle, 
  CheckCircle2, Search, Printer, Check, X, RefreshCw, 
  BookOpen, Layers, ShieldCheck, Database, Sparkles, ChevronRight, UserCheck,
  FileSpreadsheet, UploadCloud, Download, AlertCircle, ListFilter
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BookIssuesReturnsView({
  books = [],
  loans = [],
  students = [],
  auditLogs = [],
  systemSettings = {},
  onBulkImportCirculations,
  onIssueBook,
  onReturnBook,
  onRenewLoan,
  onCollectCash,
  onOpenUpiModal,
  onOpenWaiveModal,
  prefilledBook,
  onClearPrefilled,
  initialSection = null,
  onToast
}) {
  // Read institutional policies from Settings Page
  const defaultLoanDays = Number(systemSettings?.default_loan_days || 30);
  const dailyFineRate = Number(systemSettings?.daily_fine_rate || 5.0);
  const maxBooksQuota = Number(systemSettings?.max_books_quota || 4);
  const maxRenewals = Number(systemSettings?.max_renewals || 2);

  // Active Form: null, 'issue', 'return', or 'bulk'
  const [activeForm, setActiveForm] = useState(() => {
    if (prefilledBook) return 'issue';
    if (initialSection === 'return' || initialSection === 'issue') return initialSection;
    return null;
  });

  useEffect(() => {
    if (initialSection === 'return' || initialSection === 'issue') {
      setActiveForm(initialSection);
    }
  }, [initialSection]);

  // Helper to accurately get available stock for any book format
  const getBookAvailableCount = (b) => {
    if (!b) return 0;
    if (b.available !== undefined && b.available !== null && !isNaN(Number(b.available))) {
      return Number(b.available);
    }
    if (Array.isArray(b.copies_detail) && b.copies_detail.length > 0) {
      const avail = b.copies_detail.filter(c => !c.status || c.status.toLowerCase() === 'available').length;
      return avail;
    }
    if (b.total !== undefined && b.total !== null && !isNaN(Number(b.total))) {
      return Number(b.total);
    }
    if (b.copies !== undefined && b.copies !== null && !isNaN(Number(b.copies))) {
      return Number(b.copies);
    }
    return 1;
  };

  const getBookTotalCount = (b) => {
    if (!b) return 0;
    if (b.total !== undefined && b.total !== null && !isNaN(Number(b.total))) return Number(b.total);
    if (Array.isArray(b.copies_detail) && b.copies_detail.length > 0) return b.copies_detail.length;
    if (b.copies !== undefined && b.copies !== null && !isNaN(Number(b.copies))) return Number(b.copies);
    return 1;
  };

  // ==================== ISSUE DESK STATE ====================
  const availableBooks = books.filter(b => getBookAvailableCount(b) > 0);
  
  // STRICT REQUIREMENT: Do NOT select any book by default!
  const [selectedBookBarcode, setSelectedBookBarcode] = useState(
    prefilledBook ? prefilledBook.barcode : ''
  );

  useEffect(() => {
    if (prefilledBook) {
      setSelectedBookBarcode(prefilledBook.barcode);
      setActiveForm('issue');
    }
  }, [prefilledBook]);

  // ==================== BOOK SEARCH FOR ISSUE DESK ====================
  const [bookSearchInput, setBookSearchInput] = useState('');
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const bookDropdownRef = useRef(null);

  // Filter available books based on search input (by title, accession, barcode, author, shelf)
  const filteredAvailableBooks = availableBooks.filter(b => {
    if (!bookSearchInput.trim()) return true;
    const q = bookSearchInput.toLowerCase().trim();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.accession && b.accession.toLowerCase().includes(q)) ||
      (b.barcode && b.barcode.toLowerCase().includes(q)) ||
      (b.shelf && b.shelf.toLowerCase().includes(q))
    );
  });

  // ==================== SDMS STUDENT SEARCH FOR ISSUE DESK ====================
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [sdmsResults, setSdmsResults] = useState([]);
  const [isSearchingSdms, setIsSearchingSdms] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const issueSearchDebounceRef = useRef(null);
  const issueDropdownRef = useRef(null);

  // Borrowing Window: Defaults to Settings page "default_loan_days"
  const [durationPreset, setDurationPreset] = useState(defaultLoanDays);

  useEffect(() => {
    if (systemSettings?.default_loan_days) {
      setDurationPreset(Number(systemSettings.default_loan_days));
    }
  }, [systemSettings?.default_loan_days]);

  // Dynamic duration presets following Settings page
  const durationPresets = Array.from(new Set([7, 14, 21, defaultLoanDays])).sort((a, b) => a - b);

  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultLoanDays);
    return d.toISOString().split('T')[0];
  });
  const [issuedSlip, setIssuedSlip] = useState(null);

  const selectedBook = selectedBookBarcode 
    ? books.find(b => b.barcode === selectedBookBarcode || b.accession === selectedBookBarcode)
    : null;

  const selectedBookStock = selectedBook ? getBookAvailableCount(selectedBook) : 0;

  // Live SDMS Database Student Lookup on Keystroke (Issue Desk)
  const handleIssueStudentSearchChange = (val) => {
    setStudentSearchInput(val);
    setSelectedStudent(null);

    const query = val.trim();
    if (!query) {
      setSdmsResults([]);
      setIsSearchingSdms(false);
      setIsDropdownOpen(false);
      return;
    }

    clearTimeout(issueSearchDebounceRef.current);
    setIsSearchingSdms(true);
    setIsDropdownOpen(true);

    issueSearchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sdms/students?search=${encodeURIComponent(query)}&limit=10`);
        if (!res.ok) {
          throw new Error(`SDMS status ${res.status}`);
        }
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (Array.isArray(data.students)) {
          setSdmsResults(data.students);
          setIsDropdownOpen(true);
        } else {
          setSdmsResults([]);
        }
      } catch (err) {
        console.warn('SDMS search fallback to local students:', err.message);
        const clean = query.toLowerCase();
        const localMatches = students.filter(s => 
          (s.name && s.name.toLowerCase().includes(clean)) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(clean)) ||
          (s.pin_no && s.pin_no.toLowerCase().includes(clean)) ||
          (s.id && String(s.id).toLowerCase() === clean)
        );
        setSdmsResults(localMatches);
        setIsDropdownOpen(localMatches.length > 0);
      } finally {
        setIsSearchingSdms(false);
      }
    }, 250);
  };

  const handleSelectStudent = (st) => {
    setSelectedStudent(st);
    setStudentSearchInput(`${st.name} (${st.pin_no || st.rollNo})`);
    setIsDropdownOpen(false);
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentSearchInput('');
    setSdmsResults([]);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (issueDropdownRef.current && !issueDropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(e.target)) {
        setIsBookDropdownOpen(false);
      }
      if (returnDropdownRef.current && !returnDropdownRef.current.contains(e.target)) {
        setIsReturnDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute calculated due date
  const calculatedDueDate = (() => {
    if (durationPreset === 'manual') {
      return manualDate ? new Date(manualDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date';
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(durationPreset || defaultLoanDays));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!selectedBook) {
      if (onToast) onToast('Please search and select a book to issue', 'error');
      return;
    }

    if (selectedBookStock <= 0) {
      if (onToast) onToast(`Cannot issue: Zero available copies in stock for "${selectedBook.title}"`, 'error');
      return;
    }

    if (!selectedStudent) {
      if (onToast) onToast('Please search and select a verified student from SDMS', 'error');
      return;
    }

    if (selectedStudent.status === 'Frozen') {
      if (onToast) onToast('Borrowing locked: This student account is frozen due to overdue fines.', 'error');
      return;
    }

    // Follow Settings Guidelines: Max Books Quota Check
    const studentActiveLoans = activeLoans.filter(l => 
      (l.patronId && (
        l.patronId.toLowerCase() === String(selectedStudent.pin_no || '').toLowerCase() || 
        l.patronId.toLowerCase() === String(selectedStudent.rollNo || '').toLowerCase()
      )) ||
      (l.patronName && l.patronName.toLowerCase() === selectedStudent.name.toLowerCase())
    );

    if (studentActiveLoans.length >= maxBooksQuota) {
      if (onToast) onToast(`Borrowing quota reached: ${selectedStudent.name} already has ${studentActiveLoans.length} active loans (Institutional limit: ${maxBooksQuota} books per student).`, 'error');
      return;
    }

    const payload = {
      bookBarcode: selectedBook.barcode || selectedBook.accession,
      bookTitle: selectedBook.title,
      accession: selectedBook.accession,
      patronId: selectedStudent.pin_no || selectedStudent.rollNo,
      patronName: selectedStudent.name,
      department: selectedStudent.department || 'General',
      durationDays: durationPreset === 'manual' ? null : durationPreset,
      manualDueDate: durationPreset === 'manual' ? manualDate : null
    };

    if (onIssueBook) {
      onIssueBook(payload);
    }

    // Set printable confirmation receipt
    setIssuedSlip({
      ...payload,
      dueDate: calculatedDueDate,
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    });

    if (onClearPrefilled) onClearPrefilled();
  };

  // ==================== RETURN / RE-ISSUE DESK STATE ====================
  const [returnInput, setReturnInput] = useState('');
  const [isSearchingReturnSdms, setIsSearchingReturnSdms] = useState(false);
  const [returnSdmsResults, setReturnSdmsResults] = useState([]);
  const [isReturnDropdownOpen, setIsReturnDropdownOpen] = useState(false);
  const [selectedReturnStudent, setSelectedReturnStudent] = useState(null);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const returnSearchDebounceRef = useRef(null);
  const returnDropdownRef = useRef(null);

  // Live SDMS / Barcode search on keystroke
  const handleScanOrSearchReturn = (val) => {
    setReturnInput(val);
    const clean = val.trim();

    if (!clean) {
      setReturnSdmsResults([]);
      setIsSearchingReturnSdms(false);
      setIsReturnDropdownOpen(false);
      return;
    }

    // 1. Check if it matches an active loan barcode or accession immediately
    const matchedLoan = loans.find(l => 
      l.status !== 'Returned' && (
        (l.bookBarcode && l.bookBarcode.toLowerCase() === clean.toLowerCase()) ||
        (l.accession && l.accession.toLowerCase() === clean.toLowerCase())
      )
    );
    if (matchedLoan) {
      setSelectedLoanForReturn(matchedLoan);
      setSelectedReturnStudent({
        name: matchedLoan.patronName,
        pin_no: matchedLoan.patronId,
        department: matchedLoan.department
      });
      setIsReturnDropdownOpen(false);
      return;
    }

    // 2. Otherwise search live SDMS student database
    clearTimeout(returnSearchDebounceRef.current);
    setIsSearchingReturnSdms(true);
    setIsReturnDropdownOpen(true);

    returnSearchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sdms/students?search=${encodeURIComponent(clean)}&limit=8`);
        if (!res.ok) {
          throw new Error(`SDMS status ${res.status}`);
        }
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (Array.isArray(data.students)) {
          setReturnSdmsResults(data.students);
          setIsReturnDropdownOpen(true);
        } else {
          setReturnSdmsResults([]);
        }
      } catch (err) {
        const q = clean.toLowerCase();
        const localMatches = students.filter(s => 
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
          (s.pin_no && s.pin_no.toLowerCase().includes(q))
        );
        setReturnSdmsResults(localMatches);
        setIsReturnDropdownOpen(localMatches.length > 0);
      } finally {
        setIsSearchingReturnSdms(false);
      }
    }, 250);
  };

  const handleSelectReturnStudent = (st) => {
    setSelectedReturnStudent(st);
    setReturnInput(`${st.name} (${st.pin_no || st.rollNo})`);
    setIsReturnDropdownOpen(false);

    // Filter active loans for this student
    const studentLoans = loans.filter(l => 
      l.status !== 'Returned' && (
        (l.patronId && (
          l.patronId.toLowerCase() === String(st.pin_no || '').toLowerCase() || 
          l.patronId.toLowerCase() === String(st.rollNo || '').toLowerCase()
        )) ||
        (l.patronName && l.patronName.toLowerCase() === st.name.toLowerCase())
      )
    );

    if (studentLoans.length === 1) {
      setSelectedLoanForReturn(studentLoans[0]);
    } else if (studentLoans.length === 0) {
      setSelectedLoanForReturn(null);
      if (onToast) onToast(`No active issued books found for ${st.name}.`, 'info');
    } else {
      setSelectedLoanForReturn(null);
    }
  };

  const handleSelectLoanToReturn = (loan) => {
    setSelectedLoanForReturn(loan);
    setSelectedReturnStudent({
      name: loan.patronName,
      pin_no: loan.patronId,
      department: loan.department
    });
  };

  const handleExecuteReturn = (targetLoan = null) => {
    const loan = targetLoan || selectedLoanForReturn;
    if (!loan) {
      if (onToast) onToast('Select or scan a borrowed book to return', 'error');
      return;
    }
    if (onReturnBook) {
      onReturnBook(loan.id);
    }
    setSelectedLoanForReturn(null);
    setSelectedReturnStudent(null);
    setReturnInput('');
  };

  const handleExecuteReissue = (targetLoan = null) => {
    const loan = targetLoan || selectedLoanForReturn;
    if (!loan) {
      if (onToast) onToast('Select an active loan to re-issue', 'error');
      return;
    }

    // Follow Settings Guidelines: Max Renewals Check
    if ((loan.renewalsCount || 0) >= maxRenewals) {
      if (onToast) onToast(`Renewal limit reached (Max ${maxRenewals} renewals allowed for "${loan.bookTitle}"). Please return book to desk.`, 'error');
      return;
    }

    if (onRenewLoan) {
      onRenewLoan(loan.id);
    }
    if (onToast) onToast(`Loan extended by 15 days for "${loan.bookTitle}"!`, 'success');
    setSelectedLoanForReturn(null);
  };

  const isReturnOverdue = selectedLoanForReturn?.status === 'Overdue';
  // Follow Settings Guidelines: Compute fine dynamically with daily_fine_rate
  const overdueDays = (() => {
    if (!selectedLoanForReturn || !isReturnOverdue) return 0;
    const now = new Date();
    const due = new Date(selectedLoanForReturn.dueDate || selectedLoanForReturn.due_date || now);
    return Math.max(1, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
  })();
  const estimatedFine = isReturnOverdue ? overdueDays * dailyFineRate : 0.0;

  // ==================== BULK CIRCULATION UPLOAD STATE ====================
  const [bulkCircData, setBulkCircData] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [isImportingBulkCirc, setIsImportingBulkCirc] = useState(false);
  const circFileInputRef = useRef(null);

  // Helper for spreadsheet date format conversion
  const formatSpreadsheetDate = (raw) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().split('T')[0];
    if (typeof raw === 'number') {
      const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const str = String(raw).trim();
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str;
  };

  // Sample Excel download for circulations
  const handleDownloadCircSampleExcel = () => {
    const sampleData = [
      {
        'AccessionNo': '1001',
        'Barcode': 'BC1001',
        'BookTitle': 'Let Us C',
        'StudentPIN': '246T1A0501',
        'StudentName': 'Damerla Sai Saketh',
        'Department': 'CSE (BTECH)',
        'IssueDate': '2026-10-01',
        'DueDate': '2026-10-31',
        'ReturnDate': '',
        'Status': 'Active'
      },
      {
        'AccessionNo': '1002',
        'Barcode': 'BC1002',
        'BookTitle': 'Data Structures in C++',
        'StudentPIN': '236T1A0412',
        'StudentName': 'K. Rajesh',
        'Department': 'ECE (BTECH)',
        'IssueDate': '2026-09-15',
        'DueDate': '2026-10-15',
        'ReturnDate': '2026-10-14',
        'Status': 'Returned'
      },
      {
        'AccessionNo': '1003',
        'Barcode': 'BC1003',
        'BookTitle': 'Engineering Mechanics',
        'StudentPIN': '246T1A0301',
        'StudentName': 'M. Sai Kumar',
        'Department': 'MECH (BTECH)',
        'IssueDate': '2026-09-01',
        'DueDate': '2026-10-01',
        'ReturnDate': '',
        'Status': 'Overdue'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Circulations_Template');
    XLSX.writeFile(wb, 'circulation_import_sample_template.xlsx');
    if (onToast) onToast('Downloaded circulation sample Excel template', 'info');
  };

  // Handle uploaded spreadsheet file
  const handleCircSpreadsheetFile = (file) => {
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!Array.isArray(rawJson) || rawJson.length === 0) {
          if (onToast) onToast('The uploaded spreadsheet contains no data rows.', 'error');
          return;
        }

        const normalized = rawJson.map((row, idx) => {
          const normRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normRow[cleanKey] = row[key];
          });

          const accession = String(
            normRow['accessionno'] ||
            normRow['accession'] ||
            normRow['accno'] ||
            normRow['acc'] ||
            normRow['barcode'] ||
            normRow['serialno'] ||
            normRow['serialnumber'] ||
            normRow['bookid'] ||
            `ACC-${idx + 1}`
          ).trim();

          const bookTitle = String(
            normRow['booktitle'] ||
            normRow['title'] ||
            normRow['titlename'] ||
            normRow['bookname'] ||
            normRow['book'] ||
            'Library Holding'
          ).trim();

          const patronId = String(
            normRow['studentpin'] ||
            normRow['pinno'] ||
            normRow['pin'] ||
            normRow['rollno'] ||
            normRow['rollnumber'] ||
            normRow['admissionno'] ||
            normRow['patronid'] ||
            normRow['studentid'] ||
            normRow['id'] ||
            'GENERAL'
          ).trim();

          const patronName = String(
            normRow['studentname'] ||
            normRow['name'] ||
            normRow['patronname'] ||
            normRow['borrower'] ||
            normRow['student'] ||
            'SDMS Student'
          ).trim();

          const department = String(
            normRow['department'] ||
            normRow['dept'] ||
            normRow['branch'] ||
            normRow['course'] ||
            normRow['division'] ||
            'General'
          ).trim();

          const issueDate = formatSpreadsheetDate(
            normRow['issuedate'] ||
            normRow['dateofissue'] ||
            normRow['issuedon'] ||
            normRow['date']
          ) || new Date().toISOString().split('T')[0];

          const dueDate = formatSpreadsheetDate(
            normRow['duedate'] ||
            normRow['dateofdue'] ||
            normRow['dueon'] ||
            normRow['expectedreturn']
          ) || (() => {
            const d = new Date();
            d.setDate(d.getDate() + defaultLoanDays);
            return d.toISOString().split('T')[0];
          })();

          const returnDate = formatSpreadsheetDate(
            normRow['returndate'] ||
            normRow['dateofreturn'] ||
            normRow['returnedon']
          );

          const statusRaw = String(normRow['status'] || normRow['loanstatus'] || '').trim().toLowerCase();
          const status = returnDate || statusRaw === 'returned'
            ? 'Returned'
            : statusRaw === 'overdue'
            ? 'Overdue'
            : 'Active';

          return {
            id: `bulk-circ-${Date.now()}-${idx}`,
            accession,
            bookBarcode: accession,
            bookTitle,
            patronId,
            patronName,
            department,
            issueDate,
            dueDate,
            returnDate: returnDate || undefined,
            return_date: returnDate || undefined,
            issueDateFormatted: issueDate,
            dueDateFormatted: dueDate,
            returnDateFormatted: returnDate || null,
            status
          };
        }).filter(item => item.accession || item.patronId || item.bookTitle);

        setBulkCircData(normalized);
        if (onToast) onToast(`Parsed ${normalized.length} circulation records from ${file.name}!`, 'success');
      } catch (err) {
        console.error('Error parsing circulation excel:', err);
        if (onToast) onToast(`Failed to parse spreadsheet: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteBulkCircImport = async () => {
    if (!bulkCircData || bulkCircData.length === 0) return;
    setIsImportingBulkCirc(true);
    try {
      if (onBulkImportCirculations) {
        await onBulkImportCirculations(bulkCircData);
      } else {
        const res = await fetch('/api/circulation/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ circulations: bulkCircData })
        });
        if (!res.ok) throw new Error('Bulk API response failed');
      }
      if (onToast) onToast(`Successfully imported ${bulkCircData.length} circulation records!`, 'success');
      setBulkCircData([]);
      setBulkFileName('');
      setActiveForm(null);
      setLoanStatusFilter('active');
    } catch (err) {
      console.error('Failed to import circulations:', err);
      if (onToast) onToast(`Bulk import failed: ${err.message}`, 'error');
    } finally {
      setIsImportingBulkCirc(false);
    }
  };

  // ==================== STATS CALCULATION ====================
  const totalBooksCount = books.length;
  const totalCopiesCount = books.reduce((sum, b) => sum + getBookTotalCount(b), 0);
  const totalAvailableCopies = books.reduce((sum, b) => sum + getBookAvailableCount(b), 0);

  // Computed Loans categories
  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = loans.filter(l => l.status === 'Overdue');
  const returnedLoans = loans.filter(l => l.status === 'Returned');
  const onScheduleLoans = loans.filter(l => l.status === 'Active' || l.status === 'Borrowed');

  // Filtered active loans for Return Desk list
  const filteredReturnLoans = activeLoans.filter(l => {
    if (!returnInput) return true;
    const q = returnInput.toLowerCase().trim();
    return (
      (l.bookTitle && l.bookTitle.toLowerCase().includes(q)) ||
      (l.patronName && l.patronName.toLowerCase().includes(q)) ||
      (l.patronId && l.patronId.toLowerCase().includes(q)) ||
      (l.accession && l.accession.toLowerCase().includes(q)) ||
      (l.bookBarcode && l.bookBarcode.toLowerCase().includes(q)) ||
      (l.department && l.department.toLowerCase().includes(q))
    );
  });

  // ==================== BOTTOM CIRCULATIONS & HISTORY STATE ====================
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('active'); // 'active' | 'overdue' | 'history' | 'logs'

  // Circulation Activity Logs: Merges auditLogs with all issue & return actions
  const circulationLogs = (() => {
    const fromAudit = (auditLogs || []).filter(log => {
      const key = (log.action_key || log.action || '').toLowerCase();
      const res = (log.target_resource || '').toLowerCase();
      const payloadStr = typeof log.payload === 'string' ? log.payload.toLowerCase() : JSON.stringify(log.payload || {}).toLowerCase();
      return (
        key.includes('circulation') ||
        key.includes('issue') ||
        key.includes('return') ||
        key.includes('renew') ||
        key.includes('loan') ||
        res.includes('loan') ||
        res.includes('circulation') ||
        payloadStr.includes('issue') ||
        payloadStr.includes('return')
      );
    }).map((l, idx) => ({
      id: l.id || l._id || `audit-circ-${idx}`,
      action: (l.action_key || l.action || 'ISSUE BOOK').replace(/_/g, ' ').toUpperCase(),
      bookTitle: l.payload?.book_title || l.payload?.bookTitle || l.bookTitle || 'Library Book',
      accession: l.payload?.accession || l.payload?.barcode || l.accession || 'Holding',
      patronName: l.payload?.patron_name || l.payload?.patronName || l.patronName || 'SDMS Student',
      patronId: l.payload?.patron_id || l.payload?.patronId || l.patronId || 'SDMS',
      actor: l.actor_id || 'System Superadmin',
      timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recorded',
      details: typeof l.payload === 'object' ? JSON.stringify(l.payload) : (l.payload || 'Processed at circulation desk')
    }));

    // Ensure all registered loans have an entry in logs
    const fromLoans = loans.map((ln, idx) => ({
      id: `loan-log-${ln.id || idx}`,
      action: ln.status === 'Returned' ? 'BOOK RETURNED' : 'BOOK ISSUED',
      bookTitle: ln.bookTitle || 'Library Book',
      accession: ln.accession || ln.bookBarcode || 'ACC',
      patronName: ln.patronName || 'Student Borrower',
      patronId: ln.patronId || 'PIN',
      actor: 'Circulation Desk Staff',
      timestamp: ln.status === 'Returned' 
        ? (ln.returnDateFormatted || (ln.returnDate ? new Date(ln.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently Returned'))
        : (ln.issueDateFormatted || ln.issueDate || 'Current Session'),
      details: ln.status === 'Returned'
        ? `Returned on ${ln.returnDateFormatted || (ln.returnDate ? new Date(ln.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Desk')}. Standard lending cycle completed.`
        : `Active loan due on ${ln.dueDateFormatted || ln.dueDate}. Status: ${ln.status}`
    }));

    return [...fromAudit, ...fromLoans];
  })();

  // Filtered circulation logs
  const filteredCirculationLogs = circulationLogs.filter(log => {
    if (!loanSearchTerm) return true;
    const q = loanSearchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.bookTitle && log.bookTitle.toLowerCase().includes(q)) ||
      (log.patronName && log.patronName.toLowerCase().includes(q)) ||
      (log.patronId && log.patronId.toLowerCase().includes(q)) ||
      (log.accession && log.accession.toLowerCase().includes(q)) ||
      (log.actor && log.actor.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  // Filtered loans list (Active, Overdue, or History)
  const filteredLoans = loans.filter(l => {
    if (loanStatusFilter === 'active' && l.status === 'Returned') return false;
    if (loanStatusFilter === 'overdue' && l.status !== 'Overdue') return false;
    if (loanStatusFilter === 'history' && l.status !== 'Returned') return false;

    if (!loanSearchTerm) return true;
    const q = loanSearchTerm.toLowerCase();
    return (
      (l.bookTitle && l.bookTitle.toLowerCase().includes(q)) ||
      (l.patronName && l.patronName.toLowerCase().includes(q)) ||
      (l.patronId && l.patronId.toLowerCase().includes(q)) ||
      (l.accession && l.accession.toLowerCase().includes(q)) ||
      (l.department && l.department.toLowerCase().includes(q)) ||
      (l.status && l.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 select-none">
      {/* 1. Page Header & Desk Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200/90">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Book Issues & Returns
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Database className="w-3 h-3 text-blue-600" />
              SDMS Connected
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Search students from SDMS database by Name or PIN Number to issue, return, or re-issue library books
          </p>
        </div>

        {/* 3 Action Buttons: Open Issue Book, Return Book, and Bulk Excel Upload */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveForm('issue');
              if (!prefilledBook) setSelectedBookBarcode('');
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-white" />
            <span>Issue Book</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveForm('return');
              setSelectedLoanForReturn(null);
              setSelectedReturnStudent(null);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-white" />
            <span>Return Book</span>
            {overdueLoans.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {overdueLoans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveForm('bulk')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Bulk Excel Upload</span>
          </button>
        </div>
      </div>

      {/* 2. Desk Form: Modal Popup Dialog for Issue, Return, and Bulk Upload */}
      {activeForm !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveForm(null);
              if (onClearPrefilled) onClearPrefilled();
            }
          }}
        >
          <div className="bg-white border border-blue-200/90 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-4xl max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 space-y-6">
            {/* Top Form Header with Mode Switcher & Close Button */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Desk Mode:</span>
                <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveForm('issue');
                      if (!prefilledBook) setSelectedBookBarcode('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'issue'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Issue Desk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveForm('return');
                      setSelectedLoanForReturn(null);
                      setSelectedReturnStudent(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'return'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Return Desk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveForm('bulk')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'bulk'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bulk Upload</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveForm(null);
                  if (onClearPrefilled) onClearPrefilled();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-xl flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
                title="Close form and return to overview"
              >
                <X className="w-4 h-4 text-zinc-500" />
                <span>Close Form</span>
              </button>
            </div>

            {/* ============================================================ */}
            {/* 2A. ISSUE DESK MODE */}
            {/* ============================================================ */}
            {activeForm === 'issue' && (
              <div className="space-y-6">
                {issuedSlip ? (
                  <div className="border border-blue-200 bg-blue-50/40 rounded-3xl p-6 sm:p-7 space-y-4 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                      <span className="font-bold text-blue-950 uppercase tracking-wider text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        Issue Confirmation Receipt
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1 text-blue-700 hover:bg-blue-100/80 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                        title="Print Slip"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-slate-700">
                      <div>
                        <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Book Title</div>
                        <div className="font-bold text-base text-blue-950 mt-0.5">{issuedSlip.bookTitle}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Student Name</div>
                          <div className="font-semibold text-sm text-slate-900 mt-0.5">{issuedSlip.patronName}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">PIN / Roll No</div>
                          <div className="font-mono font-bold text-sm text-blue-700 mt-0.5">{issuedSlip.patronId}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Accession / Code</div>
                          <div className="font-mono text-sm text-slate-800 mt-0.5">{issuedSlip.accession}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Due Date</div>
                          <div className="font-bold text-sm text-emerald-700 mt-0.5">{issuedSlip.dueDate}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-blue-200">
                      <button
                        onClick={() => {
                          setIssuedSlip(null);
                          setStudentSearchInput('');
                          setSelectedStudent(null);
                          setSelectedBookBarcode('');
                          setBookSearchInput('');
                        }}
                        className="flex-1 py-2.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Issue Next Book
                      </button>
                      <button
                        onClick={() => {
                          setIssuedSlip(null);
                          setStudentSearchInput('');
                          setSelectedStudent(null);
                          setSelectedBookBarcode('');
                          setBookSearchInput('');
                          setActiveForm(null);
                        }}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-500/25 cursor-pointer"
                      >
                        Done / Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleIssueSubmit} className="space-y-6 text-xs">
                    {/* STEP 1: SDMS STUDENT SEARCH */}
                    <div className="relative space-y-2" ref={issueDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-blue-950 uppercase tracking-wider text-xs">
                          1. Search Student from SDMS Database (By Name or PIN)
                        </label>
                        <span className="text-[11px] text-blue-600 font-medium">Live verified lookup</span>
                      </div>

                      {!selectedStudent ? (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type="text"
                            required
                            value={studentSearchInput}
                            onChange={(e) => handleIssueStudentSearchChange(e.target.value)}
                            onFocus={() => {
                              if (sdmsResults.length > 0) setIsDropdownOpen(true);
                            }}
                            placeholder="Type student PIN (e.g. 246T1A0301) or Name (e.g. Damerla Sai Saketh)..."
                            className="w-full pl-10 pr-10 py-3 border border-blue-200 rounded-2xl text-xs text-slate-900 bg-blue-50/20 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                          />
                          {isSearchingSdms && (
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white border border-blue-200 rounded-2xl text-xs flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-blue-500/30">
                              {selectedStudent.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-blue-950 text-sm flex items-center gap-2">
                                <span>{selectedStudent.name}</span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold">
                                  PIN: {selectedStudent.pin_no || selectedStudent.rollNo}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                {selectedStudent.department} {selectedStudent.year && <span>• {selectedStudent.year}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verified SDMS
                            </span>
                            <button
                              type="button"
                              onClick={handleClearSelectedStudent}
                              className="p-1.5 hover:bg-blue-100/70 rounded-xl text-blue-700 transition-colors cursor-pointer"
                              title="Change Student"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Dropdown for Student Matches */}
                      {isDropdownOpen && sdmsResults.length > 0 && !selectedStudent && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-blue-50 p-1.5">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                            <span>SDMS Database Matches</span>
                            <span className="text-slate-400 font-normal">{sdmsResults.length} found</span>
                          </div>
                          {sdmsResults.map(st => (
                            <div
                              key={st.id || st.pin_no || st.rollNo}
                              onClick={() => handleSelectStudent(st)}
                              className="p-2.5 hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="overflow-hidden">
                                <div className="font-bold text-blue-950 truncate">{st.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                  <span className="text-blue-600 font-bold">{st.pin_no || st.rollNo}</span>
                                  <span>•</span>
                                  <span className="truncate">{st.department}</span>
                                  {st.year && <span>• {st.year}</span>}
                                </div>
                              </div>
                              <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition-colors shrink-0">
                                Select Student
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* STEP 2: SEARCH & SELECT BOOK (NOT SELECTED BY DEFAULT) */}
                    <div className="relative space-y-2" ref={bookDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-blue-950 uppercase tracking-wider text-xs">
                          2. Search & Select Book from Shelf
                        </label>
                        <span className="text-[11px] text-blue-600 font-medium">Search by Title, Accession, or Barcode</span>
                      </div>

                      {!selectedBook ? (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type="text"
                            required={!selectedBookBarcode}
                            value={bookSearchInput}
                            onChange={(e) => {
                              setBookSearchInput(e.target.value);
                              setIsBookDropdownOpen(true);
                            }}
                            onFocus={() => setIsBookDropdownOpen(true)}
                            placeholder="Type book title (e.g. Let us c, Have Fun) or accession number (e.g. 1, 1121)..."
                            className="w-full pl-10 pr-10 py-3 border border-blue-200 rounded-2xl text-xs text-slate-900 bg-blue-50/20 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white border border-blue-200 rounded-2xl text-xs flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-blue-500/30">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-blue-950 text-sm flex items-center gap-2">
                                <span>{selectedBook.title}</span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold">
                                  Accession: #{selectedBook.accession}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2">
                                <span>Author: <strong>{selectedBook.author}</strong></span>
                                <span>•</span>
                                <span>Shelf: <strong>{selectedBook.shelf}</strong></span>
                                {selectedBook.barcode && <span>• Barcode: <code className="font-mono">{selectedBook.barcode}</code></span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border shrink-0 ${
                              selectedBookStock > 0 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {selectedBookStock > 0 ? `${selectedBookStock} Copies Available` : '0 Copies Available (Out of Stock)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBookBarcode('');
                                setBookSearchInput('');
                                setIsBookDropdownOpen(true);
                              }}
                              className="p-1.5 hover:bg-blue-100/70 rounded-xl text-blue-700 transition-colors cursor-pointer"
                              title="Change Book"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Dropdown for Book Matches */}
                      {isBookDropdownOpen && !selectedBook && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-blue-50 p-1.5">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Available Books on Shelf ({filteredAvailableBooks.length})</span>
                            <span className="text-slate-400 font-normal">Click to select</span>
                          </div>
                          {filteredAvailableBooks.length > 0 ? (
                            filteredAvailableBooks.map(b => {
                              const availCount = getBookAvailableCount(b);
                              return (
                                <div
                                  key={b.barcode || b.id || b.accession}
                                  onClick={() => {
                                    setSelectedBookBarcode(b.barcode || b.accession);
                                    setBookSearchInput('');
                                    setIsBookDropdownOpen(false);
                                  }}
                                  className="p-2.5 hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="overflow-hidden">
                                    <div className="font-bold text-blue-950 flex items-center gap-2 truncate">
                                      <span>{b.title}</span>
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                                        #{b.accession}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                                      <span>Author: {b.author}</span>
                                      <span>•</span>
                                      <span>Shelf: {b.shelf}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {availCount} In Stock
                                    </span>
                                    <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition-colors">
                                      Select Book
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No available books matching "{bookSearchInput}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* STEP 3: BORROWING WINDOW - FOLLOWS SETTINGS GUIDELINES */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-blue-950 uppercase tracking-wider text-xs">
                          3. Borrowing Window (Follows Settings Policy)
                        </label>
                        <span className="text-[11px] text-blue-600 font-medium">
                          Policy default: {defaultLoanDays} Days
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {durationPresets.map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setDurationPreset(days)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              durationPreset === days
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                                : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                            }`}
                          >
                            {days} Days {days === defaultLoanDays && '(Standard - Settings Policy)'}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDurationPreset('manual')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            durationPreset === 'manual'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                              : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                          }`}
                        >
                          Custom Date
                        </button>
                      </div>

                      {durationPreset === 'manual' && (
                        <div className="mt-2.5">
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="px-3.5 py-2 border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      )}

                      <div className="mt-2 text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>Calculated Due Date:</span>
                          <strong className="text-blue-700 font-bold bg-blue-100 px-2.5 py-0.5 rounded-lg font-mono">
                            {calculatedDueDate}
                          </strong>
                        </div>
                        <span className="text-[11px] text-blue-600">
                          Quota limit: {maxBooksQuota} books/student • Max renewals: {maxRenewals}
                        </span>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="pt-4 border-t border-blue-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-blue-800/80">
                        Overdue fine tariff: ₹{dailyFineRate.toFixed(2)}/day (as configured in Settings)
                      </span>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveForm(null)}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!selectedBook || selectedBookStock <= 0 || !selectedStudent || selectedStudent?.status === 'Frozen'}
                          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/25 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Issue Book to Student</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* 2B. RETURN & RE-ISSUE DESK MODE (SEARCH TOP & ISSUED ROWS BOTTOM) */}
            {/* ============================================================ */}
            {activeForm === 'return' && (
              <div className="space-y-6">
                {/* 1. TOP: FULL-WIDTH SCAN & SEARCH OPTION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-blue-950 uppercase tracking-wider text-xs">
                      Scan Barcode / Accession # or Search Student by PIN / Name from SDMS
                    </label>
                    <span className="text-[11px] text-blue-600 font-medium">
                      Instant live scan & student filter
                    </span>
                  </div>

                  <div className="relative" ref={returnDropdownRef}>
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input
                      type="text"
                      value={returnInput}
                      onChange={(e) => handleScanOrSearchReturn(e.target.value)}
                      onFocus={() => {
                        if (returnSdmsResults.length > 0) setIsReturnDropdownOpen(true);
                      }}
                      placeholder="Scan book barcode / accession #, or type student PIN (e.g. 246T1A0501) / Name (e.g. Manoj)..."
                      className="w-full pl-10 pr-10 py-3 border border-blue-200 rounded-2xl text-xs text-slate-900 bg-blue-50/20 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-medium"
                    />
                    {isSearchingReturnSdms && (
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}

                    {/* Return Desk SDMS Student Matches Dropdown */}
                    {isReturnDropdownOpen && returnSdmsResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-blue-50 p-1">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center justify-between">
                          <span>SDMS Database Matches</span>
                          <span className="text-zinc-400 font-normal">{returnSdmsResults.length} found</span>
                        </div>
                        {returnSdmsResults.map(st => {
                          const studentLoanCount = activeLoans.filter(l => 
                            (l.patronId && (
                              l.patronId.toLowerCase() === String(st.pin_no || '').toLowerCase() || 
                              l.patronId.toLowerCase() === String(st.rollNo || '').toLowerCase()
                            )) ||
                            (l.patronName && l.patronName.toLowerCase() === st.name.toLowerCase())
                          ).length;

                          return (
                            <div
                              key={st.id || st.pin_no || st.rollNo}
                              onClick={() => handleSelectReturnStudent(st)}
                              className="p-2.5 hover:bg-blue-50/70 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="overflow-hidden">
                                <div className="font-bold text-zinc-900 truncate">{st.name}</div>
                                <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                                  <span className="text-blue-600 font-semibold">{st.pin_no || st.rollNo}</span>
                                  <span>•</span>
                                  <span className="truncate">{st.department}</span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${
                                studentLoanCount > 0 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                              }`}>
                                {studentLoanCount} Active Loan{studentLoanCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Return Student Badge */}
                  {selectedReturnStudent && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          {selectedReturnStudent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                            <span>{selectedReturnStudent.name}</span>
                            <span className="font-mono text-blue-700 text-[10px] font-semibold">
                              (PIN: {selectedReturnStudent.pin_no || selectedReturnStudent.rollNo})
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500">{selectedReturnStudent.department}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReturnStudent(null);
                          setSelectedLoanForReturn(null);
                          setReturnInput('');
                        }}
                        className="text-xs text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}

                  {/* Scanned Loan Check-in Card (Shown when a specific loan is scanned or clicked) */}
                  {selectedLoanForReturn && (
                    <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-xs text-blue-950 uppercase tracking-wider">
                            Ready to Check In Book
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          isReturnOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {selectedLoanForReturn.status}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Book Title</span>
                          <span className="font-bold text-sm text-zinc-900 block mt-0.5">{selectedLoanForReturn.bookTitle}</span>
                          <span className="font-mono text-[11px] text-blue-700 font-semibold mt-0.5 block">
                            Accession: #{selectedLoanForReturn.accession || selectedLoanForReturn.bookBarcode}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Borrower</span>
                          <span className="font-bold text-sm text-zinc-900 block mt-0.5">{selectedLoanForReturn.patronName}</span>
                          <span className="font-mono text-[11px] text-blue-700 font-semibold mt-0.5 block">
                            PIN: {selectedLoanForReturn.patronId} • {selectedLoanForReturn.department || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100 text-xs">
                        <div>
                          <span className="text-zinc-500">Issue Date:</span>
                          <strong className="text-zinc-800 ml-1.5 font-mono">{selectedLoanForReturn.issueDateFormatted || selectedLoanForReturn.issueDate || 'Standard'}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500">Expected Due Date:</span>
                          <strong className={`ml-1.5 font-mono ${isReturnOverdue ? 'text-rose-600 font-bold' : 'text-zinc-800'}`}>
                            {selectedLoanForReturn.dueDateFormatted || selectedLoanForReturn.dueDate}
                          </strong>
                        </div>
                      </div>

                      {/* Overdue Penalty Assessment Box */}
                      {isReturnOverdue && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Overdue Penalty Assessed: ₹{estimatedFine.toFixed(2)}</span>
                          </div>
                          <div className="text-[11px] text-rose-700">
                            Book passed due date by {overdueDays} day(s) (@ ₹{dailyFineRate.toFixed(2)}/day policy). Settle at desk via Cash or UPI QR.
                          </div>
                          <div className="flex items-center gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenUpiModal) {
                                  onOpenUpiModal({
                                    id: `fine-${selectedLoanForReturn.id}`,
                                    amount: estimatedFine,
                                    patronName: selectedLoanForReturn.patronName,
                                    patronId: selectedLoanForReturn.patronId,
                                    bookTitle: selectedLoanForReturn.bookTitle
                                  });
                                }
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Collect UPI QR
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onCollectCash) onCollectCash(selectedLoanForReturn.id);
                                handleExecuteReturn();
                              }}
                              className="px-3 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Accept Cash & Return
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons for Scanned Loan */}
                      <div className="pt-3 border-t border-blue-200 flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLoanForReturn(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-800 underline font-medium cursor-pointer"
                        >
                          Clear Selection
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteReissue()}
                            className="px-3.5 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                            <span>Re-issue (+15d)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteReturn()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Return to Shelf</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. BOTTOM: LIST OF ISSUED ROWS (ACTIVE LOANS READY TO RETURN) */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-blue-950 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Currently Issued Books Ready to Return ({filteredReturnLoans.length})</span>
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      Click any row to inspect or click Return to check in immediately
                    </span>
                  </div>

                  {filteredReturnLoans.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                      {activeLoans.length === 0 
                        ? "Zero circulating loans currently. All physical copies are resting on catalog shelves."
                        : `No active loans match your search term "${returnInput}".`}
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Book Title & Accession</th>
                            <th className="py-2.5 px-3">Borrower (SDMS PIN)</th>
                            <th className="py-2.5 px-3">Issue Date</th>
                            <th className="py-2.5 px-3">Expected Due Date</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Desk Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredReturnLoans.map(loan => {
                            const isOverdue = loan.status === 'Overdue';
                            const isSelected = selectedLoanForReturn?.id === loan.id;
                            return (
                              <tr 
                                key={loan.id} 
                                onClick={() => handleSelectLoanToReturn(loan)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-100/70 ring-1 ring-blue-500/30' : 'hover:bg-blue-50/50'
                                }`}
                              >
                                <td className="py-3 px-3">
                                  <div className="font-bold text-zinc-900">{loan.bookTitle}</div>
                                  <span className="font-mono text-[10px] text-zinc-500 font-medium">
                                    Acc: {loan.accession || loan.bookBarcode}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-zinc-900">{loan.patronName}</div>
                                  <span className="font-mono text-[11px] text-blue-700 font-bold">
                                    PIN: {loan.patronId}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                                  {loan.issueDateFormatted || loan.issueDate || 'Standard'}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px]">
                                  <span className={isOverdue ? 'font-bold text-rose-600' : 'font-semibold text-zinc-800'}>
                                    {loan.dueDateFormatted || loan.dueDate}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isOverdue 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {loan.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteReturn(loan)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                      title="Check in this book"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Return</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteReissue(loan)}
                                      className="px-2.5 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                      title="Extend by 15 days"
                                    >
                                      <RefreshCw className="w-3 h-3 text-blue-600" />
                                      <span>Re-issue</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 2C. BULK CIRCULATION EXCEL / CSV IMPORT DESK */}
            {/* ============================================================ */}
            {activeForm === 'bulk' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Bulk Upload Issues & Returns Spreadsheet</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Import batch circulation records with Accession #, Book Title, Student PIN, Issue & Due Dates
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCircSampleExcel}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Download template spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Excel</span>
                  </button>
                </div>

                {/* Upload Dropzone */}
                {!bulkCircData || bulkCircData.length === 0 ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleCircSpreadsheetFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
                    onClick={() => circFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={circFileInputRef}
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCircSpreadsheetFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-800">
                        Click to upload or drag & drop circulation spreadsheet
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Supports Excel (.xlsx, .xls) and CSV files. Large payloads up to 100MB supported.
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-700">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Headers: AccessionNo, BookTitle, StudentPIN, StudentName, IssueDate, DueDate, ReturnDate, Status</span>
                    </div>
                  </div>
                ) : (
                  /* Parsed Circulation Rows Preview & Import Confirmation */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {bulkCircData.length}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-emerald-950">
                            {bulkFileName || 'Spreadsheet'} Ready to Import
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Successfully parsed {bulkCircData.length} circulation records. Review and confirm below.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkCircData([]);
                          setBulkFileName('');
                        }}
                        className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl hover:bg-white transition-colors cursor-pointer"
                      >
                        Clear & Choose Another File
                      </button>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Accession / Barcode</th>
                            <th className="py-2.5 px-3">Book Title</th>
                            <th className="py-2.5 px-3">Student PIN & Name</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Issue Date</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3">Return Date</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {bulkCircData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="py-2 px-3 text-zinc-400 font-mono text-[10px]">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono font-bold text-blue-700">{row.accession || row.bookBarcode || '—'}</td>
                              <td className="py-2 px-3 font-semibold text-zinc-900">{row.bookTitle || 'Untitled Book'}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-zinc-800">{row.patronName}</span>
                                <span className="font-mono text-blue-600 ml-1.5 font-semibold">({row.patronId})</span>
                              </td>
                              <td className="py-2 px-3 text-zinc-600">{row.department || 'General'}</td>
                              <td className="py-2 px-3 text-zinc-600">{row.issueDateFormatted || row.issueDate}</td>
                              <td className="py-2 px-3 font-semibold text-zinc-900">{row.dueDateFormatted || row.dueDate}</td>
                              <td className="py-2 px-3 text-emerald-800 font-medium">{row.returnDateFormatted || row.returnDate || '—'}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status === 'Returned'
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : row.status === 'Overdue'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                      <span className="text-xs text-zinc-500">
                        Total <strong>{bulkCircData.length}</strong> circulation items will be saved to live database.
                      </span>
                      <button
                        type="button"
                        disabled={isImportingBulkCirc}
                        onClick={handleExecuteBulkCircImport}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isImportingBulkCirc ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Importing Records...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Confirm & Import All Records ({bulkCircData.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. BOTTOM SECTION: ALL ISSUED DATA WITH STATS */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-4 border-t border-zinc-200/90">
        {/* 5 Stats Cards: All Books, Available Books, Issued Books, Overdue, and History */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: All Books */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">All Books (Catalog)</div>
            <div className="text-2xl font-black text-blue-950 mt-1">{totalBooksCount} <span className="text-xs font-semibold text-slate-500">Titles</span></div>
            <div className="text-[10px] text-blue-600/80 font-medium mt-0.5">{totalCopiesCount} total copies registered</div>
          </div>

          {/* Card 2: Available Books */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Available Books</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{totalAvailableCopies} <span className="text-xs font-semibold text-slate-500">Copies</span></div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready on shelf for checkout</div>
          </div>

          {/* Card 3: Issued Books (Active) */}
          <div 
            onClick={() => setLoanStatusFilter('active')}
            className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
              loanStatusFilter === 'active'
                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white border-blue-200/80 hover:border-blue-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Issued Books (Active)</div>
            <div className="text-2xl font-black text-zinc-900 mt-1">{activeLoans.length} <span className="text-xs font-semibold text-slate-500">Loans</span></div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Currently with student borrowers</div>
          </div>

          {/* Card 4: Overdue Defaults */}
          <div 
            onClick={() => setLoanStatusFilter('overdue')}
            className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
              loanStatusFilter === 'overdue'
                ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20'
                : 'bg-white border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue Defaults</div>
            <div className="text-2xl font-black text-rose-700 mt-1">{overdueLoans.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Accounts on penalty tariff</div>
          </div>

          {/* Card 5: Circulation History */}
          <div 
            onClick={() => setLoanStatusFilter('history')}
            className={`cursor-pointer transition-all border rounded-2xl p-4 shadow-xs ${
              loanStatusFilter === 'history' 
                ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-500/20' 
                : 'bg-white border-teal-200/80 hover:border-teal-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider flex items-center justify-between">
              <span>Circulation History</span>
              <span className="text-[10px] text-teal-600 font-normal">View →</span>
            </div>
            <div className="text-2xl font-black text-teal-800 mt-1">{returnedLoans.length}</div>
            <div className="text-[10px] text-teal-600 mt-0.5">Completed & returned records</div>
          </div>
        </div>

        {/* Search & Filter Toolbar: Active, Overdue, History, and Logs */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={loanSearchTerm}
                onChange={(e) => setLoanSearchTerm(e.target.value)}
                placeholder={loanStatusFilter === 'logs' ? "Search activity logs by action, book, student PIN, actor..." : "Search by student name, PIN, book title, accession, or status..."}
                className="w-full pl-10 pr-3.5 py-2 text-xs border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Clean filter buttons: Active Loans, Overdue, Circulation History, and Issue/Return Logs */}
            <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 text-xs bg-zinc-50 flex-wrap">
              <button
                type="button"
                onClick={() => setLoanStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'active' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Loans ({activeLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'overdue' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Overdue ({overdueLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'history' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Circulation History ({returnedLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('logs')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  loanStatusFilter === 'logs' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Issue & Return Logs ({circulationLogs.length})</span>
              </button>
            </div>
          </div>

          {/* Table: If 'logs' is selected, render Activity Logs; else render Loans */}
          {loanStatusFilter === 'logs' ? (
            filteredCirculationLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400 border-t border-zinc-100">
                Zero circulation activity logs match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Action Type</th>
                      <th className="py-3 px-3">Book & Accession</th>
                      <th className="py-3 px-3">Borrower (SDMS PIN)</th>
                      <th className="py-3 px-3">Actor / Staff</th>
                      <th className="py-3 px-3">Operational Status & Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCirculationLogs.map((log, idx) => {
                      const isReturn = log.action.includes('RETURN');
                      const isBulk = log.action.includes('BULK');
                      const isRenew = log.action.includes('RENEW');
                      return (
                        <tr key={log.id || idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              isBulk 
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : isReturn 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : isRenew 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{log.bookTitle}</div>
                            <span className="font-mono text-[10px] text-zinc-500 font-medium">
                              Acc: {log.accession}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{log.patronName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-blue-700 font-bold">
                                PIN: {log.patronId}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-zinc-600 font-medium">
                            {log.actor}
                          </td>
                          <td className="py-3.5 px-3 text-zinc-600 max-w-xs truncate">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredLoans.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400 border-t border-zinc-100">
                No circulation records match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <th className="py-3 px-3">Book Title & Accession</th>
                      <th className="py-3 px-3">Student Name & SDMS PIN</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Issue Date</th>
                      <th className="py-3 px-3">Expected Due Date</th>
                      <th className="py-3 px-3">Actual Return Date</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredLoans.map(loan => {
                      const isOverdue = loan.status === 'Overdue';
                      const isReturned = loan.status === 'Returned';
                      const actualReturnFormatted = loan.returnDateFormatted || (loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

                      return (
                        <tr key={loan.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{loan.bookTitle}</div>
                            <span className="font-mono text-[10px] text-zinc-500 font-medium">
                              Acc: {loan.accession || loan.bookBarcode}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{loan.patronName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-blue-700 font-bold">
                                PIN: {loan.patronId}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[9px] bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                                SDMS
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-zinc-600">
                            {loan.department || 'General'}
                          </td>

                          {/* 1. ISSUE DATE */}
                          <td className="py-3.5 px-3 text-zinc-600 font-mono text-[11px]">
                            {loan.issueDateFormatted || loan.issueDate || 'Standard'}
                          </td>

                          {/* 2. EXPECTED DUE DATE */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-zinc-900 font-mono text-[11px]">
                              {loan.dueDateFormatted || loan.dueDate}
                            </div>
                            {isOverdue && !isReturned ? (
                              <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Penalty Accruing</span>
                            ) : !isReturned ? (
                              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Active Loan Window</span>
                            ) : null}
                          </td>

                          {/* 3. ACTUAL RETURN DATE (DISTINCT COLUMN) */}
                          <td className="py-3.5 px-3">
                            {isReturned ? (
                              <div>
                                <div className="font-bold text-emerald-800 flex items-center gap-1 font-mono text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{actualReturnFormatted || 'Returned'}</span>
                                </div>
                                <span className="text-[10px] text-teal-700 font-medium block mt-0.5">
                                  Reshelved in Catalog
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 font-mono text-[11px] italic">
                                — (Currently Issued)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isReturned
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {loan.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isReturned ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                                  <Check className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Returned & Reshelved</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteReturn(loan)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Process book return"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Return</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExecuteReissue(loan)}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                                    title="Re-issue / Extend loan window by 15 days"
                                  >
                                    <RefreshCw className="w-3 h-3 text-blue-600" />
                                    <span>Re-issue</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
