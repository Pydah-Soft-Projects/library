import React from 'react';
import { 
  BookMarked, AlertTriangle, CheckCircle, Clock, Search, 
  CreditCard, ArrowRight, Bell, ShieldAlert, BookOpen, Calendar,
  Sparkles, Check, BookmarkPlus
} from 'lucide-react';

export default function StudentDashboardView({ 
  currentStudent, 
  studentLoans, 
  studentFines, 
  onNavigate, 
  onOpenPayFine,
  books = [],
  reservations = [],
  onReserveBook
}) {
  const activeLoans = studentLoans.filter(l => l.status !== 'Returned');
  const overdueLoan = activeLoans.find(l => l.status === 'Overdue');
  const unpaidFine = studentFines.find(f => f.status === 'Unpaid');
  const hasOverdue = !!overdueLoan || !!unpaidFine;
  const fineAmount = unpaidFine ? Number(unpaidFine.amount) : 0;

  // Filter department-specific book recommendations
  const studentDeptLower = (currentStudent?.department || '').toLowerCase();
  const recommendedBooks = books.filter(b => {
    const cat = (b.category || '').toLowerCase();
    const title = (b.title || '').toLowerCase();
    if (studentDeptLower.includes('computer') || studentDeptLower.includes('cse') || studentDeptLower.includes('it')) {
      return cat.includes('computer') || cat.includes('engineering') || title.includes('code') || title.includes('system') || title.includes('algorithm');
    } else if (studentDeptLower.includes('mechanical') || studentDeptLower.includes('civil')) {
      return cat.includes('engineering') || title.includes('mathematics') || title.includes('mechanics');
    } else if (studentDeptLower.includes('electronics') || studentDeptLower.includes('electrical')) {
      return cat.includes('engineering') || cat.includes('computer') || title.includes('signal') || title.includes('mathematics');
    }
    return true;
  }).slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20  mb-2">
              <span>🎓 Student Portal</span>
              <span>•</span>
              <span>{currentStudent.department}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              Welcome back, {currentStudent.name}!
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
              Monitor your borrowed academic textbooks, track strict 30-day return countdowns, and verify your campus borrowing status.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => onNavigate('student_catalog')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Explore Catalog</span>
            </button>
            <button
              onClick={() => onNavigate('student_my_books')}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs  transition-all flex items-center gap-2"
            >
              <BookMarked className="w-4 h-4" />
              <span>My Books ({activeLoans.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if active */}
      {hasOverdue && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 shadow-md flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-800 tracking-wider">
                Overdue Alert • Account Hold
              </span>
              <span className="text-xs font-mono font-bold text-rose-600">
                Penalty: ₹5.00 / day
              </span>
            </div>
            <h3 className="text-base font-bold text-rose-900 mt-1">
              You have 1 overdue book: "{overdueLoan?.bookTitle || 'Operating System Concepts'}" (5 days late)
            </h3>
            <p className="text-xs text-rose-700 mt-1">
              Accrued fine balance: <strong>₹{fineAmount.toFixed(2)}</strong>. Under institutional policy, borrowing and renewal rights are frozen until the item is returned and fine is settled.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => onOpenPayFine(unpaidFine)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Pay ₹{fineAmount.toFixed(2)} via UPI QR
              </button>
              <button
                onClick={() => onNavigate('student_my_books')}
                className="px-3 py-2 bg-white text-rose-700 border border-rose-300 text-xs font-bold rounded-xl hover:bg-rose-50"
              >
                View Overdue Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Quick Status Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Card 1: Active Borrowed Books */}
        <div 
          onClick={() => onNavigate('student_my_books')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Currently Borrowed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookMarked className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-heading font-extrabold text-slate-900">
            {activeLoans.length} <span className="text-xs font-normal text-slate-400">/ 4 quota</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{activeLoans.length > 0 ? 'Active 30-day loans' : 'No books checked out'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Standing Status */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
          hasOverdue
            ? 'bg-rose-50/50 border-rose-300'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Borrowing Status</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              hasOverdue ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {hasOverdue ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-xl font-heading font-extrabold ${hasOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
            {hasOverdue ? 'Borrowing Frozen' : 'Good Standing'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {hasOverdue ? 'Clear overdue book at desk' : 'Eligible for new checkouts'}
          </div>
        </div>

        {/* Card 3: Pending Fines */}
        <div 
          onClick={() => onNavigate('student_my_fines')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-purple-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unpaid Penalties</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-heading font-extrabold ${fineAmount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ₹{fineAmount.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{fineAmount > 0 ? 'Payable via UPI QR' : 'Zero outstanding balance'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-500 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* DEPARTMENT-SPECIFIC CURATED BOOK RECOMMENDATIONS (User selected feature) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="font-heading font-extrabold text-lg text-slate-900">
                Curated Recommendations for {currentStudent.department}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hand-picked semester reference textbooks available in the campus library stacks.
            </p>
          </div>

          <button
            onClick={() => onNavigate('student_catalog')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {recommendedBooks.map(book => {
            const isReserved = reservations.some(r => r.bookId === book.id && r.studentId === currentStudent.id);
            return (
              <div 
                key={book.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      {book.category}
                    </span>
                    <span className={`text-[10px] font-bold ${book.available > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {book.available} Available
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-sm text-slate-900 mt-2 line-clamp-1">
                    {book.title}
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {book.author}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 font-mono">
                    Shelf: {book.shelf}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {book.accession}
                  </span>

                  {isReserved ? (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Hold Placed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={hasOverdue || book.available === 0}
                      onClick={() => onReserveBook && onReserveBook(book)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Reserve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Library Operating Guidelines */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-heading font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Library Timings & Institutional 30-Day Policy</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">Strict 30-Day Loan Period</div>
            <p className="text-slate-500 mt-1">All student loans have an automated 30 calendar day due date. Renewals must be requested prior to due date.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">₹5.00 / Day Penalty Rate</div>
            <p className="text-slate-500 mt-1">Overdue items incur automated daily fine accrual and freeze further borrowing until returned.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">Circulation Hours</div>
            <p className="text-slate-500 mt-1">Issue & returns open Mon–Sat 8:00 AM – 8:00 PM at Central Block, Level 2.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
