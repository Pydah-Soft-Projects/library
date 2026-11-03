import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { 
  ArrowLeftRight, Calendar, Clock, AlertTriangle,
  CheckCircle2, Search, Printer, Check, X, RefreshCw, 
  BookOpen, Layers, ShieldCheck, Database, Sparkles, ChevronRight, UserCheck,
  FileSpreadsheet, UploadCloud, Download, AlertCircle, ListFilter
} from 'lucide-react';
import * as XLSX from 'xlsx';

const isActiveLoan = loan =>
  Boolean(loan) &&
  String(loan.status || '').trim().toLowerCase() !== 'returned' &&
  !(loan.return_date || loan.returnDate || loan.returned_at || loan.returnedAt || loan.returned_date);

const normalizePatronId = (value, patronType) => {
  const id = String(value ?? '').trim().toLowerCase();
  return patronType === 'faculty' && /^\d+$/.test(id) ? id.replace(/^0+(?=\d)/, '') : id;
};

const getPatronType = patron => {
  const type = String(patron?.patronType || patron?.patron_type || patron?.memberType || '').trim().toLowerCase();
  if (type === 'faculty' || type === 'student') return type;
  const patronId = String(patron?.patronId || patron?.patron_id || patron?.emp_no || patron?.pin_no || '').trim();
  return /^\d+$/.test(patronId) ? 'faculty' : 'student';
};

const rankPatronResults = (results, query, patronType) => {
  const search = String(query || '').trim().toLowerCase();
  if (!search) return results;
  const normalizedSearch = normalizePatronId(search, patronType);
  const getRank = patron => {
    const name = String(patron.name || patron.employee_name || patron.student_name || '').trim().toLowerCase();
    const id = normalizePatronId(
      patronType === 'faculty'
        ? patron.emp_no
        : patron.pin_no || patron.rollNo || patron.roll_number || patron.admission_number,
      patronType
    );
    if (name === search || id === normalizedSearch) return 0;
    if (id.startsWith(normalizedSearch)) return 1;
    if (name.startsWith(search)) return 2;
    if (name.split(/\s+/).some(part => part.startsWith(search))) return 3;
    if (name.includes(search) || id.includes(normalizedSearch)) return 4;
    return 5;
  };
  return results
    .map((result, index) => ({ result, index, rank: getRank(result) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.result);
};

// Images are loaded from their source directory so search responses stay lightweight.
function PatronPhoto({ student, size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);
  const isFaculty = student?.patronType === 'faculty' || student?.memberType === 'faculty';
  const patronId = student?.emp_no || student?.patronId || student?.pin_no || student?.rollNo;
  const directoryPhotoUrl = isFaculty
    ? (student?.has_photo && patronId ? `/api/hrms/employees/${encodeURIComponent(patronId)}/photo` : null)
    : (student?.has_photo && patronId ? `/api/sdms/students/${encodeURIComponent(patronId)}/photo` : null);
  const rawPhoto = student?.photo || student?.student_photo || student?.employee_photo ||
    student?.employee_image || student?.profile_photo || student?.profile_image ||
    student?.image || student?.photo_url || student?.image_url || student?.avatar;
  const photoUrl = rawPhoto || directoryPhotoUrl;
  const resolvedPhotoUrl = typeof photoUrl === 'string' && photoUrl && !/^(data:|https?:\/\/|\/)/i.test(photoUrl)
    ? `data:image/jpeg;base64,${photoUrl}`
    : photoUrl;
  const initial = student?.name 
    ? student.name.charAt(0).toUpperCase() 
    : (student?.student_name ? student.student_name.charAt(0).toUpperCase() : 'U');

  useEffect(() => {
    setHasError(false);
  }, [patronId, photoUrl]);

  let defaultDim = 'w-12 h-12 rounded-xl text-base';
  if (size === 'sm') {
    defaultDim = 'w-9 h-9 rounded-xl text-xs';
  } else if (size === 'md') {
    defaultDim = 'w-14 h-14 rounded-xl text-lg';
  } else if (size === 'lg') {
    defaultDim = 'w-16 h-20 rounded-2xl text-xl';
  } else if (size === 'card' || size === 'xl') {
    defaultDim = 'w-20 h-24 rounded-2xl text-2xl';
  }

  const dim = className || defaultDim;

  if (resolvedPhotoUrl && !hasError) {
    return (
      <img
        src={resolvedPhotoUrl}
        alt={student?.name || student?.employee_name || 'Patron'}
        onError={() => setHasError(true)}
        className={`${dim} object-cover border-2 border-blue-300/90 shrink-0 shadow-md bg-blue-50  transition-transform`}
      />
    );
  }

  return (
    <div className={`${dim} bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 border border-blue-300`}>
      {initial}
    </div>
  );
}

export default function BookIssuesReturnsView({
  books = [],
  loans = [],
  students = [],
  auditLogs = [],
  systemSettings = {},
  onBulkImportCirculations,
  onIssueBook,
  onReturnBook,
  onManualReturnBook,
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

  // Prevent duplicate double-issue clicks
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

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

  // Helper to extract clean single book number (e.g. "1" from "1 - 3")
  const getSingleBookNumber = (val) => {
    if (!val) return '1';
    const str = String(val).trim();
    if (str.includes('-')) {
      return str.split('-')[0].trim();
    }
    return str;
  };

  const normalizeCatalogCode = value => String(value ?? '').replace(/[\s\-_]/g, '').toLowerCase();
  const getCatalogShelfForLoan = loan => {
    const identifiers = [loan.accession, loan.bookBarcode, loan.bookTitleId]
      .map(normalizeCatalogCode)
      .filter(Boolean);
    if (identifiers.length === 0) return '';

    const catalogBook = books.find(book => {
      const bookIdentifiers = [book.accession, book.barcode, book.titleId, book.title_id]
        .map(normalizeCatalogCode);
      const copyIdentifiers = Array.isArray(book.copies_detail)
        ? book.copies_detail.flatMap(copy => [copy.accession, copy.barcode, copy.serial_no]).map(normalizeCatalogCode)
        : [];
      return [...bookIdentifiers, ...copyIdentifiers].some(code => identifiers.includes(code));
    });
    return catalogBook
      ? catalogBook.shelf || catalogBook.shelf_location || 'Central Stack'
      : '';
  };

  // Inspection Popup Modal for Clicked Circulation Rows
  const [inspectingLoan, setInspectingLoan] = useState(null);
  const [inspectingStudent, setInspectingStudent] = useState(null);
  const [isFetchingInspectingStudent, setIsFetchingInspectingStudent] = useState(false);
  const inspectSearchAbortRef = useRef(null);
  useEffect(() => () => inspectSearchAbortRef.current?.abort(), []);

  const handleInspectLoan = (loan) => {
    if (!loan) return;
    inspectSearchAbortRef.current?.abort();
    setInspectingLoan(loan);
    setInspectingStudent(null);

    const patronId = loan.patronId || loan.patron_id;
    if (patronId) {
      const isFaculty = loan.patronType === 'faculty';
      const controller = new AbortController();
      inspectSearchAbortRef.current = controller;
      setIsFetchingInspectingStudent(true);
      fetch(isFaculty
        ? `/api/hrms/employees/${encodeURIComponent(patronId)}`
        : `/api/sdms/students/${encodeURIComponent(patronId)}`,
      { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const patron = isFaculty ? data.employee : data.student;
          if (patron && !controller.signal.aborted) {
            setInspectingStudent({
              ...patron,
              patronType: isFaculty ? 'faculty' : 'student'
            });
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Borrower profile lookup failed:', err);
        })
        .finally(() => {
          if (inspectSearchAbortRef.current === controller) setIsFetchingInspectingStudent(false);
        });
    } else {
      setInspectingStudent({
        name: loan.patronName,
        emp_no: patronId,
        patronType: loan.patronType || 'student',
        has_photo: loan.patronType === 'faculty'
      });
      setIsFetchingInspectingStudent(false);
    }
  };

  // Helper to accurately format returned date
  const getFormattedReturnDate = (loan) => {
    if (!loan) return null;
    if (loan.returnDateFormatted) return loan.returnDateFormatted;
    if (loan.return_date_formatted) return loan.return_date_formatted;
    const rawDate = loan.returnDate || loan.return_date || loan.returnedAt || loan.returned_date || (loan.status === 'Returned' ? (loan.updated_at || loan.updatedAt) : null);
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch {}
    }
    if (loan.status === 'Returned') {
      return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return null;
  };

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
  const availableBooks = useMemo(
    () => books.filter(b => getBookAvailableCount(b) > 0),
    [books]
  );
  
  // Selected Books to Issue (Multiple Books Supported)
  const [selectedBooks, setSelectedBooks] = useState(() => {
    return prefilledBook?.selectedCopy ? [prefilledBook] : [];
  });

  // ==================== BOOK NUMBER & TITLE SEARCH FOR ISSUE DESK ====================
  const [bookSearchInput, setBookSearchInput] = useState('');
  const deferredBookSearchInput = useDeferredValue(bookSearchInput);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const bookDropdownRef = useRef(null);

  useEffect(() => {
    if (!prefilledBook) return;
    if (prefilledBook.selectedCopy) {
      setSelectedBooks([prefilledBook]);
      setBookSearchInput('');
    } else {
      setSelectedBooks([]);
      setBookSearchInput(String(prefilledBook.accession || prefilledBook.barcode || ''));
      setIsBookDropdownOpen(true);
    }
    setActiveForm('issue');
  }, [prefilledBook]);

  const filteredAvailableBooks = useMemo(() => {
    const query = deferredBookSearchInput.trim().toLowerCase().replace(/^#/, '').replace(/[\s\-_]/g, '');
    if (!query) return [];

    const normalize = value => String(value || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    const results = [];

    availableBooks.forEach(book => {
      const availableCount = getBookAvailableCount(book);
      const totalCount = getBookTotalCount(book);
      let copies = Array.isArray(book.copies_detail) ? book.copies_detail.slice(0, totalCount) : [];

      if (copies.length === 0) {
        const range = String(book.accession || '').match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
        const firstNumber = range ? Number(range[1]) : Number(book.accession);
        const lastNumber = range ? Number(range[2]) : firstNumber + totalCount - 1;
        if (Number.isFinite(firstNumber) && lastNumber >= firstNumber && lastNumber - firstNumber < 10000) {
          copies = Array.from({ length: Math.min(totalCount, lastNumber - firstNumber + 1) }, (_, index) => ({
            copy_number: index + 1,
            accession: String(firstNumber + index),
            barcode: '',
            serial_no: '',
            status: index < availableCount ? 'Available' : 'Issued'
          }));
        } else if (totalCount === 1 && book.accession) {
          copies = [{ accession: String(book.accession), barcode: book.barcode || '', status: 'Available' }];
        }
      }

      let availableSeen = 0;
      copies.forEach((copy, index) => {
        const isAvailable = !copy.status || String(copy.status).toLowerCase() === 'available';
        if (!isAvailable || availableSeen >= availableCount) return;
        availableSeen += 1;

        const number = String(copy.accession || copy.copy_number || '');
        const identifiers = [number, copy.barcode, copy.serial_no]
          .map(normalize)
          .filter(Boolean);
        const rank = identifiers.reduce((best, identifier) => {
          if (identifier === query) return Math.min(best, 0);
          if (identifier.startsWith(query)) return Math.min(best, 1);
          if (identifier.includes(query)) return Math.min(best, 2);
          return best;
        }, Number.POSITIVE_INFINITY);
        if (!Number.isFinite(rank)) return;

        const selectedCopy = {
          ...copy,
          copy_number: copy.copy_number || index + 1,
          accession: copy.accession || number,
          barcode: copy.barcode || copy.accession || number
        };
        results.push({
          ...book,
          accession: selectedCopy.accession,
          barcode: selectedCopy.barcode,
          selectedCopy,
          matchRank: rank
        });
      });
    });

    return results.sort((a, b) =>
      a.matchRank - b.matchRank ||
      String(a.selectedCopy.accession).localeCompare(String(b.selectedCopy.accession), undefined, { numeric: true })
    );
  }, [availableBooks, deferredBookSearchInput]);

  const handleAddBookToIssue = (book) => {
    if (!book) return;
    const copyNumber = String(book.selectedCopy?.accession || book.accession || '');
    const alreadySelected = selectedBooks.some(selected =>
      String(selected.selectedCopy?.accession || selected.accession || '') === copyNumber
    );
    if (!copyNumber || alreadySelected) {
      if (onToast) onToast('Select a unique, available book number to issue.', 'warning');
      return;
    }

    if (selectedBooks.length >= maxBooksQuota) {
      if (onToast) onToast(`Borrowing limit reached: You can issue at most ${maxBooksQuota} books per transaction.`, 'warning');
      return;
    }

    setSelectedBooks(prev => [...prev, { ...book, accession: copyNumber, selectedCopy: book.selectedCopy }]);
    setBookSearchInput('');
    setIsBookDropdownOpen(false);
  };

  const handleRemoveBookFromIssue = (indexToRemove) => {
    setSelectedBooks(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ==================== SDMS / HRMS PATRON SEARCH FOR ISSUE DESK ====================
  const [memberType, setMemberType] = useState('student');
  const [patronSearchInput, setPatronSearchInput] = useState('');
  const [directoryResults, setDirectoryResults] = useState([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);
  const [directorySearchError, setDirectorySearchError] = useState('');
  const [selectedPatron, setSelectedPatron] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const issueSearchDebounceRef = useRef(null);
  const issueSearchAbortRef = useRef(null);
  const issueDropdownRef = useRef(null);
  const rankedDirectoryResults = useMemo(
    () => rankPatronResults(directoryResults, patronSearchInput, memberType),
    [directoryResults, patronSearchInput, memberType]
  );
  useEffect(() => () => {
    clearTimeout(issueSearchDebounceRef.current);
    issueSearchAbortRef.current?.abort();
  }, []);

  // Borrowing Window: Defaults to Settings page "default_loan_days"
  const [durationPreset, setDurationPreset] = useState(defaultLoanDays);

  useEffect(() => {
    if (systemSettings?.default_loan_days) {
      setDurationPreset(Number(systemSettings.default_loan_days));
    }
  }, [systemSettings?.default_loan_days]);

  // Dynamic duration presets following Settings page
  const durationPresets = Array.from(new Set([7, 14, 21, defaultLoanDays])).sort((a, b) => a - b);
  const formatDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayDate = formatDateInput(new Date());

  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultLoanDays);
    return formatDateInput(d);
  });
  const [issuedSlip, setIssuedSlip] = useState(null);

  // Live directory lookup for the selected patron type.
  const handleIssuePatronSearchChange = (val) => {
    setPatronSearchInput(val);
    setSelectedPatron(null);
    setDirectorySearchError('');

    const query = val.trim();
    if (issueSearchAbortRef.current) issueSearchAbortRef.current.abort();
    if (!query || query.length < 2) {
      clearTimeout(issueSearchDebounceRef.current);
      setDirectoryResults([]);
      setIsSearchingDirectory(false);
      setIsDropdownOpen(false);
      return;
    }

    setDirectoryResults([]);
    clearTimeout(issueSearchDebounceRef.current);
    setIsSearchingDirectory(true);
    setIsDropdownOpen(true);

    issueSearchDebounceRef.current = setTimeout(async () => {
      if (issueSearchAbortRef.current) {
        issueSearchAbortRef.current.abort();
      }
      const controller = new AbortController();
      issueSearchAbortRef.current = controller;

      try {
        const isFaculty = memberType === 'faculty';
        const endpoint = isFaculty ? '/api/hrms/employees' : '/api/sdms/students';
        const params = new URLSearchParams({ search: query, limit: '10' });
        if (isFaculty) {
          params.set('status', 'active');
          params.set('directory', 'true');
        }
        const res = await fetch(`${endpoint}?${params}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(`${isFaculty ? 'HRMS' : 'SDMS'} status ${res.status}`);
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        const results = isFaculty ? data.employees : data.students;
        setDirectoryResults(Array.isArray(results) ? results : []);
        setIsDropdownOpen(Array.isArray(results) && results.length > 0);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(`${memberType === 'faculty' ? 'HRMS' : 'SDMS'} patron search failed:`, err);
        setDirectoryResults([]);
        setDirectorySearchError(`Could not search ${memberType === 'faculty' ? 'HRMS' : 'SDMS'}. Please try again.`);
        setIsDropdownOpen(false);
      } finally {
        if (issueSearchAbortRef.current === controller) {
          setIsSearchingDirectory(false);
        }
      }
    }, 250);
  };

  const handleSelectPatron = (patron) => {
    setSelectedPatron(patron);
    const patronId = memberType === 'faculty'
      ? patron.emp_no
      : (patron.pin_no || patron.rollNo);
    setPatronSearchInput(`${patron.name || patron.employee_name} (${patronId})`);
    setIsDropdownOpen(false);
  };

  const handleClearSelectedPatron = () => {
    setSelectedPatron(null);
    setPatronSearchInput('');
    setDirectoryResults([]);
    setDirectorySearchError('');
    setIsDropdownOpen(false);
  };

  const handleMemberTypeChange = (type) => {
    if (type === memberType) return;
    if (issueSearchAbortRef.current) issueSearchAbortRef.current.abort();
    clearTimeout(issueSearchDebounceRef.current);
    setMemberType(type);
    setPatronSearchInput('');
    setSelectedPatron(null);
    setDirectoryResults([]);
    setDirectorySearchError('');
    setIsSearchingDirectory(false);
    setIsDropdownOpen(false);
  };

  // Compute calculated due date
  const calculatedDueDate = (() => {
    if (durationPreset === 'manual') {
      return manualDate ? new Date(`${manualDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date';
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(durationPreset || defaultLoanDays));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingIssue) return;

    if (selectedBooks.length === 0) {
      if (onToast) onToast('Please search and add at least one book to issue', 'error');
      return;
    }

    if (!selectedPatron) {
      if (onToast) onToast(`Please search and select a verified ${memberType} from ${memberType === 'faculty' ? 'HRMS' : 'SDMS'}`, 'error');
      return;
    }

    if (memberType === 'student' && selectedPatron.status === 'Frozen') {
      if (onToast) onToast('Borrowing locked: This student account is frozen due to overdue fines.', 'error');
      return;
    }

    const patronId = memberType === 'faculty'
      ? selectedPatron.emp_no
      : (selectedPatron.pin_no || selectedPatron.rollNo);
    const patronName = selectedPatron.name || selectedPatron.employee_name;
    const patronActiveLoans = activeLoans.filter(l =>
      (l.patronType || 'student') === memberType &&
      ((l.patronId && l.patronId.toLowerCase() === String(patronId || '').toLowerCase()) ||
        (l.patronName && l.patronName.toLowerCase() === String(patronName || '').toLowerCase()))
    );

    if (patronActiveLoans.length + selectedBooks.length > maxBooksQuota) {
      if (onToast) onToast(`Borrowing quota reached: ${patronName} already has ${patronActiveLoans.length} active loans and cannot borrow ${selectedBooks.length} more books (Institutional limit: ${maxBooksQuota} books per patron).`, 'error');
      return;
    }

    if (durationPreset === 'manual' && (!manualDate || manualDate < todayDate)) {
      if (onToast) onToast('Please select a valid end date that is today or later.', 'error');
      return;
    }

    const payload = {
      books: selectedBooks,
      bookBarcode: selectedBooks[0].barcode || selectedBooks[0].accession,
      bookTitle: selectedBooks[0].title,
      accession: selectedBooks[0].accession,
      patronId,
      patronName,
      patronType: memberType,
      department: selectedPatron.department || 'General',
      durationDays: durationPreset === 'manual' ? null : durationPreset,
      manualDueDate: durationPreset === 'manual' ? manualDate : null
    };

    setIsSubmittingIssue(true);
    try {
      if (onIssueBook) {
        const result = await onIssueBook(payload);
        if (!result) return;
      }

      // Set printable confirmation receipt
      setIssuedSlip({
        ...payload,
        books: selectedBooks,
        dueDate: calculatedDueDate,
        issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      });

      setSelectedBooks([]);
      setBookSearchInput('');
      if (onClearPrefilled) onClearPrefilled();
    } finally {
      setTimeout(() => setIsSubmittingIssue(false), 600);
    }
  };

  // ==================== RETURN / RE-ISSUE DESK STATE ====================
  const [returnInput, setReturnInput] = useState('');
  const [isSearchingReturnSdms, setIsSearchingReturnSdms] = useState(false);
  const [returnSdmsResults, setReturnSdmsResults] = useState([]);
  const [returnMemberType, setReturnMemberType] = useState('student');
  const [returnSearchError, setReturnSearchError] = useState('');
  const [isReturnDropdownOpen, setIsReturnDropdownOpen] = useState(false);
  const [selectedReturnStudent, setSelectedReturnStudent] = useState(null);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const [manualReturnBook, setManualReturnBook] = useState(null);
  const [manualReturnIssueDate, setManualReturnIssueDate] = useState('');
  const [manualReturnDueDate, setManualReturnDueDate] = useState('');
  const [isSubmittingManualReturn, setIsSubmittingManualReturn] = useState(false);
  const returnSearchDebounceRef = useRef(null);
  const returnSearchAbortRef = useRef(null);
  const returnDropdownRef = useRef(null);
  const rankedReturnResults = useMemo(
    () => rankPatronResults(returnSdmsResults, returnInput, returnMemberType),
    [returnSdmsResults, returnInput, returnMemberType]
  );
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
  useEffect(() => () => {
    clearTimeout(returnSearchDebounceRef.current);
    returnSearchAbortRef.current?.abort();
  }, []);

  const handleReturnMemberTypeChange = (type) => {
    if (type === returnMemberType) return;
    clearTimeout(returnSearchDebounceRef.current);
    returnSearchAbortRef.current?.abort();
    setReturnMemberType(type);
    setReturnInput('');
    setReturnSdmsResults([]);
    setSelectedReturnStudent(null);
    setSelectedLoanForReturn(null);
    setReturnSearchError('');
    setIsSearchingReturnSdms(false);
    setIsReturnDropdownOpen(false);
  };

  const findCatalogReturnBook = scannedCode => {
    const normalizeCode = value => String(value ?? '').replace(/[\s\-_]/g, '').toLowerCase();
    const scannedCodeNormalized = normalizeCode(scannedCode);
    for (const book of books) {
      const identifiers = [
        { value: book.barcode, copy: null },
        { value: book.accession, copy: null },
        { value: book.titleId, copy: null },
        { value: book.title_id, copy: null },
        ...(Array.isArray(book.copies_detail)
          ? book.copies_detail.flatMap(copy => [
              { value: copy.barcode, copy },
              { value: copy.accession, copy },
              { value: copy.serial_no, copy }
            ])
          : [])
      ];
      const match = identifiers.find(identifier =>
        scannedCodeNormalized && normalizeCode(identifier.value) === scannedCodeNormalized
      );
      if (match) {
        return {
          book,
          scannedCode: String(scannedCode).trim(),
          copyBarcode: match.copy?.barcode || match.copy?.accession || match.copy?.serial_no || scannedCode,
          accession: match.copy?.accession || book.accession || scannedCode
        };
      }
    }
    return null;
  };

  // Match scanned books locally, then search the selected patron directory.
  const handleScanOrSearchReturn = (val) => {
    setReturnInput(val);
    const clean = val.trim();
    clearTimeout(returnSearchDebounceRef.current);
    returnSearchAbortRef.current?.abort();
    setReturnSearchError('');

    if (!clean) {
      setReturnSdmsResults([]);
      setIsSearchingReturnSdms(false);
      setIsReturnDropdownOpen(false);
      return;
    }

    // 1. Check if it matches an active loan barcode, accession, titleId, or book number immediately
    const cleanNum = clean.replace(/^[#\s]+/, '').replace(/[\s\-_]/g, '');
    const matchedLoan = loans.find(l => {
      if (String(l.status || '').toLowerCase() === 'returned') return false;
      const bCode = String(l.bookBarcode || '').toLowerCase();
      const acc = String(l.accession || '').toLowerCase();
      const tId = String(l.titleId || l.title_id || '').toLowerCase();
      const title = String(l.bookTitle || l.book_title || '').toLowerCase();
      const cLower = clean.toLowerCase();
      if (bCode === cLower || acc === cLower || tId === cLower || title === cLower) return true;
      if (cleanNum) {
        if (tId && tId.replace(/[\s\-_]/g, '') === cleanNum) return true;
        if (acc && acc.replace(/[\s\-_]/g, '') === cleanNum) return true;
        if (bCode && bCode.replace(/[\s\-_]/g, '') === cleanNum) return true;
      }
      return false;
    });
    if (matchedLoan) {
      setManualReturnBook(null);
      handleSelectLoanToReturn(matchedLoan);
      setIsReturnDropdownOpen(false);
      return;
    }

    const catalogMatch = findCatalogReturnBook(clean);
    if (catalogMatch) {
      setManualReturnBook(catalogMatch);
      setSelectedLoanForReturn(null);
      setReturnSdmsResults([]);
      setIsSearchingReturnSdms(false);
      setIsReturnDropdownOpen(false);
      return;
    }

    if (clean.length < 2) {
      setReturnSdmsResults([]);
      setIsSearchingReturnSdms(false);
      setIsReturnDropdownOpen(false);
      return;
    }

    // Search only after two characters and discard stale/in-flight requests.
    setReturnSdmsResults([]);
    setIsSearchingReturnSdms(true);
    setIsReturnDropdownOpen(true);

    returnSearchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      returnSearchAbortRef.current = controller;
      const isFaculty = returnMemberType === 'faculty';
      const endpoint = isFaculty ? '/api/hrms/employees' : '/api/sdms/students';
      const params = new URLSearchParams({ search: clean, limit: '8' });
      if (isFaculty) {
        params.set('status', 'active');
        params.set('directory', 'true');
      }
      try {
        const res = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`${isFaculty ? 'HRMS' : 'SDMS'} status ${res.status}`);
        }
        const data = await res.json();
        if (controller.signal.aborted) return;
        const results = isFaculty ? data.employees : data.students;
        setReturnSdmsResults(Array.isArray(results) ? results : []);
        setIsReturnDropdownOpen(Array.isArray(results) && results.length > 0);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(`${isFaculty ? 'HRMS' : 'SDMS'} return search failed:`, err);
        setReturnSdmsResults([]);
        setReturnSearchError(`Could not search ${isFaculty ? 'HRMS' : 'SDMS'}. Please try again.`);
        setIsReturnDropdownOpen(false);
      } finally {
        if (returnSearchAbortRef.current === controller) {
          setIsSearchingReturnSdms(false);
        }
      }
    }, 250);
  };

  const handleSelectReturnStudent = (st) => {
    const patronId = returnMemberType === 'faculty' ? st.emp_no : (st.pin_no || st.rollNo);
    const patronName = st.name || st.employee_name;
    const selectedPatron = { ...st, name: patronName, patronType: returnMemberType };
    setSelectedReturnStudent(selectedPatron);
    setReturnInput(`${patronName} (${patronId})`);
    setIsReturnDropdownOpen(false);

    const selectedId = String(patronId || '').toLowerCase().trim();
    const patronLoans = loans.filter(l =>
      l.status !== 'Returned' &&
      (l.patronType || l.patron_type || 'student') === returnMemberType &&
      normalizePatronId(l.patronId || l.patron_id, returnMemberType) === normalizePatronId(selectedId, returnMemberType)
    );

    if (manualReturnBook) {
      setSelectedLoanForReturn(null);
    } else if (patronLoans.length === 1) {
      setSelectedLoanForReturn(patronLoans[0]);
    } else {
      setSelectedLoanForReturn(null);
    }
  };

  const handleSelectLoanToReturn = (loan) => {
    returnSearchAbortRef.current?.abort();
    setManualReturnBook(null);
    setSelectedLoanForReturn(loan);
    setSelectedReturnStudent({
      name: loan.patronName,
      emp_no: loan.patronId,
      pin_no: loan.patronId,
      department: loan.department,
      patronType: loan.patronType || 'student',
      photo: loan.patronPhoto || null
    });

    if (loan.patronId) {
      const isFaculty = (loan.patronType || 'student') === 'faculty';
      const controller = new AbortController();
      returnSearchAbortRef.current = controller;
      fetch(isFaculty
        ? `/api/hrms/employees/${encodeURIComponent(loan.patronId)}`
        : `/api/sdms/students/${encodeURIComponent(loan.patronId)}`,
      { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          const patron = isFaculty ? data.employee : data.student;
          if (patron && !controller.signal.aborted) {
            setSelectedReturnStudent(prev => ({
              ...prev,
              ...patron,
              name: patron.name || patron.employee_name || prev.name,
              emp_no: patron.emp_no || prev.emp_no,
              patronType: loan.patronType || 'student'
            }));
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error('Failed to load borrower details:', err);
        });
    }
  };

  const handleExecuteReturn = (targetLoan = null) => {
    const loan = targetLoan || selectedLoanForReturn;
    if (!loan) {
      if (onToast) onToast('Select or scan a borrowed book to return', 'error');
      return;
    }
    if (onReturnBook) {
      onReturnBook(loan.id || loan._id || loan.accession || loan.bookBarcode);
    }
    returnSearchAbortRef.current?.abort();
    setSelectedLoanForReturn(null);
    setSelectedReturnStudent(null);
    setReturnInput('');
  };

  const handleExecuteManualReturn = async () => {
    if (!manualReturnBook || !selectedReturnStudent) {
      if (onToast) onToast('Select the returned book and its borrower before continuing.', 'error');
      return;
    }
    if (!manualReturnIssueDate || !manualReturnDueDate || manualReturnDueDate < manualReturnIssueDate) {
      if (onToast) onToast('Enter valid issue and due dates; the due date cannot be before the issue date.', 'error');
      return;
    }

    const patronType = selectedReturnStudent.patronType || selectedReturnStudent.patron_type || returnMemberType;
    const patronId = patronType === 'faculty'
      ? selectedReturnStudent.emp_no || selectedReturnStudent.patronId
      : selectedReturnStudent.pin_no || selectedReturnStudent.rollNo || selectedReturnStudent.patronId;
    const patronName = selectedReturnStudent.name || selectedReturnStudent.employee_name || selectedReturnStudent.student_name;
    if (!patronId || !patronName) {
      if (onToast) onToast('The selected directory member is missing an ID or name.', 'error');
      return;
    }

    setIsSubmittingManualReturn(true);
    try {
      if (!onManualReturnBook) throw new Error('Manual return is not available.');
      await onManualReturnBook({
        barcode: manualReturnBook.copyBarcode,
        accession: manualReturnBook.accession,
        patronId: String(patronId),
        patronType,
        patronName,
        department: selectedReturnStudent.department || 'General',
        issueDate: manualReturnIssueDate,
        dueDate: manualReturnDueDate,
        bookTitle: manualReturnBook.book.title
      });
      setManualReturnBook(null);
      setManualReturnIssueDate('');
      setManualReturnDueDate('');
      setSelectedReturnStudent(null);
      setReturnInput('');
    } catch (error) {
      console.error('Manual return failed:', error);
      if (onToast) onToast(`Manual return failed: ${error.message}`, 'error');
    } finally {
      setIsSubmittingManualReturn(false);
    }
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
    returnSearchAbortRef.current?.abort();
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
  const [isValidatingBulkMembers, setIsValidatingBulkMembers] = useState(false);
  const [bulkMemberValidationComplete, setBulkMemberValidationComplete] = useState(false);
  const circFileInputRef = useRef(null);
  const bulkValidationRunRef = useRef(0);
  const bulkValidationAbortRef = useRef(null);

  useEffect(() => () => bulkValidationAbortRef.current?.abort(), []);

  const validateBulkMemberRows = async (rows, signal) => {
    const members = new Map();
    rows.forEach(row => {
      const patronId = String(row.patronId || '').trim();
      if (!patronId) return;
      const key = `${row.patronType}:${patronId}`;
      if (!members.has(key)) members.set(key, { key, patronId, patronType: row.patronType });
    });

    const results = new Map();
    const queue = [...members.values()];
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < queue.length && !signal.aborted) {
        const member = queue[nextIndex++];
        const endpoint = member.patronType === 'faculty'
          ? `/api/hrms/employees/${encodeURIComponent(member.patronId)}`
          : `/api/sdms/students/${encodeURIComponent(member.patronId)}`;

        try {
          const response = await fetch(endpoint, { signal });
          if (response.status === 404) {
            results.set(member.key, { status: 'missing' });
            continue;
          }
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || `Directory returned HTTP ${response.status}`);
          }
          const profile = member.patronType === 'faculty' ? payload.employee : payload.student;
          if (!profile) {
            results.set(member.key, { status: 'missing' });
            continue;
          }
          results.set(member.key, { status: 'found', profile });
        } catch (error) {
          if (signal.aborted || error.name === 'AbortError') return;
          console.error(`Bulk ${member.patronType} directory lookup failed for ${member.patronId}:`, error);
          results.set(member.key, {
            status: 'error',
            error: error.message || 'Directory lookup failed'
          });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(8, queue.length) }, worker));
    if (signal.aborted) return null;

    return rows.map(row => {
      const patronId = String(row.patronId || '').trim();
      if (!patronId) return { ...row, memberDirectoryStatus: 'missing-id' };

      const result = results.get(`${row.patronType}:${patronId}`);
      if (!result || result.status !== 'found') {
        return {
          ...row,
          memberDirectoryStatus: result?.status || 'error',
          memberDirectoryError: result?.error
        };
      }

      const directoryName = result.profile.name || result.profile.employee_name || result.profile.student_name;
      return {
        ...row,
        patronId: row.patronType === 'faculty'
          ? String(result.profile.emp_no ?? patronId).trim()
          : row.patronId,
        patronName: directoryName || row.patronName,
        department: result.profile.department || row.department,
        memberDirectoryStatus: 'found'
      };
    });
  };

  const startBulkMemberValidation = async rows => {
    bulkValidationAbortRef.current?.abort();
    const controller = new AbortController();
    bulkValidationAbortRef.current = controller;
    const runId = ++bulkValidationRunRef.current;
    setIsValidatingBulkMembers(true);
    setBulkMemberValidationComplete(false);
    setBulkCircData(rows.map(row => ({ ...row, memberDirectoryStatus: 'pending' })));

    try {
      const validatedRows = await validateBulkMemberRows(rows, controller.signal);
      if (validatedRows && runId === bulkValidationRunRef.current) {
        setBulkCircData(validatedRows);
        setBulkMemberValidationComplete(true);
      }
    } catch (error) {
      if (controller.signal.aborted || runId !== bulkValidationRunRef.current) return;
      console.error('Bulk member directory validation failed:', error);
      setBulkCircData(rows.map(row => ({
        ...row,
        memberDirectoryStatus: 'error',
        memberDirectoryError: error.message || 'Directory validation failed'
      })));
      setBulkMemberValidationComplete(true);
    } finally {
      if (runId === bulkValidationRunRef.current) setIsValidatingBulkMembers(false);
    }
  };

  const bulkMissingMembers = [...new Map(
    bulkCircData
      .filter(row => row.memberDirectoryStatus === 'missing' || row.memberDirectoryStatus === 'missing-id')
      .map(row => [
        row.memberDirectoryStatus === 'missing-id' ? `missing-id:${row.id}` : `${row.patronType}:${row.patronId}`,
        row
      ])
  ).values()];
  const bulkDirectoryErrors = [...new Map(
    bulkCircData
      .filter(row => row.memberDirectoryStatus === 'error')
      .map(row => [`${row.patronType}:${row.patronId}`, row])
  ).values()];
  const bulkDirectoryLookupCount = new Set(
    bulkCircData
      .filter(row => row.patronId)
      .map(row => `${row.patronType}:${row.patronId}`)
  ).size;
  const bulkMissingIdCount = bulkMissingMembers.filter(row => row.memberDirectoryStatus === 'missing-id').length;
  const bulkMatchedRows = bulkCircData.filter(row => row.memberDirectoryStatus === 'found');
  const bulkSkippedRowsCount = bulkCircData.length - bulkMatchedRows.length;
  const bulkUnmappedBooks = [...new Map(
    bulkCircData
      .filter(row => !row.shelfLocation && !getCatalogShelfForLoan(row))
      .map(row => [normalizeCatalogCode(row.accession || row.bookBarcode || row.bookTitleId), row])
  ).values()];

  // Helper for spreadsheet date format conversion
  const formatSpreadsheetDate = (raw) => {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().split('T')[0];
    if (typeof raw === 'number') {
      const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const str = String(raw).trim();
    const dayFirstDate = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dayFirstDate) {
      const [, day, month, year] = dayFirstDate;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
      ) {
        return date.toISOString().split('T')[0];
      }
    }
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
        'MemberID': '246T1A0501',
        'MemberName': 'Damerla Sai Saketh',
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
        'MemberID': '236T1A0412',
        'MemberName': 'K. Rajesh',
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
        'MemberID': '246T1A0301',
        'MemberName': 'M. Sai Kumar',
        'Department': 'MECH (BTECH)',
        'IssueDate': '2026-09-01',
        'DueDate': '2026-10-01',
        'ReturnDate': '',
        'Status': 'Overdue'
      },
      {
        'AccessionNo': '1004',
        'Barcode': 'BC1004',
        'BookTitle': 'Database System Concepts',
        'MemberID': '1042',
        'MemberName': 'Faculty Member',
        'Department': 'CSE',
        'IssueDate': '2026-10-10',
        'DueDate': '2026-11-09',
        'ReturnDate': '',
        'Status': 'Active'
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
    bulkValidationAbortRef.current?.abort();
    const parseRunId = ++bulkValidationRunRef.current;
    setBulkFileName(file.name);
    setBulkCircData([]);
    setBulkMemberValidationComplete(false);
    setIsValidatingBulkMembers(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (parseRunId !== bulkValidationRunRef.current) return;
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const normalizeHeader = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const headerAliases = new Set([
          'accessionno', 'accession', 'accno', 'acc', 'barcode', 'serialno', 'serialnumber', 'bookid',
          'booktitle', 'title', 'titlename', 'titlenar', 'bookname', 'titleid',
          'memberid', 'memberno', 'membernumber', 'memberidno', 'membernumberid',
          'employeeid', 'employeeno', 'employeenumber', 'employeeidno', 'empno', 'empid',
          'facultyid', 'facultyempno', 'studentpin', 'studentpinno', 'pinno', 'pin',
          'studentrollno', 'studentrollnumber', 'rollno', 'rollnumber', 'admissionno',
          'admissionnumber', 'patronid', 'patronno', 'studentid', 'id',
          'membername', 'memberfullname', 'employeename', 'employeefullname',
          'facultyname', 'facultyfullname', 'studentname', 'studentfullname',
          'patronname', 'patronfullname', 'borrowername', 'borrower', 'name',
          'issuedate', 'dateofissue', 'issuedon', 'duedate', 'dateofdue', 'dueon',
          'expectedreturn', 'returndate', 'dateofreturn', 'returnedon', 'status',
          'loanstatus', 'department', 'dept', 'branch', 'course', 'division'
        ]);
        const headerRowIndex = sheetRows.reduce((bestIndex, row, index) => {
          const score = row.reduce((total, cell) =>
            total + (headerAliases.has(normalizeHeader(cell)) ? 1 : 0), 0);
          return score > bestIndex.score ? { index, score } : bestIndex;
        }, { index: -1, score: 0 });
        const rawJson = headerRowIndex.score > 0
          ? sheetRows.slice(headerRowIndex.index + 1)
            .filter(row => row.some(value => String(value ?? '').trim() !== ''))
            .map(row => Object.fromEntries(
              sheetRows[headerRowIndex.index].map((header, columnIndex) => [
                String(header || `column${columnIndex}`).trim(),
                row[columnIndex] ?? ''
              ])
            ))
          : [];

        if (!Array.isArray(rawJson) || rawJson.length === 0) {
          if (onToast) onToast(
            headerRowIndex.score > 0
              ? 'The uploaded spreadsheet contains no data rows.'
              : 'Could not find a header row. Include columns such as Accession No, TitleName, MemberId, MemberName, IssueDate, and DueDate.',
            'error'
          );
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

          const genericTitle = String(normRow['title'] || '').trim();
          const bookTitle = String(
            normRow['titlename'] ||
            normRow['titlenar'] ||
            normRow['booktitle'] ||
            normRow['bookname'] ||
            normRow['book'] ||
            (genericTitle && !/^\d+$/.test(genericTitle) ? genericTitle : '') ||
            'Library Holding'
          ).trim();
          const bookTitleId = String(
            normRow['titleid'] ||
            normRow['title_id'] ||
            normRow['booktitleid'] ||
            (/^\d+$/.test(genericTitle) ? genericTitle : '') ||
            ''
          ).trim();
          const bookBarcode = String(normRow['barcode'] || '').trim();

          const patronIdAliases = [
            normRow['memberid'],
            normRow['memberno'],
            normRow['membernumber'],
            normRow['memberidno'],
            normRow['membernumberid'],
            normRow['employeeid'],
            normRow['employeeno'],
            normRow['employeenumber'],
            normRow['employeeidno'],
            normRow['empno'],
            normRow['empid'],
            normRow['facultyid'],
            normRow['facultyempno'],
            normRow['studentpin'],
            normRow['studentpinno'],
            normRow['pinno'],
            normRow['pin'],
            normRow['studentrollno'],
            normRow['studentrollnumber'],
            normRow['rollno'],
            normRow['rollnumber'],
            normRow['admissionno'],
            normRow['admissionnumber'],
            normRow['patronid'],
            normRow['patronno'],
            normRow['studentid'],
            normRow['id']
          ];
          const patronIdValue = patronIdAliases.find(value =>
            value !== undefined && value !== null && String(value).trim() !== ''
          ) || Object.entries(normRow).find(([key, value]) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== '' &&
            !key.includes('name') &&
            /(member|student|faculty|employee|emp|patron|borrower|roll|pin|admission)/.test(key) &&
            /(id|no|number|pin|roll|admission)/.test(key)
          )?.[1];
          const patronId = String(patronIdValue ?? '').trim();
          const patronType = /^\d+$/.test(patronId) ? 'faculty' : 'student';

          const patronNameAliases = [
            normRow['membername'] ||
            normRow['memberfullname'],
            normRow['employeename'],
            normRow['employeefullname'],
            normRow['facultyname'],
            normRow['facultyfullname'],
            normRow['studentname'],
            normRow['studentfullname'],
            normRow['patronname'],
            normRow['patronfullname'],
            normRow['borrowername'],
            normRow['borrower'],
            normRow['name'],
            normRow['student']
          ];
          const patronName = String(
            patronNameAliases.find(value =>
              value !== undefined && value !== null && String(value).trim() !== ''
            ) || Object.entries(normRow).find(([key, value]) =>
              value !== undefined &&
              value !== null &&
              String(value).trim() !== '' &&
              /(member|student|faculty|employee|patron|borrower|name)/.test(key) &&
              /(name|fullname)/.test(key)
            )?.[1] || (patronType === 'faculty' ? 'HRMS Faculty' : 'SDMS Student')
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
            bookBarcode,
            bookTitleId,
            bookTitle,
            patronId,
            patronType,
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

        void startBulkMemberValidation(normalized);
      } catch (err) {
        if (parseRunId !== bulkValidationRunRef.current) return;
        console.error('Error parsing circulation excel:', err);
        if (onToast) onToast(`Failed to parse spreadsheet: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteBulkCircImport = async () => {
    if (bulkMatchedRows.length === 0 || isValidatingBulkMembers) return;
    setIsImportingBulkCirc(true);
    try {
      if (onBulkImportCirculations) {
        await onBulkImportCirculations(bulkMatchedRows);
      } else {
        const res = await fetch('/api/circulation/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ circulations: bulkMatchedRows })
        });
        if (!res.ok) throw new Error('Bulk API response failed');
      }
      if (onToast) {
        const skippedMessage = bulkSkippedRowsCount > 0
          ? ` ${bulkSkippedRowsCount} unmatched record(s) were skipped.`
          : '';
        onToast(`Successfully imported ${bulkMatchedRows.length} matched circulation records.${skippedMessage}`, 'success');
      }
      setBulkCircData([]);
      setBulkFileName('');
      setBulkMemberValidationComplete(false);
      setActiveForm(null);
      setLoanStatusFilter('active');
    } catch (err) {
      console.error('Failed to import circulations:', err);
      if (onToast) onToast(`Bulk import failed: ${err.message}`, 'error');
    } finally {
      setIsImportingBulkCirc(false);
    }
  };
  const bulkFacultyCount = bulkCircData.filter(row => row.patronType === 'faculty').length;
  const bulkStudentCount = bulkCircData.length - bulkFacultyCount;

  // ==================== STATS CALCULATION ====================
  const totalBooksCount = books.length;
  const totalCopiesCount = books.reduce((sum, b) => sum + getBookTotalCount(b), 0);
  const totalAvailableCopies = books.reduce((sum, b) => sum + getBookAvailableCount(b), 0);

  // Computed Loans categories
  const activeLoans = useMemo(() => loans.filter(isActiveLoan), [loans]);
  const overdueLoans = useMemo(() => activeLoans.filter(l => String(l.status || '').toLowerCase() === 'overdue'), [activeLoans]);
  const onScheduleLoans = useMemo(() => activeLoans.filter(l => ['active', 'borrowed'].includes(String(l.status || '').toLowerCase())), [activeLoans]);
  const activeLoanCountsByPatron = useMemo(() => {
    const counts = new Map();
    activeLoans.forEach(loan => {
      const patronType = loan.patronType || loan.patron_type || 'student';
      const patronId = normalizePatronId(loan.patronId || loan.patron_id, patronType);
      if (!patronId) return;
      const key = `${patronType}:${patronId}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [activeLoans]);

  // Filtered active loans for Return Desk list
  const filteredReturnLoans = activeLoans.filter(l => {
    // A selected directory patron must match by member ID; names are not unique.
    if (selectedReturnStudent) {
      const patronType = selectedReturnStudent.patronType || selectedReturnStudent.patron_type || returnMemberType;
      if ((l.patronType || l.patron_type || 'student') !== patronType) return false;

      const selectedIds = patronType === 'faculty'
        ? [selectedReturnStudent.emp_no, selectedReturnStudent.employee_no, selectedReturnStudent.patronId, selectedReturnStudent.patron_id]
        : [
            selectedReturnStudent.pin_no,
            selectedReturnStudent.rollNo,
            selectedReturnStudent.roll_number,
            selectedReturnStudent.admission_number,
            selectedReturnStudent.patronId,
            selectedReturnStudent.patron_id
          ];
      const selectedIdSet = new Set(selectedIds.map(id => normalizePatronId(id, patronType)).filter(Boolean));
      const loanIds = [
        l.patronId,
        l.patron_id,
        l.student_id,
        l.studentPin,
        l.pin_no,
        l.rollNo,
        l.roll_number,
        l.emp_no
      ].map(id => normalizePatronId(id, patronType)).filter(Boolean);

      return loanIds.some(id => selectedIdSet.has(id));
    }

    if (!returnInput) return true;
    if ((l.patronType || l.patron_type || 'student') !== returnMemberType) return false;
    const raw = returnInput.toLowerCase().trim();
    const cleanNum = raw.replace(/^[#\s]+/, '').replace(/[\s\-_]/g, '');
    const pinMatch = raw.match(/\(([^)]+)\)/);
    const extractedPin = pinMatch ? pinMatch[1].toLowerCase().trim() : null;
    const cleanName = raw.replace(/\([^)]+\)/, '').toLowerCase().trim();

    const bookTitle = (l.bookTitle || l.book_title || '').toLowerCase();
    const patronName = (l.patronName || l.patron_name || l.student_name || '').toLowerCase();
    const patronId = (l.patronId || l.patron_id || l.student_id || '').toLowerCase();
    const accession = (l.accession || '').toLowerCase();
    const bookBarcode = (l.bookBarcode || l.book_barcode || '').toLowerCase();
    const titleId = (l.titleId || l.title_id || '').toLowerCase();
    const department = (l.department || '').toLowerCase();

    return (
      bookTitle.includes(raw) ||
      patronName.includes(raw) ||
      (cleanName && patronName.includes(cleanName)) ||
      patronId.includes(raw) ||
      (extractedPin && patronId.includes(extractedPin)) ||
      titleId.includes(raw) ||
      (cleanNum && titleId.includes(cleanNum)) ||
      accession.includes(raw) ||
      (cleanNum && accession.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
      bookBarcode.includes(raw) ||
      (cleanNum && bookBarcode.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
      department.includes(raw)
    );
  });

  // ==================== BOTTOM CIRCULATIONS & HISTORY STATE ====================
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('active'); // 'active' | 'overdue' | 'history' | 'logs'
  const [memberTypeFilter, setMemberTypeFilter] = useState('all'); // 'all' | 'faculty' | 'student'
  const [loanDateFrom, setLoanDateFrom] = useState('');
  const [loanDateTo, setLoanDateTo] = useState('');
  const memberFilteredLoans = useMemo(
    () => memberTypeFilter === 'all' ? loans : loans.filter(loan => getPatronType(loan) === memberTypeFilter),
    [loans, memberTypeFilter]
  );
  const memberFilteredActiveLoans = useMemo(() => memberFilteredLoans.filter(isActiveLoan), [memberFilteredLoans]);
  const memberFilteredOverdueLoans = useMemo(
    () => memberFilteredActiveLoans.filter(loan => String(loan.status || '').toLowerCase() === 'overdue'),
    [memberFilteredActiveLoans]
  );
  const memberFilteredReturnedLoans = useMemo(
    () => memberFilteredLoans.filter(loan => !isActiveLoan(loan)),
    [memberFilteredLoans]
  );

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
      patronType: l.payload?.patron_type || l.payload?.patronType || l.patronType || l.patron_type,
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
      patronType: getPatronType(ln),
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

  const memberFilteredCirculationLogs = circulationLogs.filter(log =>
    memberTypeFilter === 'all' || getPatronType(log) === memberTypeFilter
  );

  // Filtered circulation logs
  const filteredCirculationLogs = memberFilteredCirculationLogs.filter(log => {
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
    if (memberTypeFilter !== 'all' && getPatronType(l) !== memberTypeFilter) return false;
    if (loanStatusFilter === 'active' && !isActiveLoan(l)) return false;
    if (loanStatusFilter === 'overdue' && (!isActiveLoan(l) || String(l.status || '').toLowerCase() !== 'overdue')) return false;
    if (loanStatusFilter === 'history' && isActiveLoan(l)) return false;

    if (loanDateFrom || loanDateTo) {
      const rawIssueDate = l.issue_date || l.issueDate || l.issueDateFormatted;
      const rawDateString = String(rawIssueDate || '');
      let issueDateKey = /^\d{4}-\d{2}-\d{2}/.test(rawDateString) ? rawDateString.slice(0, 10) : '';
      if (!issueDateKey) {
        const parsedIssueDate = rawIssueDate ? new Date(rawIssueDate) : null;
        if (!parsedIssueDate || Number.isNaN(parsedIssueDate.getTime())) return false;
        issueDateKey = `${parsedIssueDate.getFullYear()}-${String(parsedIssueDate.getMonth() + 1).padStart(2, '0')}-${String(parsedIssueDate.getDate()).padStart(2, '0')}`;
      }
      if (loanDateFrom && issueDateKey < loanDateFrom) return false;
      if (loanDateTo && issueDateKey > loanDateTo) return false;
    }

    if (!loanSearchTerm) return true;
    const raw = loanSearchTerm.toLowerCase().trim();
    const pinMatch = raw.match(/\(([^)]+)\)/);
    const extractedPin = pinMatch ? pinMatch[1].toLowerCase().trim() : null;
    const cleanName = raw.replace(/\([^)]+\)/, '').toLowerCase().trim();

    const bookTitle = (l.bookTitle || '').toLowerCase();
    const patronName = (l.patronName || '').toLowerCase();
    const patronId = (l.patronId || '').toLowerCase();
    const accession = (l.accession || '').toLowerCase();
    const bookBarcode = (l.bookBarcode || '').toLowerCase();
    const department = (l.department || '').toLowerCase();
    const status = (l.status || '').toLowerCase();

    return (
      bookTitle.includes(raw) ||
      patronName.includes(raw) ||
      (cleanName && patronName.includes(cleanName)) ||
      patronId.includes(raw) ||
      (extractedPin && patronId.includes(extractedPin)) ||
      accession.includes(raw) ||
      bookBarcode.includes(raw) ||
      department.includes(raw) ||
      status.includes(raw)
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
              Live Directories
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Search live SDMS students or HRMS faculty to issue or return library books
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
          className={`fixed inset-0 z-[100] flex items-center justify-center ${
            activeForm === 'bulk' ? 'p-3' : 'p-4'
          } bg-black/50 overflow-y-auto animate-in fade-in duration-200`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveForm(null);
              if (onClearPrefilled) onClearPrefilled();
            }
          }}
        >
          <div className={`bg-white border border-blue-200/90 rounded-2xl shadow-md relative animate-in zoom-in-95 duration-200 ${
            activeForm === 'bulk'
              ? 'flex w-[94vw] max-w-7xl h-[88vh] max-h-[92vh] flex-col overflow-hidden p-4 sm:p-5 space-y-6'
              : 'w-full max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-5 space-y-4'
          }`}>
            {/* Top Form Header with Mode Switcher & Close Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[110px]">
                  <h2 className="text-sm font-bold text-blue-950">
                    {activeForm === 'issue' ? 'Issue books' : activeForm === 'return' ? 'Return books' : 'Bulk upload'}
                  </h2>
                  {activeForm !== 'bulk' && (
                    <p className="text-[11px] text-zinc-500">
                      {activeForm === 'issue'
                        ? 'Select a borrower, copies, and due date'
                        : 'Find a borrower or scan a book number'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveForm('issue');
                      if (!prefilledBook) setSelectedBookBarcode('');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'issue'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Issue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveForm('return');
                      setSelectedLoanForReturn(null);
                      setSelectedReturnStudent(null);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'return'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Return</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveForm('bulk')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeForm === 'bulk'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-blue-800 hover:bg-blue-100/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bulk</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveForm(null);
                  if (onClearPrefilled) onClearPrefilled();
                }}
                className="self-end sm:self-auto p-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span className="sm:hidden">Close</span>
              </button>
            </div>

            {/* ============================================================ */}
            {/* 2A. ISSUE DESK MODE */}
            {/* ============================================================ */}
            {activeForm === 'issue' && (
              <div className="space-y-4">
                {issuedSlip ? (
                  <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-6 sm:p-7 space-y-4 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                      <span className="font-bold text-blue-950 uppercase tracking-wider text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        Issue Confirmation Receipt ({issuedSlip.books?.length || 1} Books)
                      </span>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                        title="Print Slip"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-slate-700">
                      <div>
                        <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider mb-1">
                          Issued Books ({issuedSlip.books?.length || 1})
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(issuedSlip.books || [{ title: issuedSlip.bookTitle, accession: issuedSlip.accession }]).map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-100">
                              <div className="font-bold text-blue-950 truncate max-w-sm">
                                {idx + 1}. {b.title}
                              </div>
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                                #{getSingleBookNumber(b.barcode || b.accession)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">{issuedSlip.patronType === 'faculty' ? 'Faculty Name' : 'Student Name'}</div>
                          <div className="font-semibold text-sm text-slate-900 mt-0.5">{issuedSlip.patronName}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">{issuedSlip.patronType === 'faculty' ? 'Employee No' : 'PIN / Roll No'}</div>
                          <div className="font-mono font-bold text-sm text-blue-700 mt-0.5">{issuedSlip.patronId}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                        <div>
                          <div className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">Total Books Issued</div>
                          <div className="font-bold text-sm text-blue-950 mt-0.5">{issuedSlip.books?.length || 1} Books</div>
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
                          handleClearSelectedPatron();
                          setSelectedBooks([]);
                          setBookSearchInput('');
                        }}
                        className="flex-1 py-2.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Issue Next Books
                      </button>
                      <button
                        onClick={() => {
                          setIssuedSlip(null);
                          handleClearSelectedPatron();
                          setSelectedBooks([]);
                          setBookSearchInput('');
                          setActiveForm(null);
                        }}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
                    {/* STEP 1: SEARCH FOR A STUDENT OR FACULTY MEMBER */}
                    <div className="relative space-y-2" ref={issueDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-sm text-blue-950">
                          Borrower
                        </label>
                        <span className="text-[11px] text-blue-600">
                          Directory: {memberType === 'faculty' ? 'HRMS' : 'SDMS'}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {['student', 'faculty'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleMemberTypeChange(type)}
                            aria-pressed={memberType === type}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              memberType === type
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                            }`}
                          >
                            {type === 'student' ? 'Student' : 'Faculty'}
                          </button>
                        ))}
                      </div>

                      {!selectedPatron ? (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type="text"
                            required
                            value={patronSearchInput}
                            onChange={(e) => handleIssuePatronSearchChange(e.target.value)}
                            onFocus={() => {
                              if (directoryResults.length > 0) setIsDropdownOpen(true);
                            }}
                            placeholder={memberType === 'faculty' ? 'Search by employee number or name' : 'Search by student PIN or name'}
                            className="w-full pl-10 pr-10 py-2.5 border border-blue-200 rounded-lg text-sm text-slate-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                          />
                          {isSearchingDirectory && (
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-50/40 border border-blue-200 rounded-lg text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <PatronPhoto
                              student={{ ...selectedPatron, patronType: memberType }}
                              className="w-16 h-16 rounded-xl text-xl"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-semibold text-blue-950 text-sm flex items-center gap-2 flex-wrap">
                                <span>{selectedPatron.name || selectedPatron.employee_name}</span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                                  {memberType === 'faculty' ? 'Employee ID' : 'PIN'}: {memberType === 'faculty' ? selectedPatron.emp_no : (selectedPatron.pin_no || selectedPatron.rollNo)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{selectedPatron.department || 'General'}</span>
                                {memberType === 'student' && selectedPatron.year && <span>• <strong className="text-blue-900">{selectedPatron.year}</strong></span>}
                                {memberType === 'student' && selectedPatron.semester && <span>• <span>{selectedPatron.semester}</span></span>}
                                {memberType === 'faculty' && selectedPatron.division && <span>• {selectedPatron.division}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verified {memberType === 'faculty' ? 'HRMS' : 'SDMS'}
                            </span>
                            <button
                              type="button"
                              onClick={handleClearSelectedPatron}
                              className="p-1.5 hover:bg-blue-100/70 rounded-xl text-blue-700 transition-colors cursor-pointer"
                              title={`Change ${memberType}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {directorySearchError && <p className="text-xs text-rose-600">{directorySearchError}</p>}

                      {isDropdownOpen && directoryResults.length > 0 && !selectedPatron && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-md z-50 max-h-60 overflow-y-auto divide-y divide-blue-50 p-1.5">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                            <span>{memberType === 'faculty' ? 'HRMS Employees' : 'SDMS Students'}</span>
                            <span className="text-slate-400 font-normal">{directoryResults.length} found</span>
                          </div>
                          {rankedDirectoryResults.map(patron => {
                            const patronId = memberType === 'faculty'
                              ? patron.emp_no
                              : (patron.pin_no || patron.rollNo);
                            return (
                            <div
                              key={patronId || patron.id || patron.hrms_id}
                              onClick={() => handleSelectPatron(patron)}
                              className="p-2.5 hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <PatronPhoto student={{ ...patron, patronType: memberType }} size="sm" />
                                <div className="overflow-hidden">
                                <div className="font-bold text-blue-950 truncate">{patron.name || patron.employee_name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                  <span className="text-blue-600 font-bold">{patronId}</span>
                                  <span>•</span>
                                  <span className="truncate">{patron.department || 'General'}</span>
                                  {memberType === 'student' && patron.year && <span>• {patron.year}</span>}
                                </div>
                              </div>
                              </div>
                              <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition-colors shrink-0">
                                Select {memberType === 'faculty' ? 'Faculty' : 'Student'}
                              </span>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* STEP 2: SEARCH BY BOOK NUMBER OR TITLE & SELECT MULTIPLE BOOKS */}
                    <div className="relative space-y-2" ref={bookDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-sm text-blue-950 flex items-center gap-2">
                          <span>Books to issue</span>
                          {selectedBooks.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {selectedBooks.length} Book{selectedBooks.length > 1 ? 's' : ''} Selected
                            </span>
                          )}
                        </label>
                        <span className="text-[11px] text-blue-600">
                          Search by individual book number
                        </span>
                      </div>

                      {/* Search by one copy number only */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                        <input
                          type="text"
                          value={bookSearchInput}
                          onChange={(e) => {
                            setBookSearchInput(e.target.value);
                            setIsBookDropdownOpen(true);
                          }}
                          onFocus={() => setIsBookDropdownOpen(true)}
                          inputMode="numeric"
                          aria-label="Search book number"
                          placeholder="Enter a book number"
                          className="w-full pl-10 pr-10 py-2.5 border border-blue-200 rounded-lg text-sm text-slate-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                        />
                        {bookSearchInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setBookSearchInput('');
                              setIsBookDropdownOpen(false);
                            }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown for Book Matches */}
                      {isBookDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-md z-50 max-h-64 overflow-y-auto divide-y divide-blue-50 p-1.5">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Matching Available Book Numbers ({filteredAvailableBooks.length})</span>
                            <span className="text-slate-400 font-normal">Best number matches appear first</span>
                          </div>
                          {filteredAvailableBooks.length > 0 ? (
                            filteredAvailableBooks.map(b => {
                              const copyNumber = String(b.selectedCopy?.accession || b.accession || '');
                              const isAlreadySelected = selectedBooks.some(sb =>
                                String(sb.selectedCopy?.accession || sb.accession || '') === copyNumber
                              );
                              const canAddMore = !isAlreadySelected;

                              return (
                                <div
                                  key={`${b.id || b._id || b.title}-${copyNumber}`}
                                  onClick={() => {
                                    if (canAddMore) handleAddBookToIssue(b);
                                  }}
                                  className={`p-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs ${
                                    canAddMore 
                                      ? 'hover:bg-blue-50/80 cursor-pointer' 
                                      : 'opacity-60 bg-zinc-50 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="overflow-hidden">
                                    <div className="font-bold text-blue-950 flex items-center gap-2 truncate">
                                      <span>{b.title}</span>
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                                        Book #{copyNumber}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                                      <span>Author: {b.author}</span>
                                      <span>•</span>
                                      <span>Shelf: {b.shelf || 'Central Stack'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Available
                                    </span>
                                    {canAddMore ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddBookToIssue(b);
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                                      >
                                        + Add Number
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-200 px-2 py-1 rounded-lg">
                                        Already Selected
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No available copy matches book number "{bookSearchInput}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Books to Issue Basket */}
                      {selectedBooks.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-semibold text-blue-950 flex items-center justify-between">
                            <span>Selected books ({selectedBooks.length})</span>
                            <span className="text-blue-600 font-normal">Search above to add more</span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedBooks.map((book, idx) => (
                              <div
                                key={`${book.id || book.accession}-${idx}`}
                                className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-zinc-900 truncate flex items-center gap-2">
                                      <span>{book.title}</span>
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                                        Book #{book.selectedCopy?.accession || book.accession}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                      <span>Acc: #{book.accession}</span>
                                      <span>•</span>
                                      <span>Author: {book.author}</span>
                                      <span>•</span>
                                      <span>Shelf: {book.shelf || 'Central Stack'}</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveBookFromIssue(idx)}
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Remove from issue list"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl text-center text-xs text-zinc-500">
                          No books selected yet. Enter one book number above and select that individual copy to issue.
                        </div>
                      )}
                    </div>

                    {/* STEP 3: BORROWING WINDOW - FOLLOWS SETTINGS GUIDELINES */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-sm text-blue-950">
                          Loan period
                        </label>
                        <span className="text-[11px] text-blue-600">
                          Standard: {defaultLoanDays} days
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {durationPresets.map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setDurationPreset(days)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              durationPreset === days
                                ? 'bg-blue-600 text-white border-blue-600  '
                                : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                            }`}
                          >
                            {days} days{days === defaultLoanDays ? ' · Standard' : ''}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDurationPreset('manual')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            durationPreset === 'manual'
                              ? 'bg-blue-600 text-white border-blue-600  '
                              : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                          }`}
                        >
                          Choose due date
                        </button>
                      </div>

                      {durationPreset === 'manual' && (
                        <label className="mt-2.5 block space-y-1 text-[11px] font-medium text-blue-950">
                          Due date
                          <input
                            type="date"
                            required
                            min={todayDate}
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="block w-full sm:w-auto px-3 py-2 border border-blue-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                          />
                        </label>
                      )}

                      <div className="mt-2 text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>Due date:</span>
                          <strong className="text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-md font-mono">
                            {calculatedDueDate}
                          </strong>
                        </div>
                        <span className="text-[11px] text-blue-600">
                          Quota limit: {maxBooksQuota} books/patron • Max renewals: {maxRenewals}
                        </span>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="pt-3 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-blue-800/80">
                        Fine policy: ₹{dailyFineRate.toFixed(2)} per overdue day
                      </span>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveForm(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingIssue || selectedBooks.length === 0 || !selectedPatron || (memberType === 'student' && selectedPatron?.status === 'Frozen')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isSubmittingIssue ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Issuing Books...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Issue {selectedBooks.length} {selectedBooks.length === 1 ? 'book' : 'books'}</span>
                            </>
                          )}
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
              <div className="space-y-4">
                {/* 1. TOP: FULL-WIDTH SCAN & SEARCH OPTION */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-sm text-blue-950">
                      Borrower or book number
                    </label>
                    <span className="text-[11px] text-blue-600">
                      Directory: {returnMemberType === 'faculty' ? 'HRMS' : 'SDMS'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {['student', 'faculty'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleReturnMemberTypeChange(type)}
                        aria-pressed={returnMemberType === type}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          returnMemberType === type
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-blue-200 text-blue-900 hover:bg-blue-100/70 bg-blue-50/40'
                        }`}
                      >
                        {type === 'student' ? 'Student' : 'Faculty'}
                      </button>
                    ))}
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
                      aria-label="Search borrower or scan book number"
                      placeholder="Enter name, ID, or book number"
                      className="w-full pl-10 pr-10 py-2.5 border border-blue-200 rounded-lg text-sm text-slate-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                    {isSearchingReturnSdms && (
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}

                    {/* Return Desk Directory Matches */}
                    {isReturnDropdownOpen && returnSdmsResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-blue-200 rounded-2xl shadow-md z-50 max-h-60 overflow-y-auto divide-y divide-blue-50 p-1">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center justify-between">
                          <span>{returnMemberType === 'faculty' ? 'HRMS Employees' : 'SDMS Students'}</span>
                          <span className="text-zinc-400 font-normal">{returnSdmsResults.length} found</span>
                        </div>
                        {rankedReturnResults.map(st => {
                          const patronId = returnMemberType === 'faculty' ? st.emp_no : (st.pin_no || st.rollNo);
                          const patronName = st.name || st.employee_name;
                          const patronLoans = activeLoanCountsByPatron.get(
                            `${returnMemberType}:${normalizePatronId(patronId, returnMemberType)}`
                          ) || 0;

                          return (
                            <div
                              key={patronId || st.id || st.hrms_id}
                              onClick={() => handleSelectReturnStudent(st)}
                              className="p-2.5 hover:bg-blue-50/70 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <PatronPhoto student={{ ...st, patronType: returnMemberType }} size="sm" />
                                <div className="overflow-hidden">
                                <div className="font-bold text-zinc-900 truncate">{patronName}</div>
                                <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                                  <span className="text-blue-600 font-semibold">{patronId}</span>
                                  <span>•</span>
                                  <span className="truncate">{st.department || 'General'}</span>
                                </div>
                              </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${
                                patronLoans > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                              }`}>
                                {patronLoans} Active Loan{patronLoans !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Search the selected directory by name or ID, or scan an individual book number.
                  </p>
                  {returnSearchError && <p className="text-xs text-rose-600">{returnSearchError}</p>}

                  {/* Selected Return Student Badge */}
                  {selectedReturnStudent && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PatronPhoto
                          student={selectedReturnStudent}
                          className="w-16 h-16 rounded-xl text-xl"
                        />
                        <div>
                          <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                            <span>{selectedReturnStudent.name || selectedReturnStudent.employee_name}</span>
                            <span className="font-mono text-blue-700 text-[10px] font-semibold">
                              ({selectedReturnStudent.patronType === 'faculty' ? 'Employee No' : 'PIN'}: {selectedReturnStudent.patronType === 'faculty'
                                ? selectedReturnStudent.emp_no
                                : (selectedReturnStudent.pin_no || selectedReturnStudent.rollNo)})
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

                  {manualReturnBook && (
                    <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Manual Return — No Active Issue Record
                          </div>
                          <div className="mt-1 text-xs font-semibold text-zinc-900">
                            {manualReturnBook.book.title}
                            <span className="ml-2 font-mono text-[11px] text-blue-700">
                              {manualReturnBook.accession || manualReturnBook.copyBarcode}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-amber-800">
                            Select the borrower above and enter the original issue and due dates to save this return in circulation history.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setManualReturnBook(null);
                            setManualReturnIssueDate('');
                            setManualReturnDueDate('');
                          }}
                          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          Cancel Manual Return
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-[11px] font-semibold text-zinc-700">
                          Original Issue Date
                          <input
                            type="date"
                            value={manualReturnIssueDate}
                            onChange={event => setManualReturnIssueDate(event.target.value)}
                            className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-normal"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] font-semibold text-zinc-700">
                          Original Due Date
                          <input
                            type="date"
                            value={manualReturnDueDate}
                            min={manualReturnIssueDate || undefined}
                            onChange={event => setManualReturnDueDate(event.target.value)}
                            className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-normal"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 pt-3">
                        <span className="text-[11px] text-amber-900">
                          {selectedReturnStudent
                            ? `Borrower: ${selectedReturnStudent.name || selectedReturnStudent.employee_name || selectedReturnStudent.student_name}`
                            : 'Choose the borrower from the SDMS / HRMS search above.'}
                        </span>
                        <button
                          type="button"
                          onClick={handleExecuteManualReturn}
                          disabled={!selectedReturnStudent || !manualReturnIssueDate || !manualReturnDueDate || isSubmittingManualReturn}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmittingManualReturn ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Recording Return...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Record Manual Return
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scanned Loan Check-in Card (Shown when a specific loan is scanned or clicked) */}
                  {selectedLoanForReturn && (
                    <div className="border border-blue-200 rounded-2xl p-5 space-y-4 bg-white shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-xs text-blue-950 uppercase tracking-wider">
                            Book ready to return
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
                            Book No: #{getSingleBookNumber(selectedLoanForReturn.accession || selectedLoanForReturn.bookBarcode)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <PatronPhoto
                            student={selectedReturnStudent}
                            className="w-16 h-16 rounded-xl text-xl"
                          />
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Borrower</span>
                            <span className="font-bold text-base text-zinc-900 block">{selectedLoanForReturn.patronName}</span>
                            <span className="font-mono text-xs text-blue-700 font-bold block">
                              {selectedLoanForReturn.patronType === 'faculty' ? 'Employee No' : 'PIN'}: {selectedLoanForReturn.patronId} • {selectedLoanForReturn.department || 'General'}
                            </span>
                          </div>
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
                            <span>Confirm return</span>
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
                      <span>
                        {selectedReturnStudent
                          ? `${selectedReturnStudent.name || selectedReturnStudent.employee_name || 'Selected member'}'s Issued Books`
                          : 'Currently Issued Books Ready to Return'} ({filteredReturnLoans.length})
                      </span>
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      Click any row to inspect or click Return to check in immediately
                    </span>
                  </div>

                  {filteredReturnLoans.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                      {selectedReturnStudent
                        ? `No currently issued books found for ${selectedReturnStudent.name || selectedReturnStudent.employee_name || 'this member'}.`
                        : activeLoans.length === 0
                        ? "Zero circulating loans currently. All physical copies are resting on catalog shelves."
                        : `No active loans match your search term "${returnInput}".`}
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Book Title & Accession</th>
                            <th className="py-2.5 px-3">Borrower</th>
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
                                    Book No: #{getSingleBookNumber(loan.accession || loan.bookBarcode)}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] font-medium text-emerald-700">
                                    Shelf: {loan.shelfLocation || getCatalogShelfForLoan(loan) || 'Not mapped in catalog'}
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
              <div className="flex min-h-0 flex-1 flex-col gap-4">
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
                      <span>Headers: Accession No, TitleId, TitleName, MemberId, MemberName, IssueDate, DueDate (also supports Department, ReturnDate, Status)</span>
                    </div>
                  </div>
                ) : (
                  /* Parsed Circulation Rows Preview & Import Confirmation */
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {bulkCircData.length}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-emerald-950">
                            {bulkFileName || 'Spreadsheet'} {isValidatingBulkMembers ? 'Checking Member Directories' : 'Ready to Import'}
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            {isValidatingBulkMembers
                              ? `Parsed ${bulkCircData.length} records. Matching member IDs with SDMS and HRMS.`
                              : bulkMemberValidationComplete
                              ? `${bulkMatchedRows.length} matched rows will be imported; ${bulkSkippedRowsCount} unmatched rows will be skipped.`
                              : `Parsed ${bulkCircData.length} circulation records. Review and confirm below.`}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              Faculty: {bulkFacultyCount}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Students: {bulkStudentCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          bulkValidationAbortRef.current?.abort();
                          bulkValidationRunRef.current += 1;
                          setBulkCircData([]);
                          setBulkFileName('');
                          setBulkMemberValidationComplete(false);
                          setIsValidatingBulkMembers(false);
                        }}
                        className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl hover:bg-white transition-colors cursor-pointer"
                      >
                        Clear & Choose Another File
                      </button>
                    </div>

                    {isValidatingBulkMembers && (
                      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                        <span>Checking {bulkDirectoryLookupCount} unique member IDs against SDMS and HRMS...</span>
                      </div>
                    )}

                    {bulkMemberValidationComplete && bulkMissingMembers.length > 0 && (
                      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>{bulkMissingMembers.length} member record(s) need attention.</span>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-800">
                          {bulkMissingIdCount
                            ? `${bulkMissingIdCount} record(s) have no member ID; the others were not found in SDMS or HRMS. `
                            : 'These IDs were not found in SDMS or HRMS. '}
                          These rows will be skipped; only directory-matched rows will be imported.
                        </p>
                        <ul className="mt-2 grid max-h-20 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                          {bulkMissingMembers.map(row => (
                            <li key={row.id} className="truncate">
                              <strong>{row.patronId || 'Missing ID'}</strong>
                              {row.patronName ? ` — ${row.patronName}` : ''}
                              <span className="text-amber-700">
                                {row.patronId ? ` (${row.patronType === 'faculty' ? 'HRMS' : 'SDMS'})` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bulkMemberValidationComplete && bulkDirectoryErrors.length > 0 && (
                      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                        <div>
                          <div className="font-bold">Could not verify {bulkDirectoryErrors.length} member ID(s).</div>
                          <p className="mt-0.5 text-[11px]">Directory lookup errors are not treated as missing members.</p>
                          <ul className="mt-1 max-h-12 overflow-y-auto text-[10px]">
                            {bulkDirectoryErrors.slice(0, 8).map(row => (
                              <li key={`${row.patronType}:${row.patronId}`}>
                                {row.patronId} ({row.patronType === 'faculty' ? 'HRMS' : 'SDMS'}): {row.memberDirectoryError}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => void startBulkMemberValidation(bulkCircData)}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-100"
                        >
                          Retry verification
                        </button>
                      </div>
                    )}

                    {bulkMemberValidationComplete && bulkMissingMembers.length === 0 && bulkDirectoryErrors.length === 0 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                        All member IDs matched with SDMS or HRMS. Names and departments are populated from the directories.
                      </div>
                    )}

                    {bulkUnmappedBooks.length > 0 && (
                      <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <div className="font-bold">
                          Shelf location could not be matched for {bulkUnmappedBooks.length} book row(s).
                        </div>
                        <p className="mt-0.5 text-[11px]">
                          Those records can still be imported, but their shelf will show as “Not mapped in catalog.”
                          Check that the spreadsheet accession/barcode exists in the book catalog.
                        </p>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border border-zinc-200 rounded-2xl">
                      <table className="w-full table-fixed text-left text-xs border-collapse">
                        <colgroup>
                          <col className="w-[4%]" />
                          <col className="w-[11%]" />
                          <col className="w-[16%]" />
                          <col className="w-[20%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                          <col className="w-[9%]" />
                        </colgroup>
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-2 text-center">#</th>
                            <th className="py-2.5 px-2">Accession / Barcode</th>
                            <th className="py-2.5 px-2">Book Title</th>
                            <th className="py-2.5 px-2">Member Type, ID & Name</th>
                            <th className="py-2.5 px-2">Department</th>
                            <th className="py-2.5 px-2 text-center">Issue Date</th>
                            <th className="py-2.5 px-2 text-center">Due Date</th>
                            <th className="py-2.5 px-2 text-center">Return Date</th>
                            <th className="py-2.5 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {[
                            { type: 'faculty', title: 'Faculty — numeric member IDs', tone: 'bg-violet-50 text-violet-800' },
                            { type: 'student', title: 'Students — alphanumeric member IDs', tone: 'bg-blue-50 text-blue-800' }
                          ].map(group => {
                            const rows = bulkCircData
                              .map((row, index) => ({ row, index }))
                              .filter(({ row }) => row.patronType === group.type);
                            if (rows.length === 0) return null;
                            return [
                              <tr key={`${group.type}-heading`} className={group.tone}>
                                <td colSpan={9} className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider">
                                  {group.title} ({rows.length})
                                </td>
                              </tr>,
                              ...rows.map(({ row, index }) => (
                                <tr
                                  key={index}
                                  className={`transition-colors ${
                                    row.memberDirectoryStatus === 'missing' || row.memberDirectoryStatus === 'missing-id'
                                      ? 'bg-amber-50/50 hover:bg-amber-100/70'
                                      : 'hover:bg-zinc-50/70'
                                  }`}
                                >
                                  <td className="py-2 px-2 text-center text-zinc-400 font-mono text-[10px]">{index + 1}</td>
                                  <td className="py-2 px-2 font-mono font-bold text-blue-700 break-words">{row.accession || row.bookBarcode || '—'}</td>
                                  <td className="py-2 px-2 break-words">
                                    <div className="font-semibold text-zinc-900">{row.bookTitle || 'Untitled Book'}</div>
                                    {row.bookTitleId && (
                                      <div className="mt-0.5 text-[10px] font-mono text-blue-700">
                                        Title ID: {row.bookTitleId}
                                      </div>
                                    )}
                                    <div className={`mt-0.5 text-[10px] font-medium ${
                                      row.shelfLocation || getCatalogShelfForLoan(row)
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'
                                    }`}>
                                      Shelf: {row.shelfLocation || getCatalogShelfForLoan(row) || 'Not mapped in catalog'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 break-words">
                                    <span className={`inline-block px-1.5 py-0.5 mb-1 rounded text-[9px] font-bold ${
                                      row.patronType === 'faculty'
                                        ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {row.patronType === 'faculty' ? 'FACULTY · HRMS' : 'STUDENT · SDMS'}
                                    </span>
                                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                                      <span className="font-mono text-blue-600 font-semibold">{row.patronId}</span>
                                      <span className="font-bold text-zinc-800">{row.patronName}</span>
                                    </div>
                                    {row.memberDirectoryStatus === 'found' && (
                                      <span className="mt-1 inline-block text-[9px] font-semibold text-emerald-700">Directory matched</span>
                                    )}
                                    {(row.memberDirectoryStatus === 'missing' || row.memberDirectoryStatus === 'missing-id') && (
                                      <span className="mt-1 inline-block text-[9px] font-bold text-amber-700">
                                        {row.memberDirectoryStatus === 'missing-id' ? 'Member ID missing' : 'Not found in directory'}
                                      </span>
                                    )}
                                    {row.memberDirectoryStatus === 'error' && (
                                      <span className="mt-1 inline-block text-[9px] font-bold text-rose-700">Directory check failed</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-zinc-600 break-words">{row.department || 'General'}</td>
                                  <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">{row.issueDateFormatted || row.issueDate}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-zinc-900 whitespace-nowrap">{row.dueDateFormatted || row.dueDate}</td>
                                  <td className="py-2 px-2 text-center text-emerald-800 font-medium whitespace-nowrap">{row.returnDateFormatted || row.returnDate || '—'}</td>
                                  <td className="py-2 px-2 text-center">
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
                              ))
                            ];
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions Bar */}
                    <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 bg-white pt-3 pb-1">
                      <span className="text-xs text-zinc-500">
                        Importing <strong>{bulkMatchedRows.length}</strong> matched records
                        {bulkSkippedRowsCount > 0 && (
                          <> · Skipping <strong>{bulkSkippedRowsCount}</strong> unmatched</>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={isImportingBulkCirc || isValidatingBulkMembers || !bulkMemberValidationComplete || bulkMatchedRows.length === 0}
                        onClick={handleExecuteBulkCircImport}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isValidatingBulkMembers ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Verifying Members...</span>
                          </>
                        ) : isImportingBulkCirc ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Importing Records...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Import Matched Records ({bulkMatchedRows.length})</span>
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
            <div className="text-2xl font-black text-zinc-900 mt-1">{memberFilteredActiveLoans.length} <span className="text-xs font-semibold text-slate-500">Loans</span></div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Faculty and students currently borrowing</div>
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
            <div className="text-2xl font-black text-rose-700 mt-1">{memberFilteredOverdueLoans.length}</div>
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
            <div className="text-2xl font-black text-teal-800 mt-1">{memberFilteredReturnedLoans.length}</div>
            <div className="text-[10px] text-teal-600 mt-0.5">Completed & returned records</div>
          </div>
        </div>

        {/* Search & Filter Toolbar: Active, Overdue, History, and Logs */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-medium text-zinc-500">Member type</span>
            <div className="inline-flex items-center gap-1 border border-zinc-200 rounded-xl p-0.5 bg-zinc-50" role="group" aria-label="Filter by member type">
              {[
                { value: 'all', label: 'All' },
                { value: 'faculty', label: 'Faculty' },
                { value: 'student', label: 'Students' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={memberTypeFilter === option.value}
                  onClick={() => setMemberTypeFilter(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    memberTypeFilter === option.value ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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

            {loanStatusFilter !== 'logs' && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 text-zinc-500 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Issue date
                </span>
                <label className="sr-only" htmlFor="loan-date-from">Issue date from</label>
                <input
                  id="loan-date-from"
                  type="date"
                  value={loanDateFrom}
                  max={loanDateTo || undefined}
                  onChange={event => setLoanDateFrom(event.target.value)}
                  className="px-2.5 py-2 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:border-blue-600"
                  aria-label="Issue date from"
                />
                <span className="text-zinc-400">to</span>
                <label className="sr-only" htmlFor="loan-date-to">Issue date to</label>
                <input
                  id="loan-date-to"
                  type="date"
                  value={loanDateTo}
                  min={loanDateFrom || undefined}
                  onChange={event => setLoanDateTo(event.target.value)}
                  className="px-2.5 py-2 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:border-blue-600"
                  aria-label="Issue date to"
                />
                {(loanDateFrom || loanDateTo) && (
                  <button
                    type="button"
                    onClick={() => { setLoanDateFrom(''); setLoanDateTo(''); }}
                    className="px-2 py-1.5 text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            )}

            {/* Clean filter buttons: Issued Books, Overdue, Return History, and Activity Logs */}
            <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 text-xs bg-zinc-50 flex-wrap">
              <button
                type="button"
                onClick={() => setLoanStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'active' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Issued Books ({memberFilteredActiveLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'overdue' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Overdue Books ({memberFilteredOverdueLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'history' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Return History ({memberFilteredReturnedLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('logs')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  loanStatusFilter === 'logs' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Activity Logs ({memberFilteredCirculationLogs.length})</span>
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
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Book & Number</th>
                      <th className="py-3 px-3">Member Name & ID</th>
                      <th className="py-3 px-3">Staff</th>
                      <th className="py-3 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCirculationLogs.map((log, idx) => {
                      const isReturn = log.action.includes('RETURN');
                      const isBulk = log.action.includes('BULK');
                      const isRenew = log.action.includes('RENEW');
                      return (
                        <tr 
                          key={log.id || idx} 
                          onClick={() => handleInspectLoan({
                            ...log,
                            id: log.id || idx,
                            bookBarcode: log.accession,
                            status: log.action.includes('RETURN') ? 'Returned' : 'Borrowed',
                            issueDateFormatted: log.timestamp,
                            returnedDateFormatted: log.action.includes('RETURN') ? log.timestamp : null
                          })}
                          className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                          title="Click row to inspect book issue details"
                        >
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
                              Book No: #{getSingleBookNumber(log.accession)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{log.patronName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-blue-700 font-bold">
                                Roll No: {log.patronId}
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
                No issued books match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <th className="py-3 px-3">Book Title & Number</th>
                      <th className="py-3 px-3">Member Name & ID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Issue Date</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Return Date</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredLoans.map(loan => {
                      const isOverdue = loan.status === 'Overdue';
                      const isReturned = loan.status === 'Returned';
                      const actualReturnFormatted = getFormattedReturnDate(loan);

                      return (
                        <tr 
                          key={loan.id} 
                          onClick={() => handleInspectLoan(loan)}
                          className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                          title="Click row to inspect book issue details"
                        >
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{loan.bookTitle}</div>
                            <span className="font-mono text-[10px] text-zinc-500 font-medium">
                              Book No: #{getSingleBookNumber(loan.accession || loan.bookBarcode)}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-medium text-emerald-700">
                              Shelf: {loan.shelfLocation || getCatalogShelfForLoan(loan) || 'Not mapped in catalog'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-zinc-900">{loan.patronName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-blue-700 font-bold">
                                Roll No: {loan.patronId}
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

                          {/* 2. DUE DATE */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-zinc-900 font-mono text-[11px]">
                              {loan.dueDateFormatted || loan.dueDate}
                            </div>
                            {isOverdue && !isReturned ? (
                              <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Overdue</span>
                            ) : !isReturned ? (
                              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Issued</span>
                            ) : null}
                          </td>

                          {/* 3. RETURN DATE */}
                          <td className="py-3.5 px-3">
                            {isReturned ? (
                              <div>
                                <div className="font-bold text-emerald-800 flex items-center gap-1.5 font-mono text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="text-emerald-950 font-bold">{actualReturnFormatted}</span>
                                </div>
                                <span className="text-[10px] text-teal-700 font-medium block mt-0.5">
                                  Returned to Library
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
                                  <span>Returned</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleExecuteReturn(loan); }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Process book return"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Return</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleExecuteReissue(loan); }}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                                    title="Extend return date by 15 days"
                                  >
                                    <RefreshCw className="w-3 h-3 text-blue-600" />
                                    <span>Renew</span>
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

      {/* 3. Book Issue Details Popup Dialog */}
      {inspectingLoan && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setInspectingLoan(null);
              setInspectingStudent(null);
            }
          }}
        >
          <div className="bg-white border border-blue-200/90 rounded-2xl shadow-md p-6 sm:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-blue-950">Book Issue Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student & Book Information • Book No: #{getSingleBookNumber(inspectingLoan.accession || inspectingLoan.bookBarcode)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  inspectingLoan.status === 'Overdue'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : inspectingLoan.status === 'Returned'
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {inspectingLoan.status === 'Returned' ? 'Returned to Library' : inspectingLoan.status}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setInspectingLoan(null);
                    setInspectingStudent(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Borrower Card with a directory-backed profile photo */}
            <div className="p-4 sm:p-5 bg-white border border-blue-200 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <PatronPhoto
                  student={inspectingStudent || {
                    name: inspectingLoan.patronName,
                    pin_no: inspectingLoan.patronId,
                    emp_no: inspectingLoan.patronId,
                    patronType: inspectingLoan.patronType || 'student',
                    has_photo: inspectingLoan.patronType === 'faculty',
                    department: inspectingLoan.department,
                    photo: inspectingLoan.patronPhoto
                  }} 
                  size="card" 
                />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    {inspectingLoan.patronType === 'faculty' ? 'Faculty Details' : 'Student Details'}
                  </span>
                  <div className="font-bold text-blue-950 text-base flex items-center gap-2.5 flex-wrap">
                    <span>{inspectingLoan.patronName}</span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-200">
                      {inspectingLoan.patronType === 'faculty' ? 'Employee No' : 'Roll No / PIN'}: {inspectingLoan.patronId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>{inspectingStudent?.department || inspectingLoan.department || 'General'}</span>
                    {inspectingStudent?.year && <span>• <strong>{inspectingStudent.year}</strong></span>}
                    {inspectingStudent?.semester && <span>• {inspectingStudent.semester}</span>}
                  </div>
                  {inspectingStudent?.email && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      {inspectingStudent.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified {inspectingLoan.patronType === 'faculty' ? 'HRMS Faculty' : 'SDMS Student'}
                </span>
                <span className="text-[10px] text-slate-400">College Database</span>
              </div>
            </div>

            {/* Book Information */}
            <div className="border border-blue-100 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Book Details
              </span>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Title</span>
                  <strong className="text-sm text-slate-900 block mt-0.5">{inspectingLoan.bookTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Book Number</span>
                  <strong className="font-mono text-sm text-blue-700 block mt-0.5">
                    #{getSingleBookNumber(inspectingLoan.accession || inspectingLoan.bookBarcode)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Shelf Location</span>
                  <span className="font-medium text-slate-700 block mt-0.5">
                    {inspectingLoan.shelf || 'Central Stack'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Category</span>
                  <span className="font-medium text-slate-700 block mt-0.5">
                    {inspectingLoan.category || 'General Catalog'}
                  </span>
                </div>
              </div>
            </div>

            {/* Issue & Return Dates */}
            <div className="border border-blue-100 rounded-2xl p-4 sm:p-5 bg-slate-50/50 space-y-3 text-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Issue & Return Dates
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Issue Date</span>
                  <strong className="text-xs text-slate-900 font-mono block mt-1">
                    {inspectingLoan.issueDateFormatted || inspectingLoan.issueDate || 'Standard'}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Due Date</span>
                  <strong className={`text-xs font-mono block mt-1 ${
                    inspectingLoan.status === 'Overdue' && inspectingLoan.status !== 'Returned'
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-900'
                  }`}>
                    {inspectingLoan.dueDateFormatted || inspectingLoan.dueDate}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Return Date</span>
                  {inspectingLoan.status === 'Returned' ? (
                    <strong className="text-xs text-emerald-700 font-mono block mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {getFormattedReturnDate(inspectingLoan)}
                    </strong>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium block mt-1">
                      Issued (Not Returned Yet)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setInspectingLoan(null);
                  setInspectingStudent(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {inspectingLoan.status !== 'Returned' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleExecuteReissue(inspectingLoan);
                        setInspectingLoan(null);
                        setInspectingStudent(null);
                      }}
                      className="px-4 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Renew (+15 Days)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleExecuteReturn(inspectingLoan);
                        setInspectingLoan(null);
                        setInspectingStudent(null);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Return Book</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintSlip(inspectingLoan)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Print receipt"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
