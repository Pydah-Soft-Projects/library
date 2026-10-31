import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Plus, ArrowLeftRight, Edit3, 
  Trash2, MapPin, List, LayoutGrid, X, Check,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
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
  const [activeTab, setActiveTab] = useState('available'); // 'available' (first) | 'total' (second)
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [editingBook, setEditingBook] = useState(null);
  const [viewingCopiesBook, setViewingCopiesBook] = useState(null);

  // Dynamic Pagination State (dynamically changeable count)
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first section whenever search filter, category, tab, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, activeTab, pageSize]);

  const [dynamicCategories, setDynamicCategories] = useState(['All']);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_categories');
      const savedList = saved ? JSON.parse(saved).map(c => typeof c === 'string' ? c : c.name) : [];
      const bookCats = books.map(b => b.category).filter(Boolean);
      const uniqueCats = ['All', ...new Set([...savedList, ...bookCats])];
      setDynamicCategories(uniqueCats);
    } catch {
      const bookCats = books.map(b => b.category).filter(Boolean);
      setDynamicCategories(['All', ...new Set(bookCats)]);
    }
  }, [books]);

  // Fast single-pass summary calculation with useMemo
  const { totalCopies, availableCopies } = useMemo(() => {
    let tot = 0;
    let avail = 0;
    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      const t = b.total !== undefined ? Number(b.total) : (Number(b.total_copies) || 1);
      tot += t;
      avail += b.available !== undefined && b.available !== null ? Number(b.available) : t;
    }
    return { totalCopies: tot, availableCopies: avail };
  }, [books]);

  const circulatingCopies = Math.max(0, totalCopies - availableCopies);

  const formatAccessionRange = (acc) => {
    if (!acc) return '—';
    const str = String(acc).trim();
    if (str.includes('-')) {
      return str.split('-').map(s => s.trim()).join(' – ');
    }
    return str;
  };

  // Filtered books for Total Books catalog tab (memoized to load by parts without re-filtering)
  const filteredBooks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const cleanNum = q.replace(/^[#\s]+/, '').replace(/[\s\-_]/g, '');
    return books.filter(b => {
      const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
      const tId = String(b.titleId || b.title_id || '').toLowerCase();
      const matchQuery = !q ||
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (tId && tId.includes(q)) ||
        (cleanNum && tId && tId.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
        (b.accession && b.accession.toLowerCase().includes(q)) ||
        (cleanNum && b.accession && b.accession.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
        (b.barcode && b.barcode.toLowerCase().includes(q)) ||
        (cleanNum && b.barcode && b.barcode.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
        (b.shelf && b.shelf.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.toLowerCase().includes(q));

      return matchCat && matchQuery;
    });
  }, [books, selectedCategory, searchTerm]);

  // Flat list of available copies (only computed when activeTab === 'available' for fast loading)
  const availableCopiesList = useMemo(() => {
    if (activeTab !== 'available') return [];

    const q = searchTerm.toLowerCase().trim();
    const cleanNum = q.replace(/^[#\s]+/, '').replace(/[\s\-_]/g, '');
    const result = [];

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const availCount = book.available !== undefined ? Number(book.available) : (Number(book.total) || 1);
      if (availCount <= 0) continue;

      const matchCat = selectedCategory === 'All' || book.category === selectedCategory;
      if (!matchCat) continue;

      const copiesCount = book.total !== undefined ? Number(book.total) : (Number(book.total_copies) || 1);

      const copiesList = Array.isArray(book.copies_detail) && book.copies_detail.length > 0
        ? book.copies_detail
        : Array.from({ length: copiesCount }, (_, idx) => ({
            copy_number: idx + 1,
            serial_no: `SN${(book.category_code || (book.category || 'GEN').slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '')}${idx + 1}`,
            accession: `${book.accession || 'AC'}${idx + 1}`,
            barcode: `${book.barcode || 'BC'}${idx + 1}`,
            status: idx < availCount ? 'Available' : 'Issued'
          }));

      for (let j = 0; j < copiesList.length; j++) {
        const cp = copiesList[j];
        if (cp.status !== 'Available' && cp.status) continue;

        const item = {
          id: `${book.id || book._id}-cp-${cp.copy_number || j + 1}`,
          book,
          copy_number: cp.copy_number || j + 1,
          accession: cp.accession || String(cp.copy_number || j + 1),
          barcode: cp.barcode || cp.serial_no || '',
          serial_no: cp.serial_no || '',
          titleId: book.titleId || book.title_id || '',
          shelf: book.shelf || 'Central Stack',
          category: book.category || 'General',
          title: book.title,
          author: book.author || 'Institutional Author'
        };

        if (q) {
          const itemTId = String(item.titleId).toLowerCase();
          const matches =
            item.title.toLowerCase().includes(q) ||
            item.author.toLowerCase().includes(q) ||
            itemTId.includes(q) ||
            (cleanNum && itemTId && itemTId.replace(/[\s\-_]/g, '').includes(cleanNum)) ||
            String(item.accession).toLowerCase().includes(q) ||
            (cleanNum && String(item.accession).replace(/[\s\-_]/g, '').includes(cleanNum)) ||
            String(item.barcode).toLowerCase().includes(q) ||
            (cleanNum && String(item.barcode).replace(/[\s\-_]/g, '').includes(cleanNum)) ||
            String(item.serial_no).toLowerCase().includes(q) ||
            String(item.shelf).toLowerCase().includes(q) ||
            String(item.category).toLowerCase().includes(q) ||
            String(item.copy_number) === q;
          if (!matches) continue;
        }

        result.push(item);
      }
    }

    return result;
  }, [books, selectedCategory, searchTerm, activeTab]);

  // Dynamic Pagination Calculations
  const currentItemsCount = activeTab === 'available' ? availableCopiesList.length : filteredBooks.length;
  const totalPages = Math.max(1, Math.ceil(currentItemsCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = currentItemsCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, currentItemsCount);

  // Paginated Slices for Loading by Section
  const paginatedAvailableCopies = availableCopiesList.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedTotalBooks = filteredBooks.slice((safePage - 1) * pageSize, safePage * pageSize);

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
          <p className="text-xs text-zinc-500 mt-1">
            Complete central library catalogue, real-time availability on shelf, and sequential copy serial tracking
          </p>
        </div>

        <button
          onClick={() => onNavigate('book_creation')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Book</span>
        </button>
      </div>

      {/* Summary Statistics Strip (1st Place Available, 2nd Place Total) */}
      <div className="border-t border-b border-zinc-200 grid grid-cols-2 lg:grid-cols-4 py-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 bg-zinc-50/40">
        <div className="p-4 bg-emerald-50/30">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">1. Available on Shelf</span>
          <div className="text-2xl font-bold text-emerald-700 mt-0.5">{availableCopies.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Ready to borrow now</span>
        </div>

        <div className="p-4 bg-blue-50/20">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">2. Total Library Books</span>
          <div className="text-2xl font-bold text-blue-900 mt-0.5">
            {books.length.toLocaleString()} <span className="text-sm font-normal text-blue-700">({totalCopies.toLocaleString()} copies)</span>
          </div>
          <span className="text-[11px] text-blue-600 mt-0.5 block font-medium">Full catalog holdings</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Currently Issued</span>
          <div className="text-2xl font-bold text-amber-900 mt-0.5">{circulatingCopies.toLocaleString()}</div>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Books with students</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Categories</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{dynamicCategories.filter(c => c !== 'All').length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Subject departments</span>
        </div>
      </div>

      {/* 2 Primary Tabs: 1st Available Copies, 2nd Total Books */}
      <div className="flex items-center gap-6 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'available'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Available Copies</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {availableCopies.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('total')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'total'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <span>Total Books</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'total' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {books.length.toLocaleString()} ({totalCopies.toLocaleString()} Copies)
          </span>
        </button>
      </div>

      {/* Flat Toolbar: Search, Filters & View Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Aligned Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search books by title, author, Title ID, book number, or shelf..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Page Size Selector in Toolbar */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="hidden sm:inline">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                title="Change items per page"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center border border-zinc-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-zinc-400 hover:text-zinc-600'
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
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Data View According to Active Tab */}
      {activeTab === 'available' ? (
        // ============================================================
        // 1. AVAILABLE COPIES TABLE (TAB 1)
        // ============================================================
        availableCopiesList.length === 0 ? (
          <div className="py-16 text-center border-t border-b border-zinc-200">
            <p className="text-xs text-zinc-500">No available copies currently match your search or filter.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
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
                  <th className="py-3 px-3">Book Title & Author</th>
                  <th className="py-3 px-3">Book Number</th>
                  <th className="py-3 px-3">Serial / Barcode</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Shelf & Rack</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedAvailableCopies.map((cp, idx) => (
                  <tr key={`${cp.id || idx}`} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900">{cp.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{cp.author}</span>
                        {(cp.titleId || cp.book?.titleId || cp.book?.title_id) && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-blue-700 font-semibold bg-blue-50 px-1 rounded text-[10px]">
                              Title ID: {cp.titleId || cp.book?.titleId || cp.book?.title_id}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        #{cp.accession || cp.copy_number}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="font-medium text-zinc-800 text-[11px]">{cp.serial_no || '—'}</div>
                      {cp.barcode && <div className="text-[10px] text-zinc-400">{cp.barcode}</div>}
                    </td>

                    <td className="py-3 px-3 text-zinc-600">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-700 font-medium border border-zinc-200">
                        {cp.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-zinc-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{cp.shelf}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Available on Shelf
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectIssue({ ...cp.book, accession: cp.accession, selectedCopy: cp })}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Issue</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {paginatedAvailableCopies.map((cp, idx) => (
              <div
                key={`${cp.id || idx}`}
                className="p-4 border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                      #{cp.accession || cp.copy_number}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Available on Shelf
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-zinc-900 line-clamp-1">{cp.title}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{cp.author}</p>

                  <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{cp.category}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {cp.shelf}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-end">
                  <button
                    onClick={() => onSelectIssue({ ...cp.book, accession: cp.accession, selectedCopy: cp })}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium inline-flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Issue</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ============================================================
        // 2. TOTAL BOOKS CATALOG TABLE (TAB 2)
        // ============================================================
        filteredBooks.length === 0 ? (
          <div className="py-16 text-center border-t border-b border-zinc-200">
            <p className="text-xs text-zinc-500">No books found matching your search or filters.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
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
                  <th className="py-3 px-3">Accession Range</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Shelf & Rack</th>
                  <th className="py-3 px-3 text-center">Copies In Stock</th>
                  <th className="py-3 px-3">Serial Numbers</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedTotalBooks.map((book, idx) => {
                  const copiesCount = book.total !== undefined ? book.total : (book.total_copies || 1);
                  const availCount = book.available !== undefined ? book.available : copiesCount;
                  const isAvailable = availCount > 0;
                  const percent = Math.round((availCount / copiesCount) * 100);

                  const copiesList = Array.isArray(book.copies_detail) && book.copies_detail.length > 0
                    ? book.copies_detail
                    : Array.from({ length: copiesCount }, (_, i) => ({
                        copy_number: i + 1,
                        serial_no: `SN${(book.category_code || (book.category || 'GEN').slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '')}${i + 1}`,
                        accession: `${book.accession || 'AC'}${i + 1}`,
                        barcode: `${book.barcode || 'BC'}${i + 1}`,
                        status: i < availCount ? 'Available' : 'Issued'
                      }));

                  return (
                    <tr key={`${book.id || book._id || 'b'}-${idx}`} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900">{book.title}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{book.author}</span>
                          {(book.titleId || book.title_id) && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-blue-700 font-semibold bg-blue-50 px-1 rounded text-[10px]">
                                Title ID: {book.titleId || book.title_id}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="font-medium text-zinc-800">{formatAccessionRange(book.accession)}</div>
                        {book.barcode && <div className="text-[10px] text-zinc-400">{book.barcode}</div>}
                      </td>

                      <td className="py-3 px-3 text-zinc-600">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-700 font-medium border border-zinc-200">
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
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {availCount} / {copiesCount} Copies
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {isAvailable ? `${percent}% on shelf` : 'All issued'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs items-center">
                          {copiesList.slice(0, 3).map((cp, cIdx) => (
                            <span key={cIdx} className="font-mono text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                              {cp.serial_no}
                            </span>
                          ))}
                          {copiesList.length > 3 && (
                            <button
                              onClick={() => setViewingCopiesBook({ ...book, copies_detail: copiesList })}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-1 py-0.5 hover:underline"
                            >
                              +{copiesList.length - 3} more
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingCopiesBook({ ...book, copies_detail: copiesList })}
                            className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px] font-medium transition-colors"
                            title="View Copies"
                          >
                            Copies
                          </button>

                          {isAvailable ? (
                            <button
                              onClick={() => onSelectIssue(book)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-xs"
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
                                onDeleteBook(book.id || book._id);
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
            {paginatedTotalBooks.map((book, idx) => {
              const isAvailable = (book.available || 0) > 0;
              return (
                <div
                  key={`${book.id || book._id || idx}`}
                  className="p-4 border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-zinc-400 text-[10px]">{formatAccessionRange(book.accession)}</span>
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
        )
      )}

      {/* Dynamic Pagination Bar (Load by Sections & Changable Count) */}
      {currentItemsCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-2 border-t border-zinc-200 text-xs">
          {/* Left: Item range count & dynamic rows per page selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-zinc-500 font-medium">
              Showing <strong className="text-zinc-900 font-semibold">{startItem}</strong> to <strong className="text-zinc-900 font-semibold">{endItem}</strong> of <strong className="text-zinc-900 font-semibold">{currentItemsCount}</strong> {activeTab === 'available' ? 'Available Copies' : 'Books'}
            </span>

            <div className="flex items-center gap-1.5 text-zinc-500">
              <span>Section size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                title="Change items per page"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {/* Right: Page navigation buttons & Page X of Y */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-zinc-500 mr-1.5 text-[11px]">
              Page <strong className="text-zinc-800">{safePage}</strong> of <strong className="text-zinc-800">{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="First Section"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Previous Section"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Numerical Section / Page Buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= safePage - 2 && p <= safePage + 2))
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push(`ellipsis-${p}`);
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item) => {
                  if (typeof item === 'string') {
                    return <span key={item} className="px-1 text-zinc-400 select-none">...</span>;
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        item === safePage
                          ? 'bg-blue-600 text-white'
                          : 'border border-zinc-200 text-zinc-700 hover:bg-blue-50'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Next Section"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Last Section"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-md max-w-md w-full p-6 space-y-4">
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
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COPIES INSPECTION MODAL */}
      {/* ============================================================ */}
      {viewingCopiesBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-md max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">{viewingCopiesBook.title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Accession #{viewingCopiesBook.accession} • {viewingCopiesBook.copies_detail?.length || viewingCopiesBook.total} Physical Copies
                </p>
              </div>
              <button
                onClick={() => setViewingCopiesBook(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
              {(viewingCopiesBook.copies_detail || []).map((cp) => (
                <div key={cp.copy_number || cp.serial_no} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50/50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{cp.copy_number}
                    </span>
                    <div>
                      <div className="font-mono font-bold text-zinc-900">{cp.serial_no}</div>
                      <div className="text-[10px] text-zinc-400">Accession: {cp.accession} • Barcode: {cp.barcode}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    cp.status === 'Available'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {cp.status || 'Available'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-500">
                Location: <strong>{viewingCopiesBook.shelf || 'Central Stack'}</strong>
              </span>
              <button
                onClick={() => setViewingCopiesBook(null)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
