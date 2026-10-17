import React, { useState } from 'react';
import { Search, MapPin, BookOpen, BookmarkPlus, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function StudentExploreBooksView({ 
  books, 
  reservations = [], 
  onReserveBook, 
  onCancelReservation, 
  currentStudent, 
  onToast 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const categories = ['All', 'Computer Science', 'Engineering', 'Electronics', 'Medical'];

  const filteredBooks = books.filter(b => {
    const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
    const matchAvail = !onlyAvailable || b.available > 0;
    const q = searchTerm.toLowerCase();
    const matchQuery = !searchTerm ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q)) ||
      (b.accession && b.accession.toLowerCase().includes(q)) ||
      (b.shelf && b.shelf.toLowerCase().includes(q));
    return matchCat && matchAvail && matchQuery;
  });

  const handleReserve = (book) => {
    onToast(`Hold placed for "${book.title}". Reserved for 48 hours for you to pick up at shelf ${book.shelf}!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Title, Author, Department, Accession No, or Rack Number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* In-Stock Filter */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Available Only</span>
        </label>
      </div>

      {/* Book Cards Grid (Read-Only) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBooks.map(book => {
          const availRatio = book.total > 0 ? (book.available / book.total) * 100 : 0;
          const isOutOfStock = book.available <= 0;

          return (
            <div
              key={book.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {book.category}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {book.accession}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white leading-snug">
                  {book.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  By <span className="font-semibold text-slate-700 dark:text-slate-300">{book.author}</span> • {book.edition || 'Standard Ed.'}
                </p>

                {/* Shelf Location Tag */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-bold">Physical Shelf:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{book.shelf}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ISBN: {book.isbn}
                  </div>
                </div>

                {/* Stock Indicator */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Library Stock</span>
                    <span className={`font-mono font-bold text-xs ${
                      isOutOfStock ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {book.available} / {book.total} Available
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOutOfStock ? 'bg-rose-500' : availRatio < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${availRatio}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button: Reserve / Hold */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                {(() => {
                  const myReservation = reservations.find(r => r.bookId === book.id && r.studentId === currentStudent?.id);
                  if (myReservation) {
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Hold Active (Pick Up: 48h)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCancelReservation && onCancelReservation(myReservation.id)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-colors"
                          title="Release Hold Reservation"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  }

                  if (!isOutOfStock) {
                    return (
                      <button
                        type="button"
                        onClick={() => onReserveBook && onReserveBook(book)}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        <span>Reserve Copy (Pick Up at {book.shelf.split('(')[0]})</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => onReserveBook && onReserveBook(book)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Join Reservation Hold Queue</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="font-bold text-slate-700 dark:text-slate-300">No books found matching your search</div>
            <div className="text-xs text-slate-400 mt-1">Try another keyword or category filter</div>
          </div>
        )}
      </div>
    </div>
  );
}
