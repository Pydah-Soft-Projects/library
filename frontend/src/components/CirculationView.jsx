import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, BookOpen, User, Calendar, Clock, AlertTriangle, 
  CheckCircle, ArrowRight, ArrowUpRight, Search, Filter, Sparkles, 
  Layers, Check, Printer, BookmarkCheck, ShieldAlert, X
} from 'lucide-react';

export default function CirculationView({ 
  books = [], 
  loans = [], 
  students = [],
  onIssueBook, 
  onReturnBook, 
  prefilledBook, 
  onClearPrefilled,
  initialSection = 'desk',
  onToast 
}) {
  // Section tabs: 'desk' (Issue & Return Desk) | 'checked_out' (Live Checked-Out Books)
  const [activeSection, setActiveSection] = useState(initialSection || 'desk');

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Available book selection
  const initialAvailableBook = books.find(b => b.available > 0) || books[0];
  const [selectedBookBarcode, setSelectedBookBarcode] = useState(
    prefilledBook ? prefilledBook.barcode : (initialAvailableBook?.barcode || '')
  );

  // Update selected book if prefilledBook changes
  useEffect(() => {
    if (prefilledBook) {
      setSelectedBookBarcode(prefilledBook.barcode);
    }
  }, [prefilledBook]);

  // Book search term inside checkout
  const [bookSearchTerm, setBookSearchTerm] = useState('');

  // Selected patron ID for checkout
  const [studentId, setStudentId] = useState('');

  // Loan Duration Preset / Manual Selection (7, 14, 21, 30 days, or manual)
  const [durationPreset, setDurationPreset] = useState(30);
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Calculate formatted due date
  const calculateDueDate = () => {
    if (durationPreset === 'manual') {
      if (!manualDate) return 'Select date';
      const parsed = new Date(manualDate);
      return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(durationPreset));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formattedDueDate = calculateDueDate();

  // Instant loan slip receipt state
  const [issuedSlip, setIssuedSlip] = useState(null);

  // Quick Return state
  const [returnBarcode, setReturnBarcode] = useState('');

  // Books Checked Out filter & search
  const [checkedOutFilter, setCheckedOutFilter] = useState('all');
  const [checkedOutSearch, setCheckedOutSearch] = useState('');

  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueCount = activeLoans.filter(l => l.status === 'Overdue').length;
  const onTimeCount = activeLoans.filter(l => l.status !== 'Overdue').length;

  // Resolved Selected Book
  const selectedBookObj = books.find(b => b.barcode === selectedBookBarcode || b.accession === selectedBookBarcode);

  // Resolved Selected Patron
  const cleanStudentInput = (studentId || '').trim().toLowerCase();
  const selectedStudentObj = students.find(s => 
    (s.id && s.id.toLowerCase() === cleanStudentInput) || 
    (s.rollNo && s.rollNo.toLowerCase() === cleanStudentInput) ||
    (s.name && s.name.toLowerCase() === cleanStudentInput) ||
    (s.email && s.email.toLowerCase() === cleanStudentInput)
  );

  const isStudentFrozen = selectedStudentObj && selectedStudentObj.status === 'Frozen';

  // Check if this student already borrowed this specific book
  const studentAlreadyHasBook = selectedStudentObj && activeLoans.some(l => 
    (l.patronId === selectedStudentObj.id || l.patronId === selectedStudentObj.rollNo) &&
    (l.bookBarcode === selectedBookBarcode || l.accession === selectedBookObj?.accession)
  );

  // Filter books for search
  const filteredBooks = books.filter(b => {
    if (!bookSearchTerm) return true;
    const q = bookSearchTerm.toLowerCase();
    return b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.accession.toLowerCase().includes(q) ||
      b.barcode.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q);
  });

  // Handle Book Issue Submit
  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!selectedBookObj) {
      if (onToast) onToast('Please select a textbook to issue.', 'danger');
      return;
    }
    if (selectedBookObj.available <= 0) {
      if (onToast) onToast(`Cannot issue: "${selectedBookObj.title}" has 0 copies available.`, 'danger');
      return;
    }
    if (!selectedStudentObj) {
      if (onToast) onToast(`Cannot issue book: Patron "${studentId}" is NOT registered in the library. Only enrolled students in the database can borrow books.`, 'danger');
      return;
    }
    if (isStudentFrozen) {
      if (onToast) onToast(`Cannot issue: Patron account for ${selectedStudentObj.name} is FROZEN due to overdue penalties.`, 'danger');
      return;
    }
    if (studentAlreadyHasBook) {
      if (onToast) onToast(`Patron ${selectedStudentObj.name} already has an active copy of "${selectedBookObj.title}" on loan.`, 'danger');
      return;
    }

    // Call Parent Issue Handler
    const finalPatronId = selectedStudentObj.rollNo || selectedStudentObj.id;
    onIssueBook(selectedBookObj.barcode, finalPatronId, formattedDueDate);

    // Create Instant Loan Slip Receipt
    const randomSlip = Math.floor(1000 + Math.random() * 9000);
    setIssuedSlip({
      slipNo: `LN-${new Date().getFullYear()}-${randomSlip}`,
      bookTitle: selectedBookObj.title,
      accession: selectedBookObj.accession,
      shelf: selectedBookObj.shelf,
      patronName: selectedStudentObj.name,
      patronId: finalPatronId,
      department: selectedStudentObj.department,
      dueDate: formattedDueDate,
      issueDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });

    if (onClearPrefilled) onClearPrefilled();
  };

  // Handle Book Return Submit
  const handleReturnSubmit = (e) => {
    e.preventDefault();
    if (!returnBarcode.trim()) return;
    onReturnBook(returnBarcode.trim());
    setReturnBarcode('');
  };

  const handlePresetClick = (days) => {
    setDurationPreset(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setManualDate(d.toISOString().split('T')[0]);
  };

  // Filtered checked out books
  const filteredCheckedOut = activeLoans.filter(loan => {
    if (checkedOutFilter === 'overdue' && loan.status !== 'Overdue') return false;
    if (checkedOutFilter === 'active' && loan.status === 'Overdue') return false;

    if (!checkedOutSearch) return true;
    const q = checkedOutSearch.toLowerCase();
    return (
      loan.bookTitle.toLowerCase().includes(q) ||
      loan.patronName.toLowerCase().includes(q) ||
      loan.patronId.toLowerCase().includes(q) ||
      (loan.accession && loan.accession.toLowerCase().includes(q)) ||
      (loan.bookBarcode && loan.bookBarcode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Section Header & Sub-Tab Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
              Circulation Desk
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-Time Book Issue & Return</span>
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 mt-1">
            Book Issue & Circulation Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue textbooks with standard 7/14/21/30-day loan policies, process instant returns, and monitor active checked-out holdings.
          </p>
        </div>

        {/* 2 Sub-Section Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setActiveSection('desk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'desk'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Issue & Return Desk</span>
          </button>

          <button
            onClick={() => setActiveSection('checked_out')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'checked_out'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Books Checked Out ({activeLoans.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUCCESS CONFIRMATION RECEIPT MODAL / BANNER (Shows immediately on checkout) */}
      {/* ========================================================================= */}
      {issuedSlip && (
        <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-md animate-in slide-in-from-top duration-200 relative">
          <button
            type="button"
            onClick={() => setIssuedSlip(null)}
            className="absolute top-4 right-4 p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-emerald-900">
                  Book Issued Successfully!
                </h3>
                <span className="text-xs text-emerald-700 font-mono">
                  Official Loan Reference: {issuedSlip.slipNo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('checked_out')}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5"
              >
                <span>View Checked Out Books</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Textbook Title</span>
              <div className="font-bold text-slate-900">{issuedSlip.bookTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono">{issuedSlip.accession} • {issuedSlip.shelf}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Issued To Patron</span>
              <div className="font-bold text-slate-900">{issuedSlip.patronName}</div>
              <div className="text-[10px] text-slate-500 font-mono">{issuedSlip.patronId}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Issue Date</span>
              <div className="font-bold text-slate-900">{issuedSlip.issueDate}</div>
              <div className="text-[10px] text-emerald-700 font-bold">Standard Loan</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Return Due Date</span>
              <div className="font-extrabold text-emerald-800 text-sm">{issuedSlip.dueDate}</div>
              <div className="text-[10px] text-slate-500">Automated 30-Day Policy</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 1: CIRCULATION DESK (Issue Form & Quick Return) */}
      {/* ========================================================================= */}
      {activeSection === 'desk' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Panel 1: Complete Book Checkout */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    Issue Book to Patron
                  </h3>
                  <span className="text-[11px] text-slate-500">Fast checkout with duration presets</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                Desk Mode
              </span>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              {/* Step 1: Textbook Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    1. Select Textbook to Issue
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {books.length} Titles in Catalog
                  </span>
                </div>

                {/* Dropdown with Available Counts */}
                <select
                  value={selectedBookBarcode}
                  onChange={(e) => setSelectedBookBarcode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {books.map(b => (
                    <option key={b.id} value={b.barcode}>
                      {b.title} [{b.accession}] • {b.available > 0 ? `${b.available} copies available` : 'OUT OF STOCK'} ({b.shelf})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Book Live Snapshot */}
              {selectedBookObj && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  selectedBookObj.available > 0 
                    ? 'bg-blue-50/60 border-blue-200 text-blue-950' 
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{selectedBookObj.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Author: {selectedBookObj.author} • Shelf: {selectedBookObj.shelf}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Accession ID: {selectedBookObj.accession} • Barcode: {selectedBookObj.barcode}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                      selectedBookObj.available > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedBookObj.available > 0 ? `${selectedBookObj.available} Available` : 'Out of Stock'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">Total: {selectedBookObj.total} Copies</div>
                  </div>
                </div>
              )}

              {/* Step 2: Registered Patron Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    2. Select Registered Student Patron
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {students.length} Enrolled Members
                  </span>
                </div>

                {/* Dropdown of Enrolled Students */}
                <select
                  value={selectedStudentObj ? (selectedStudentObj.rollNo || selectedStudentObj.id) : studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="">-- Choose Registered Student / Faculty --</option>
                  {students.map(s => (
                    <option key={s.id || s.rollNo} value={s.rollNo || s.id}>
                      {s.name} ({s.rollNo || s.id}) • {s.department} [{s.status === 'Frozen' ? '⚠️ FROZEN' : 'ACTIVE'}]
                    </option>
                  ))}
                </select>

                {/* Search / Scan Roll No Input & Quick Chips */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Search by Roll No, Username, or Name..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                  {students.slice(0, 3).map(s => (
                    <button
                      key={s.id || s.rollNo}
                      type="button"
                      onClick={() => setStudentId(s.rollNo || s.id)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-100 text-[11px] text-slate-700 font-semibold hover:bg-slate-200 shrink-0"
                    >
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Live Patron Standing Card */}
                {selectedStudentObj && (
                  <div className={`mt-2 p-3 rounded-xl border text-xs flex items-center justify-between ${
                    isStudentFrozen 
                      ? 'bg-rose-50 border-rose-300 text-rose-800' 
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}>
                    <div>
                      <div className="font-bold text-slate-900">{selectedStudentObj.name} ({selectedStudentObj.department})</div>
                      <div className="text-[11px] mt-0.5">
                        {isStudentFrozen 
                          ? `⚠️ HOLD ACTIVE: Account frozen due to overdue loan (Fine: ₹${Number(selectedStudentObj.fineBalance || 0).toFixed(2)}). Borrowing blocked.` 
                          : `🟢 Enrolled Patron: Eligible to borrow books (${selectedStudentObj.rollNo || selectedStudentObj.id})`}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isStudentFrozen ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {selectedStudentObj.status}
                    </span>
                  </div>
                )}

                {/* Unregistered Warning Alert */}
                {studentId.trim() && !selectedStudentObj && (
                  <div className="mt-2 p-3 rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
                    <span className="text-base shrink-0">🚫</span>
                    <div>
                      <div className="font-bold">Unregistered Patron: "{studentId}"</div>
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        This person is <strong>not found in the library student database</strong>. Books can only be issued to enrolled patrons. Please select a registered student above or register them in User Management.
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplicate Book Loan Warning */}
                {studentAlreadyHasBook && (
                  <div className="mt-2 p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Patron already has an active borrowed copy of this book. Duplicate checkout blocked.</span>
                  </div>
                )}
              </div>

              {/* Step 3: Loan Duration Presets */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                    3. Loan Duration / Return Period:
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-700">
                    Due: {formattedDueDate}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[7, 14, 21, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handlePresetClick(days)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                        durationPreset === days
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setDurationPreset('manual')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                      durationPreset === 'manual'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Manual 📅
                  </button>
                </div>

                {durationPreset === 'manual' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Select Exact Due Date on Calendar:
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Step 4: Submit Button */}
              <button
                type="submit"
                disabled={!selectedBookObj || selectedBookObj.available <= 0 || !selectedStudentObj || isStudentFrozen || studentAlreadyHasBook}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>
                  {!selectedBookObj
                    ? 'Please Select a Textbook'
                    : selectedBookObj.available <= 0
                    ? 'Cannot Issue: Out of Stock'
                    : !studentId.trim()
                    ? 'Please Select a Registered Patron'
                    : !selectedStudentObj
                    ? 'Cannot Issue: Patron is Not Registered'
                    : isStudentFrozen 
                    ? 'Cannot Issue: Patron Account is Frozen' 
                    : studentAlreadyHasBook
                    ? 'Cannot Issue: Duplicate Title on Loan'
                    : `Confirm & Issue Book (Due: ${formattedDueDate})`}
                </span>
              </button>
            </form>
          </div>

          {/* Panel 2: Process Book Returns */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      Process Book Return
                    </h3>
                    <span className="text-[11px] text-slate-500">Evaluates overdue penalty & releases copy back to stock</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Return Intake
                </span>
              </div>

              <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Scan Book Barcode / Select Borrowed Item
                  </label>
                  <input
                    type="text"
                    required
                    value={returnBarcode}
                    onChange={(e) => setReturnBarcode(e.target.value)}
                    placeholder="Enter Barcode or Accession (e.g. BC-CSE-3920)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Return Chips from Active Loans */}
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">
                    1-Click Return from Active Loans:
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {activeLoans.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">All library books are currently on shelves!</div>
                    ) : (
                      activeLoans.map(loan => (
                        <div
                          key={loan.id}
                          onClick={() => setReturnBarcode(loan.bookBarcode || loan.accession)}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{loan.bookTitle}</div>
                            <div className="text-[10px] text-slate-500">
                              Patron: {loan.patronName} ({loan.patronId}) • Due: {loan.dueDateFormatted}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            loan.status === 'Overdue' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {loan.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!returnBarcode.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Process Return & Restore Stock</span>
                </button>
              </form>
            </div>

            {/* Information Footnote */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Returns instantly replenish catalog inventory and release patron borrowing slots.</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 2: BOOKS CHECKED OUT (Live Ledger Table) */}
      {/* ========================================================================= */}
      {activeSection === 'checked_out' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Books Currently Checked Out
              </h3>
              <span className="text-xs text-slate-500">
                Live circulation tracking of active loans and overdue borrowings
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={checkedOutSearch}
                  onChange={(e) => setCheckedOutSearch(e.target.value)}
                  placeholder="Search checked out books..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCheckedOutFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    checkedOutFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  All ({activeLoans.length})
                </button>
                <button
                  onClick={() => setCheckedOutFilter('active')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    checkedOutFilter === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  On Time ({onTimeCount})
                </button>
                <button
                  onClick={() => setCheckedOutFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    checkedOutFilter === 'overdue' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Overdue ({overdueCount})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Textbook Title</th>
                  <th className="py-2.5 px-3">Borrower / Patron</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Return Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCheckedOut.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No matching checked out books found.
                    </td>
                  </tr>
                ) : (
                  filteredCheckedOut.map(loan => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{loan.bookTitle}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {loan.accession || loan.bookBarcode}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{loan.patronName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{loan.patronId}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {loan.issueDateFormatted || '15 Oct 2026'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{loan.dueDateFormatted}</div>
                        <div className="text-[10px] text-slate-500">
                          {loan.status === 'Overdue' ? '⚠️ Overdue by 5 days' : 'On-time loan'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          loan.status === 'Overdue'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onReturnBook(loan.bookBarcode || loan.accession)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition-colors"
                        >
                          Return Book
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
