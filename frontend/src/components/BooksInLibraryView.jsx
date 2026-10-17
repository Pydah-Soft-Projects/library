import React, { useState } from 'react';
import { BookOpen, Search, MapPin, CheckCircle, ArrowRight, Layers, BookmarkPlus, Sparkles } from 'lucide-react';

export default function BooksInLibraryView({ books, onSelectIssue, onToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Computer Science', 'Engineering', 'Electronics', 'Medical'];

  // Books in library are items that have available copies > 0 (or all catalog items with available copy counts)
  const booksInLibrary = books.filter(b => b.available > 0);
  const totalPhysicalCopiesOnShelf = books.reduce((sum, b) => sum + (b.available || 0), 0);

  const filtered = books.filter(b => {
    const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
    const q = searchTerm.toLowerCase();
    const matchQuery = !searchTerm ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.accession && b.accession.toLowerCase().includes(q)) ||
      (b.shelf && b.shelf.toLowerCase().includes(q));
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Physical Shelf Holdings</span>
              <span>•</span>
              <span>On-Site Assets</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              Books Currently in Library
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
              Physical inventory verified on library shelves and racks ready for immediate student loan checkout.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right self-start md:self-auto">
            <span className="text-xs text-emerald-100 block font-semibold uppercase">Copies on Shelf</span>
            <span className="text-3xl font-heading font-extrabold text-white">
              {totalPhysicalCopiesOnShelf}
            </span>
            <span className="text-xs text-emerald-100 block mt-0.5">Ready to Issue</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search books in library by Title, Book ID, Author, or Rack location..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Books In Library Table / Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Inventory Verified on Library Shelves & Racks
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
            {filtered.filter(b => b.available > 0).length} Titles In-Stock
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Book ID & Barcode</th>
                <th className="py-3.5 px-4">Title & Subject</th>
                <th className="py-3.5 px-4">Physical Shelf Location</th>
                <th className="py-3.5 px-4">Copies on Shelf</th>
                <th className="py-3.5 px-4 text-right">Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(book => {
                const isAvailable = book.available > 0;
                return (
                  <tr key={book.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {book.accession}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">Barcode: {book.barcode}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{book.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {book.author} • <span className="text-emerald-600 dark:text-emerald-400 font-medium">{book.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{book.shelf}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-heading font-extrabold ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {book.available}
                        </span>
                        <span className="text-slate-400 text-xs">/ {book.total} total</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isAvailable ? '● Verified on Shelf' : '○ 0 on Shelf (All Out)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAvailable ? (
                        <button
                          onClick={() => onSelectIssue(book)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Issue to Student</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">All Issued</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
