import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Plus, ArrowLeftRight, Edit3, 
  Trash2, MapPin, List, LayoutGrid, X, Check
} from 'lucide-react';

export default function AllBooksView({
  books = [],
  loans = [],
  onUpdateBook,
  onDeleteBook,
  onSelectIssue,
  onNavigate,
  onToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'circulating'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [editingBook, setEditingBook] = useState(null);

  const [dynamicCategories, setDynamicCategories] = useState(['All']);

  const DEMO_CATEGORY_KEYWORDS = [
    'computer science & engineering',
    'information technology',
    'artificial intelligence & data science',
    'electronics & communication',
    'engineering',
    'computer science',
    'electronics',
    'medical',
    'management & humanities'
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_categories');
      const savedList = saved ? JSON.parse(saved).map(c => typeof c === 'string' ? c : c.name) : [];
      const cleanSavedList = savedList.filter(name => !DEMO_CATEGORY_KEYWORDS.includes((name || '').toLowerCase()));
      const bookCats = books.map(b => b.category).filter(Boolean);
      const uniqueCats = ['All', ...new Set([...cleanSavedList, ...bookCats])];
      setDynamicCategories(uniqueCats);
    } catch {
      const bookCats = books.map(b => b.category).filter(Boolean);
      setDynamicCategories(['All', ...new Set(bookCats)]);
    }
  }, [books]);

  const totalCopies = books.reduce((sum, b) => sum + (b.total || 0), 0);
  const availableCopies = books.reduce((sum, b) => sum + (b.available || 0), 0);
  const circulatingCopies = totalCopies - availableCopies;

  const filteredBooks = books.filter(b => {
    const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
    let matchStatus = true;
    if (statusFilter === 'available') matchStatus = (b.available || 0) > 0;
    if (statusFilter === 'circulating') matchStatus = (b.available || 0) < (b.total || 0);

    const q = searchTerm.toLowerCase();
    const matchQuery = !searchTerm ||
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.accession && b.accession.toLowerCase().includes(q)) ||
      (b.barcode && b.barcode.toLowerCase().includes(q)) ||
      (b.shelf && b.shelf.toLowerCase().includes(q)) ||
      (b.isbn && b.isbn.toLowerCase().includes(q));

    return matchCat && matchStatus && matchQuery;
  });

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingBook) return;
    onUpdateBook(editingBook);
    setEditingBook(null);
    if (onToast) onToast(`Updated details for "${editingBook.title}"`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Main Heading Only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            All Books
          </h1>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
            <span>{books.length} Titles</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">{availableCopies} Available</span>
            <span>•</span>
            <span className="text-blue-700 font-medium">{circulatingCopies} On Loan</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('book_creation')}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Book</span>
        </button>
      </div>

      {/* Flat Toolbar: Search, Filters & View Toggle (No Rounded Card) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Aligned Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, author, accession, barcode, or shelf..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
            />
          </div>

          {/* Status Tabs & View Mode */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({books.length})
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'available'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                On Shelf ({availableCopies})
              </button>
              <button
                onClick={() => setStatusFilter('circulating')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'circulating'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                On Loan ({circulatingCopies})
              </button>
            </div>

            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Data View (Flat, Clean, Aligned - Not in Rounded Cards) */}
      {filteredBooks.length === 0 ? (
        <div className="py-16 text-center border-t border-b border-zinc-200">
          <p className="text-xs text-zinc-500">No books found matching your search or filters.</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setStatusFilter('all'); }}
            className="mt-2 text-xs font-medium text-zinc-900 underline"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border-t border-b border-zinc-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Title & Author</th>
                <th className="py-3 px-3">Accession / Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Shelf & Rack</th>
                <th className="py-3 px-3 text-center">Availability</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredBooks.map(book => {
                const isAvailable = (book.available || 0) > 0;
                const percent = Math.round(((book.available || 0) / (book.total || 1)) * 100);

                return (
                  <tr key={`${book.id || book._id || idx}`} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900">{book.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{book.author}</div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="font-medium text-zinc-800">{String(book.accession || '').replace(/[\s\-_]/g, '')}</div>
                      <div className="text-[10px] text-zinc-400">{String(book.barcode || '').replace(/[\s\-_]/g, '')}</div>
                    </td>

                    <td className="py-3 px-3 text-zinc-600">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-700">
                        {book.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-zinc-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{book.shelf}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {book.available} / {book.total} Copies
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        {isAvailable ? `${percent}% on shelf` : 'All issued'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAvailable ? (
                          <button
                            onClick={() => onSelectIssue(book)}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Issue</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400 px-2 py-1">Issued</span>
                        )}

                        <button
                          onClick={() => setEditingBook({ ...book })}
                          className="p-1 text-zinc-400 hover:text-zinc-800 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${book.title}" from catalog?`)) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredBooks.map((book, idx) => {
            const isAvailable = (book.available || 0) > 0;
            return (
              <div
                key={`${book.id || book._id || idx}`}
                className="p-4 border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-zinc-400 text-[10px]">{String(book.accession || '').replace(/[\s\-_]/g, '')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {book.available}/{book.total} Available
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-zinc-900 line-clamp-1">{book.title}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{book.author}</p>

                  <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{book.category}</span>
                    <span>{book.shelf}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-end gap-1.5">
                  {isAvailable && (
                    <button
                      onClick={() => onSelectIssue(book)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-medium"
                    >
                      Issue
                    </button>
                  )}
                  <button
                    onClick={() => setEditingBook({ ...book })}
                    className="p-1 text-zinc-400 hover:text-zinc-800"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-sm text-zinc-900">Edit Book Record</h3>
              <button onClick={() => setEditingBook(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Shelf Rack</label>
                  <input
                    type="text"
                    value={editingBook.shelf}
                    onChange={(e) => setEditingBook({ ...editingBook, shelf: e.target.value })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={editingBook.total}
                    onChange={(e) => {
                      const newTotal = Number(e.target.value);
                      const issued = editingBook.total - editingBook.available;
                      setEditingBook({
                        ...editingBook,
                        total: newTotal,
                        available: Math.max(newTotal - issued, 0)
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
