import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, User, Calendar, Clock, AlertTriangle, 
  CheckCircle2, Search, Printer, Check, X
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
  const [activeTab, setActiveTab] = useState(initialSection || 'issue');

  useEffect(() => {
    if (initialSection) setActiveTab(initialSection);
  }, [initialSection]);

  // ==================== ISSUE DESK ====================
  const availableBooks = books.filter(b => (b.available || 0) > 0);
  const [selectedBookBarcode, setSelectedBookBarcode] = useState(
    prefilledBook ? prefilledBook.barcode : (availableBooks[0]?.barcode || '')
  );

  useEffect(() => {
    if (prefilledBook) {
      setSelectedBookBarcode(prefilledBook.barcode);
      setActiveTab('issue');
    }
  }, [prefilledBook]);

  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [durationPreset, setDurationPreset] = useState(30);
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [issuedSlip, setIssuedSlip] = useState(null);

  const selectedBook = books.find(b => b.barcode === selectedBookBarcode || b.accession === selectedBookBarcode);

  const cleanStudentQuery = (studentSearchInput || '').trim().toLowerCase();
  const selectedStudent = students.find(s => 
    (s.id && s.id.toLowerCase() === cleanStudentQuery) ||
    (s.rollNo && s.rollNo.toLowerCase() === cleanStudentQuery) ||
    (s.name && s.name.toLowerCase() === cleanStudentQuery) ||
    (s.email && s.email.toLowerCase() === cleanStudentQuery)
  );

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
      if (onToast) onToast(`"${selectedBook.title}" has 0 copies available.`, 'danger');
      return;
    }
    if (!selectedStudent) {
      if (onToast) onToast(`Patron "${studentSearchInput}" not found in database. Only registered students can borrow.`, 'danger');
      return;
    }
    if (selectedStudent.status === 'Frozen') {
      if (onToast) onToast(`Account for ${selectedStudent.name} is FROZEN. Resolve overdue penalties first.`, 'danger');
      return;
    }

    const finalPatronId = selectedStudent.rollNo || selectedStudent.id;
    onIssueBook(selectedBook.barcode, finalPatronId, calculatedDueDate);

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

  // ==================== RETURN DESK ====================
  const [returnInput, setReturnInput] = useState('');
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);

  const activeLoans = loans.filter(l => l.status !== 'Returned');
  const overdueLoans = activeLoans.filter(l => l.status === 'Overdue');

  const handleSelectLoanToReturn = (loan) => {
    setSelectedLoanForReturn(loan);
    setReturnInput(loan.accession || loan.bookBarcode);
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

  const handleExecuteReturn = () => {
    if (!selectedLoanForReturn) {
      if (onToast) onToast('Please specify a valid active loan or barcode to return.', 'danger');
      return;
    }
    onReturnBook(selectedLoanForReturn.bookBarcode || selectedLoanForReturn.accession);
    setSelectedLoanForReturn(null);
    setReturnInput('');
  };

  const isReturnOverdue = selectedLoanForReturn?.status === 'Overdue';
  const estimatedFine = isReturnOverdue ? 25.0 : 0.0;

  // ==================== ACTIVE CIRCULATIONS TABLE ====================
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
      (l.accession && l.accession.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Main Heading Only & Aligned Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Book Issues & Returns
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Issue 30-day loans to registered patrons, process book returns, and track active circulations
          </p>
        </div>

        {/* Minimal Aligned Tabs */}
        <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('issue')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'issue' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Issue Desk
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'return' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Return Desk {overdueLoans.length > 0 && `(${overdueLoans.length} late)`}
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'loans' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Active Circulations ({activeLoans.length})
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. ISSUE DESK */}
      {/* ============================================================ */}
      {activeTab === 'issue' && (
        <div className="grid lg:grid-cols-12 gap-8 pt-2">
          {/* Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                  1. Select Book from Inventory
                </label>
                <select
                  value={selectedBookBarcode}
                  onChange={(e) => setSelectedBookBarcode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
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
                  <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Shelf: <strong>{selectedBook.shelf}</strong> • Author: {selectedBook.author}</span>
                    <span className="font-semibold text-emerald-700">{selectedBook.available} copies in stock</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                  2. Select Registered Student / Patron
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                    placeholder="Type student Roll No, Name, or Email (e.g. STU-2025-001)..."
                    className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {studentSearchInput && (
                  <div className="mt-2">
                    {selectedStudent ? (
                      <div className="p-2.5 border border-zinc-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-zinc-900">{selectedStudent.name}</span>
                          <span className="text-[11px] text-zinc-400 font-mono ml-2">({selectedStudent.rollNo || selectedStudent.id})</span>
                          <div className="text-[11px] text-zinc-500">{selectedStudent.department}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          selectedStudent.status === 'Frozen'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {selectedStudent.status === 'Frozen' ? 'Account Hold' : 'Verified'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 border border-zinc-200 rounded-lg text-[11px] text-zinc-500">
                        No registered patron matching "{studentSearchInput}".
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        durationPreset === days
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {days} Days {days === 30 && '(Standard)'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDurationPreset('manual')}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                      durationPreset === 'manual'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Custom Date
                  </button>
                </div>

                {durationPreset === 'manual' && (
                  <div className="mt-2">
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div className="mt-2 text-xs text-zinc-500">
                  Calculated Due Date: <strong className="text-zinc-900">{calculatedDueDate}</strong>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Daily overdue rate: ₹5.00/day
                </span>

                <button
                  type="submit"
                  disabled={!selectedBook || !selectedStudent || selectedStudent?.status === 'Frozen'}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Issue Book</span>
                </button>
              </div>
            </form>
          </div>

          {/* Receipt or Checklist */}
          <div className="lg:col-span-5 space-y-4">
            {issuedSlip ? (
              <div className="border border-zinc-200 rounded-lg p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">
                    Issue Receipt Slip
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="p-1 text-zinc-400 hover:text-zinc-800"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-zinc-600">
                  <div className="font-bold text-zinc-900">{issuedSlip.bookTitle}</div>
                  <div>Borrower: <strong>{issuedSlip.patronName}</strong> ({issuedSlip.patronId})</div>
                  <div>Due Date: <strong className="text-zinc-900">{issuedSlip.dueDate}</strong></div>
                  <div>Shelf: {issuedSlip.shelf} • Code: {issuedSlip.accession}</div>
                </div>

                <button
                  onClick={() => setIssuedSlip(null)}
                  className="w-full py-1.5 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Issue Next Book
                </button>
              </div>
            ) : (
              <div className="p-4 border border-zinc-200 rounded-lg text-xs space-y-2 text-zinc-600">
                <div className="font-semibold text-zinc-900">Desk Issue Rules</div>
                <div>• Verify patron credentials with physical student pass or barcode.</div>
                <div>• Borrowing is strictly locked if patron has unpaid overdue fees.</div>
                <div>• Standard checkout window is 30 days with 15-day renewal options.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. RETURN DESK */}
      {/* ============================================================ */}
      {activeTab === 'return' && (
        <div className="grid lg:grid-cols-12 gap-8 pt-2">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
                Scan or Enter Book Accession / Barcode
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={returnInput}
                  onChange={(e) => handleScanOrSearchReturn(e.target.value)}
                  placeholder="Scan barcode or type accession code / patron roll..."
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            {selectedLoanForReturn ? (
              <div className="p-4 border border-zinc-200 rounded-lg space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">{selectedLoanForReturn.bookTitle}</h3>
                    <p className="text-zinc-500 mt-0.5">
                      Borrower: <strong className="text-zinc-800">{selectedLoanForReturn.patronName}</strong> ({selectedLoanForReturn.patronId})
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    selectedLoanForReturn.status === 'Overdue'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {selectedLoanForReturn.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-zinc-600 text-[11px]">
                  <div><span className="text-zinc-400">Due:</span> {selectedLoanForReturn.dueDateFormatted}</div>
                  <div><span className="text-zinc-400">Code:</span> {selectedLoanForReturn.accession}</div>
                </div>

                {isReturnOverdue && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center justify-between">
                    <div>
                      <div className="font-bold">Overdue Penalty: ₹{estimatedFine.toFixed(2)}</div>
                      <div className="text-[11px] opacity-80">Standard ₹5.00/day policy</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onOpenUpiModal && (
                        <button
                          type="button"
                          onClick={() => onOpenUpiModal({
                            id: Date.now(),
                            patronId: selectedLoanForReturn.patronId,
                            patronName: selectedLoanForReturn.patronName,
                            amount: estimatedFine
                          })}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-medium"
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
                          className="px-2 py-1 bg-zinc-900 text-white rounded text-[11px] font-medium"
                        >
                          Cash
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteReturn}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Return & Reshelve</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                Type an accession number or click on an active loan from the right panel to proceed.
              </div>
            )}
          </div>

          {/* Quick Loans Panel */}
          <div className="lg:col-span-5 space-y-2">
            <h4 className="font-semibold text-xs text-zinc-700 uppercase tracking-wider">
              Currently Circulating ({activeLoans.length})
            </h4>

            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-200 max-h-[400px] overflow-y-auto">
              {activeLoans.map(loan => (
                <div
                  key={loan.id}
                  onClick={() => handleSelectLoanToReturn(loan)}
                  className="py-2.5 px-2 hover:bg-zinc-50 cursor-pointer transition-colors text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900 truncate">{loan.bookTitle}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      {loan.patronName} ({loan.patronId})
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">{loan.accession}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ACTIVE CIRCULATIONS TABLE */}
      {/* ============================================================ */}
      {activeTab === 'loans' && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={loanSearchTerm}
                onChange={(e) => setLoanSearchTerm(e.target.value)}
                placeholder="Search circulating loans by student, book, or code..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setLoanStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({activeLoans.length})
              </button>
              <button
                onClick={() => setLoanStatusFilter('active')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'active' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                On Schedule ({activeLoans.filter(l => l.status !== 'Overdue').length})
              </button>
              <button
                onClick={() => setLoanStatusFilter('overdue')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'overdue' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Overdue ({overdueLoans.length})
              </button>
            </div>
          </div>

          {filteredLoans.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400 border-t border-b border-zinc-200">
              No circulating loans match your criteria.
            </div>
          ) : (
            <div className="border-t border-b border-zinc-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <th className="py-3 px-3">Book Title & Accession</th>
                    <th className="py-3 px-3">Patron Name & ID</th>
                    <th className="py-3 px-3">Issue Date</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLoans.map(loan => {
                    const isOverdue = loan.status === 'Overdue';
                    return (
                      <tr key={loan.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-zinc-900">{loan.bookTitle}</div>
                          <span className="font-mono text-[10px] text-zinc-400">{loan.accession || loan.bookBarcode}</span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-zinc-800">{loan.patronName}</div>
                          <span className="font-mono text-[11px] text-zinc-400">{loan.patronId}</span>
                        </td>

                        <td className="py-3 px-3 text-zinc-600">
                          {loan.issueDateFormatted || 'Standard'}
                        </td>

                        <td className="py-3 px-3 font-medium text-zinc-900">
                          {loan.dueDateFormatted}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {loan.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                handleSelectLoanToReturn(loan);
                                setActiveTab('return');
                              }}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-medium"
                            >
                              Return
                            </button>
                            <button
                              onClick={() => onRenewLoan(loan)}
                              className="px-2.5 py-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded text-[11px] font-medium"
                            >
                              Renew (+15d)
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
      )}
    </div>
  );
}
