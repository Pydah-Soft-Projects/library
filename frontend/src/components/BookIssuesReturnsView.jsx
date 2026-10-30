import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftRight, User, Calendar, Clock, AlertTriangle, 
  CheckCircle2, Search, Printer, Check, X, RefreshCw, 
  BookOpen, Layers, ShieldCheck, Database, Sparkles, ChevronRight
} from 'lucide-react';

export default function BookIssuesReturnsView({
  books = [],
  loans = [],
  students = [],
  onIssueBook,
  onReturnBook,
  onRenewLoan,
  onCollectCash,
  onOpenUpiModal,
  onOpenWaiveModal,
  prefilledBook,
  onClearPrefilled,
  initialSection = 'issue',
  onToast
}) {
  // Top Desk Mode: 'issue' or 'return'
  const [deskMode, setDeskMode] = useState(initialSection === 'return' ? 'return' : 'issue');

  useEffect(() => {
    if (initialSection) {
      setDeskMode(initialSection === 'return' ? 'return' : 'issue');
    }
  }, [initialSection]);

  // ==================== ISSUE DESK STATE ====================
  const availableBooks = books.filter(b => (b.available || 0) > 0);
  const [selectedBookBarcode, setSelectedBookBarcode] = useState(
    prefilledBook ? prefilledBook.barcode : (availableBooks[0]?.barcode || '')
  );

  useEffect(() => {
    if (prefilledBook) {
      setSelectedBookBarcode(prefilledBook.barcode);
      setDeskMode('issue');
    }
  }, [prefilledBook]);

  // SDMS Student Search State
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [sdmsResults, setSdmsResults] = useState([]);
  const [isSearchingSdms, setIsSearchingSdms] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchDebounceRef = useRef(null);

  const [durationPreset, setDurationPreset] = useState(30);
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [issuedSlip, setIssuedSlip] = useState(null);

  const selectedBook = books.find(b => b.barcode === selectedBookBarcode || b.accession === selectedBookBarcode);

  // Live SDMS Database Student Lookup by Name or PIN Number
  useEffect(() => {
    const query = (studentSearchInput || '').trim();
    if (!query) {
      setSdmsResults([]);
      setIsSearchingSdms(false);
      return;
    }

    if (selectedStudent && (selectedStudent.name === query || selectedStudent.pin_no === query || selectedStudent.rollNo === query)) {
      return;
    }

    clearTimeout(searchDebounceRef.current);
    setIsSearchingSdms(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sdms/students?search=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.students)) {
          setSdmsResults(data.students);
          setIsDropdownOpen(true);
        } else {
          setSdmsResults([]);
        }
      } catch (err) {
        console.warn('SDMS search error:', err.message);
        // Fallback to local students list
        const clean = query.toLowerCase();
        const localMatches = students.filter(s => 
          (s.name && s.name.toLowerCase().includes(clean)) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(clean)) ||
          (s.id && String(s.id).toLowerCase().includes(clean))
        ).slice(0, 8);
        setSdmsResults(localMatches);
        setIsDropdownOpen(true);
      } finally {
        setIsSearchingSdms(false);
      }
    }, 250);

    return () => clearTimeout(searchDebounceRef.current);
  }, [studentSearchInput, selectedStudent, students]);

  const handleSelectStudent = (st) => {
    setSelectedStudent(st);
    setStudentSearchInput(`${st.name} [${st.pin_no || st.rollNo}]`);
    setIsDropdownOpen(false);
  };

  const calculateDueDateStr = () => {
    if (durationPreset === 'manual') {
      if (!manualDate) return 'Select date';
      const parsed = new Date(manualDate);
      return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(durationPreset));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calculatedDueDate = calculateDueDateStr();

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!selectedBook) {
      if (onToast) onToast('Please select a book from inventory.', 'danger');
      return;
    }
    if ((selectedBook.available || 0) <= 0) {
      if (onToast) onToast(`"${selectedBook.title}" has 0 copies available on shelf.`, 'danger');
      return;
    }
    if (!selectedStudent) {
      if (onToast) onToast('Please select a verified student by Name or PIN Number from SDMS database.', 'danger');
      return;
    }
    if (selectedStudent.status === 'Frozen') {
      if (onToast) onToast(`Patron account for ${selectedStudent.name} is FROZEN. Clear penalties first.`, 'danger');
      return;
    }

    const finalPatronId = selectedStudent.pin_no || selectedStudent.rollNo || selectedStudent.id;
    onIssueBook(selectedBook.barcode, finalPatronId, calculatedDueDate, selectedStudent);

    setIssuedSlip({
      bookTitle: selectedBook.title,
      accession: selectedBook.accession,
      patronName: selectedStudent.name,
      patronId: finalPatronId,
      department: selectedStudent.department,
      issueDate: 'Today',
      dueDate: calculatedDueDate,
      shelf: selectedBook.shelf
    });

    if (onClearPrefilled) onClearPrefilled();
  };

  // ==================== RETURN / REISSUE DESK ====================
  const [returnInput, setReturnInput] = useState('');
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);

  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = activeLoans.filter(l => l.status === 'Overdue');
  const onScheduleLoans = activeLoans.filter(l => l.status !== 'Overdue');
  const totalPendingFines = overdueLoans.length * 25.0; // Standard estimation

  const handleSelectLoanToReturn = (loan) => {
    setSelectedLoanForReturn(loan);
    setReturnInput(loan.accession || loan.bookBarcode || loan.patronId);
    setDeskMode('return');
  };

  const handleScanOrSearchReturn = (val) => {
    setReturnInput(val);
    const clean = val.trim().toLowerCase();
    if (!clean) {
      setSelectedLoanForReturn(null);
      return;
    }
    const match = activeLoans.find(l => 
      (l.accession && l.accession.toLowerCase() === clean) ||
      (l.bookBarcode && l.bookBarcode.toLowerCase() === clean) ||
      (l.patronId && l.patronId.toLowerCase() === clean) ||
      (l.patronName && l.patronName.toLowerCase() === clean)
    );
    setSelectedLoanForReturn(match || null);
  };

  const handleExecuteReturn = (loanToReturn = null) => {
    const target = loanToReturn || selectedLoanForReturn;
    if (!target) {
      if (onToast) onToast('Please specify a valid active loan or barcode to return.', 'danger');
      return;
    }
    onReturnBook(target.bookBarcode || target.accession);
    if (selectedLoanForReturn && selectedLoanForReturn.id === target.id) {
      setSelectedLoanForReturn(null);
      setReturnInput('');
    }
  };

  const handleExecuteReissue = (loanToReissue = null) => {
    const target = loanToReissue || selectedLoanForReturn;
    if (!target) {
      if (onToast) onToast('Please select a loan to re-issue / renew.', 'danger');
      return;
    }
    if (onRenewLoan) {
      onRenewLoan(target);
    }
    if (selectedLoanForReturn && selectedLoanForReturn.id === target.id) {
      setSelectedLoanForReturn(null);
      setReturnInput('');
    }
  };

  const isReturnOverdue = selectedLoanForReturn?.status === 'Overdue';
  const estimatedFine = isReturnOverdue ? 25.0 : 0.0;

  // ==================== BOTTOM ISSUED DATA TABLE STATE ====================
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('all');

  const filteredLoans = activeLoans.filter(l => {
    if (loanStatusFilter === 'overdue' && l.status !== 'Overdue') return false;
    if (loanStatusFilter === 'active' && l.status === 'Overdue') return false;

    if (!loanSearchTerm) return true;
    const q = loanSearchTerm.toLowerCase();
    return (
      (l.bookTitle && l.bookTitle.toLowerCase().includes(q)) ||
      (l.patronName && l.patronName.toLowerCase().includes(q)) ||
      (l.patronId && l.patronId.toLowerCase().includes(q)) ||
      (l.accession && l.accession.toLowerCase().includes(q)) ||
      (l.department && l.department.toLowerCase().includes(q))
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

        {/* Prominent Desk Mode Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeskMode('issue')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs ${
              deskMode === 'issue'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Issue Book</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskMode('return')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs ${
              deskMode === 'return'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Return / Re-issue</span>
            {overdueLoans.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {overdueLoans.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Top Interactive Desk Section */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-6">
        {/* ============================================================ */}
        {/* 2A. ISSUE DESK MODE */}
        {/* ============================================================ */}
        {deskMode === 'issue' && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column: Issue Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
                {/* 1. Book Selection */}
                <div>
                  <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                    1. Select Book from Shelf
                  </label>
                  <select
                    value={selectedBookBarcode}
                    onChange={(e) => setSelectedBookBarcode(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    {availableBooks.length === 0 ? (
                      <option value="">No books currently available on shelf</option>
                    ) : (
                      availableBooks.map(b => (
                        <option key={b.barcode || b.id} value={b.barcode}>
                          {b.title} [{b.accession}] — {b.available} copies available ({b.shelf})
                        </option>
                      ))
                    )}
                  </select>

                  {selectedBook && (
                    <div className="mt-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
                      <span className="truncate">
                        Author: <strong>{selectedBook.author}</strong> • Shelf: <strong>{selectedBook.shelf}</strong>
                      </span>
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 shrink-0">
                        {selectedBook.available} copies in stock
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. SDMS Student Search by Name or PIN Number */}
                <div className="relative">
                  <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                    2. Search Student from SDMS (By Name or PIN Number)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={studentSearchInput}
                      onChange={(e) => {
                        setStudentSearchInput(e.target.value);
                        if (selectedStudent && e.target.value !== selectedStudent.name) {
                          setSelectedStudent(null);
                        }
                      }}
                      onFocus={() => {
                        if (sdmsResults.length > 0) setIsDropdownOpen(true);
                      }}
                      placeholder="Type student PIN (e.g. 246T1A0301) or Name (e.g. Manoj, Venkatesh)..."
                      className="w-full pl-10 pr-10 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-600 transition-colors"
                    />
                    {isSearchingSdms && (
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* Live SDMS Autocomplete Dropdown */}
                  {isDropdownOpen && sdmsResults.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-zinc-100 p-1">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center justify-between">
                          <span>SDMS Database Matches</span>
                          <span className="text-zinc-400 font-normal">{sdmsResults.length} found</span>
                        </div>
                        {sdmsResults.map(st => (
                          <div
                            key={st.id || st.pin_no || st.rollNo}
                            onClick={() => handleSelectStudent(st)}
                            className="p-2.5 hover:bg-blue-50/70 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="overflow-hidden">
                              <div className="font-bold text-zinc-900 truncate">{st.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                                <span className="text-blue-600 font-semibold">{st.pin_no || st.rollNo}</span>
                                <span>•</span>
                                <span className="truncate">{st.department}</span>
                                {st.year && <span>• {st.year}</span>}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Selected Verified Student Card */}
                  {selectedStudent && (
                    <div className="mt-2.5 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {selectedStudent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 flex items-center gap-2">
                            <span>{selectedStudent.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                              PIN: {selectedStudent.pin_no || selectedStudent.rollNo}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {selectedStudent.department} • {selectedStudent.year || 'Student'}
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified SDMS
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Borrowing Duration */}
                <div>
                  <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                    3. Borrowing Window
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[7, 14, 21, 30].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDurationPreset(days)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          durationPreset === days
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 bg-white'
                        }`}
                      >
                        {days} Days {days === 30 && '(Standard)'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDurationPreset('manual')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        durationPreset === 'manual'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 bg-white'
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
                        className="px-3.5 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  )}

                  <div className="mt-2 text-xs text-zinc-500">
                    Calculated Due Date: <strong className="text-zinc-900 font-bold">{calculatedDueDate}</strong>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    Standard overdue tariff: ₹5.00/day
                  </span>

                  <button
                    type="submit"
                    disabled={!selectedBook || !selectedStudent || selectedStudent?.status === 'Frozen'}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Issue Book to Student</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Receipt Slip or Rules */}
            <div className="lg:col-span-5 space-y-4">
              {issuedSlip ? (
                <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-blue-200">
                    <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      Issue Confirmation Receipt
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Print Slip"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-zinc-700">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Book Title</div>
                      <div className="font-bold text-sm text-zinc-900">{issuedSlip.bookTitle}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Student Name</div>
                        <div className="font-semibold text-zinc-900">{issuedSlip.patronName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">PIN / Roll No</div>
                        <div className="font-mono font-bold text-blue-700">{issuedSlip.patronId}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Accession / Code</div>
                        <div className="font-mono text-zinc-800">{issuedSlip.accession}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Due Date</div>
                        <div className="font-bold text-emerald-700">{issuedSlip.dueDate}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIssuedSlip(null);
                      setStudentSearchInput('');
                      setSelectedStudent(null);
                    }}
                    className="w-full py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold transition-colors mt-2"
                  >
                    Issue Next Book
                  </button>
                </div>
              ) : (
                <div className="p-5 border border-zinc-200 rounded-2xl bg-zinc-50/50 space-y-3 text-xs text-zinc-600">
                  <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    SDMS Lending Guidelines
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <p>• Type any student's name or university PIN number to fetch live verified records from SDMS.</p>
                    <p>• Borrowing privileges are automatically synchronized with student enrollment status.</p>
                    <p>• Default loan duration is 30 days. Borrowers may renew (+15 days) prior to due date.</p>
                    <p>• Overdue loans incur ₹5.00/day fine, payable at Circulation Desk via Cash or UPI QR.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2B. RETURN & RE-ISSUE DESK MODE */}
        {/* ============================================================ */}
        {deskMode === 'return' && (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Scan Barcode or Search by Student PIN / Name
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={returnInput}
                    onChange={(e) => handleScanOrSearchReturn(e.target.value)}
                    placeholder="Scan barcode, accession code, or type student PIN (e.g. 246T1A0301)..."
                    className="w-full pl-10 pr-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              {selectedLoanForReturn ? (
                <div className="p-5 border border-blue-200 bg-blue-50/20 rounded-2xl space-y-3.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900">{selectedLoanForReturn.bookTitle}</h3>
                      <p className="text-zinc-500 mt-0.5">
                        Borrower: <strong className="text-zinc-800">{selectedLoanForReturn.patronName}</strong> (PIN: <span className="font-mono font-semibold text-blue-700">{selectedLoanForReturn.patronId}</span>)
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                      selectedLoanForReturn.status === 'Overdue'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {selectedLoanForReturn.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-zinc-600 text-[11px]">
                    <div><span className="text-zinc-400">Due Date:</span> <strong>{selectedLoanForReturn.dueDateFormatted}</strong></div>
                    <div><span className="text-zinc-400">Accession Code:</span> <span className="font-mono">{selectedLoanForReturn.accession}</span></div>
                  </div>

                  {isReturnOverdue && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs">Overdue Penalty: ₹{estimatedFine.toFixed(2)}</div>
                        <div className="text-[10px] opacity-80">Calculated under institutional fine policy</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {onOpenUpiModal && (
                          <button
                            type="button"
                            onClick={() => onOpenUpiModal({
                              id: Date.now(),
                              patronId: selectedLoanForReturn.patronId,
                              patronName: selectedLoanForReturn.patronName,
                              amount: estimatedFine
                            })}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                          >
                            UPI QR
                          </button>
                        )}
                        {onCollectCash && (
                          <button
                            type="button"
                            onClick={() => onCollectCash({
                              id: Date.now(),
                              patronId: selectedLoanForReturn.patronId,
                              patronName: selectedLoanForReturn.patronName,
                              amount: estimatedFine
                            })}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold"
                          >
                            Cash
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Return and Reissue Action Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleExecuteReturn()}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Return & Reshelve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteReissue()}
                      className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Re-issue (+15d)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl space-y-1">
                  <div>Type a student PIN number, book accession, or click any active loan below to process.</div>
                </div>
              )}
            </div>

            {/* Right Column: Currently Circulating Quick Peek */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <h4 className="font-bold text-xs text-zinc-700 uppercase tracking-wider">
                  Quick Select Active Loans ({activeLoans.length})
                </h4>
              </div>

              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl max-h-[340px] overflow-y-auto">
                {activeLoans.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">Zero circulating loans currently.</div>
                ) : (
                  activeLoans.map(loan => (
                    <div
                      key={loan.id}
                      onClick={() => handleSelectLoanToReturn(loan)}
                      className="py-2.5 px-3 hover:bg-blue-50/50 cursor-pointer transition-colors text-xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-900 truncate">{loan.bookTitle}</div>
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {loan.patronName} <span className="font-mono text-blue-600 font-semibold">({loan.patronId})</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 shrink-0">
                        {loan.accession}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. BOTTOM SECTION: ALL ISSUED DATA WITH STATS */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-4 border-t border-zinc-200/90">
        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Total Circulations</div>
            <div className="text-2xl font-black text-zinc-900 mt-1">{activeLoans.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Total checked-out physical copies</div>
          </div>

          <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">On-Time / Active</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{onScheduleLoans.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Within 30-day lending window</div>
          </div>

          <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue Alerts</div>
            <div className="text-2xl font-black text-rose-700 mt-1">{overdueLoans.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Exceeded return due date</div>
          </div>

          <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Accrued Fines</div>
            <div className="text-2xl font-black text-amber-700 mt-1">₹{totalPendingFines.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Pending fine receipts across patrons</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={loanSearchTerm}
                onChange={(e) => setLoanSearchTerm(e.target.value)}
                placeholder="Search issued books by student name, PIN number, accession..."
                className="w-full pl-10 pr-3.5 py-2 text-xs border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 text-xs bg-zinc-50">
              <button
                type="button"
                onClick={() => setLoanStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'all' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Issued ({activeLoans.length})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  loanStatusFilter === 'active' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                On Schedule ({onScheduleLoans.length})
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
            </div>
          </div>

          {/* Full Issued Books Table */}
          {filteredLoans.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400 border-t border-zinc-100">
              No circulating loans match your filter criteria.
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
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Desk Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLoans.map(loan => {
                    const isOverdue = loan.status === 'Overdue';
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

                        <td className="py-3.5 px-3 text-zinc-600">
                          {loan.issueDateFormatted || 'Standard'}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-zinc-900">{loan.dueDateFormatted}</div>
                          {isOverdue ? (
                            <span className="text-[10px] text-rose-600 font-bold">Penalty Accruing</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Active Loan</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {loan.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Return Button */}
                            <button
                              type="button"
                              onClick={() => handleExecuteReturn(loan)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                              title="Process book return"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>

                            {/* Reissue / Renew Button */}
                            <button
                              type="button"
                              onClick={() => handleExecuteReissue(loan)}
                              className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                              title="Re-issue / Extend loan window by 15 days"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
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
    </div>
  );
}
