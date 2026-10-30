import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Sparkles, RefreshCw, Layers, MapPin, 
  Check, ArrowRight, Hash, Bookmark, Eye, CheckCircle2,
  X, Tag, Barcode, Copy, Trash2, FolderPlus, Search, List
} from 'lucide-react';

export default function BookCreationView({ 
  books = [],
  onAddBook, 
  onNavigate, 
  onToast 
}) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'categories'

  // Modals state
  const [isCreateBookModalOpen, setIsCreateBookModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [viewingCopiesBook, setViewingCopiesBook] = useState(null);

  // Dynamic Categories State (Zero hardcoding - dynamically loaded from MongoDB)
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lm_categories', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Fetch all backend dynamic categories from MongoDB Atlas on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
          try { localStorage.setItem('lm_categories', JSON.stringify(data.categories)); } catch {}
          if (data.categories.length > 0 && !selectedCategoryName) {
            setSelectedCategoryName(data.categories[0].name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Form State: Create Book Popup
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('978-013');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [shelf, setShelf] = useState('Rack A-01 (Row 1)');
  const [copies, setCopies] = useState(4);
  const [publisher, setPublisher] = useState('Institutional Press');
  const [edition, setEdition] = useState('Standard Edition (2025)');
  const [baseRandCode, setBaseRandCode] = useState(() => Math.floor(10 + Math.random() * 90));

  // Form State: Create Category Popup
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Selected Category Object (Compact code without hyphens)
  const currentCategoryObj = categories.find(c => c.name === selectedCategoryName) || categories[0] || { name: 'General', code: 'GEN' };
  const currentCode = (currentCategoryObj.code || (currentCategoryObj.name.slice(0, 3))).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'GEN';

  // Base Accession & Barcode (Compact without dashes '-')
  const baseAccession = `AC${currentCode}${baseRandCode}`;
  const baseBarcode = `BC${currentCode}${baseRandCode}`;

  // Sequential Copies Generator (Compact without dashes '-')
  const generateSequentialCopiesList = (copyCount, catCode, randCode) => {
    const list = [];
    const count = Math.max(1, parseInt(copyCount, 10) || 1);
    const cleanCat = (catCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    for (let i = 1; i <= count; i++) {
      list.push({
        copy_number: i,
        serial_no: `SN${cleanCat}${randCode}${i}`,
        accession: `AC${cleanCat}${randCode}${i}`,
        barcode: `BC${cleanCat}${randCode}${i}`,
        status: 'Available'
      });
    }
    return list;
  };

  const sequentialCopies = generateSequentialCopiesList(copies, currentCode, baseRandCode);

  const handleRegenerateCodes = () => {
    const nextRand = Math.floor(10 + Math.random() * 90);
    setBaseRandCode(nextRand);
    if (onToast) onToast('Regenerated compact sequential codes', 'info');
  };

  // Submit Create Book
  const handleCreateBookSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      if (onToast) onToast('Please enter book title and author.', 'danger');
      return;
    }

    const copyCount = Math.max(1, parseInt(copies, 10) || 1);
    const finalCopies = generateSequentialCopiesList(copyCount, currentCode, baseRandCode);

    const newBook = {
      id: Date.now(),
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || '978-XXXXXX',
      category: currentCategoryObj.name,
      category_code: currentCode,
      accession: baseAccession,
      barcode: baseBarcode,
      shelf: shelf.trim() || 'Central Stack',
      total: copyCount,
      available: copyCount,
      publisher: publisher.trim() || 'Institutional Press',
      edition: edition.trim() || 'Standard Edition',
      copies_detail: finalCopies
    };

    if (onAddBook) {
      onAddBook(newBook);
    }

    if (onToast) {
      onToast(`Book "${title}" created with ${copyCount} sequential copies and serial numbers!`, 'success');
    }

    // Reset & close popup
    setIsCreateBookModalOpen(false);
    setTitle('');
    setAuthor('');
    setCopies(4);
    handleRegenerateCodes();
  };

  // Submit Create Category
  const handleCreateCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      if (onToast) onToast('Category name is required.', 'danger');
      return;
    }

    const cleanName = newCatName.trim();
    const cleanCode = (newCatCode.trim() || cleanName.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, '');

    const exists = categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      if (onToast) onToast(`Category "${cleanName}" already exists.`, 'danger');
      return;
    }

    const newCat = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      code: cleanCode || 'GEN',
      description: newCatDesc.trim() || `Department holdings for ${cleanName}`
    };

    setCategories(prev => [...prev, newCat]);
    setSelectedCategoryName(cleanName);

    // Sync to backend if endpoint available
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat)
    }).catch(() => {});

    if (onToast) onToast(`Category "${cleanName}" [${cleanCode}] created dynamically!`, 'success');

    setIsCategoryModalOpen(false);
    setNewCatName('');
    setNewCatCode('');
    setNewCatDesc('');
  };

  const handleDeleteCategory = (catId, catName) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    setCategories(prev => prev.filter(c => c.id !== catId && c.name !== catName));

    fetch(`/api/categories/${catId}`, { method: 'DELETE' }).catch(() => {});
    if (onToast) onToast(`Category "${catName}" removed.`, 'info');
  };

  const totalCopiesCount = books.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalAvailableCount = books.reduce((sum, b) => sum + (b.available || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* Main Heading Only & Action Buttons (Popup Triggers) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Create Book
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Accession book holdings with sequential copy serial numbers and manage dynamic categories
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCreateBookModalOpen(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Book</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
            <span>Add Category</span>
          </button>

          <button
            onClick={() => onNavigate('all_books')}
            className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-600 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>All Books</span>
          </button>
        </div>
      </div>

      {/* Full-Width Metric Strip */}
      <div className="border-t border-b border-zinc-200 grid grid-cols-2 lg:grid-cols-4 py-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Total Titles</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{books.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Catalogued volumes</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Physical Copies</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{totalCopiesCount}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">{totalAvailableCount} copies on shelf</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Dynamic Categories</span>
          <div className="text-2xl font-bold text-zinc-900 mt-0.5">{categories.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Configured dynamically</span>
        </div>

        <div className="p-4">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">Serial Allocation</span>
          <div className="text-xs font-mono font-bold text-zinc-800 mt-1">SN-[CODE]-[ID]-XX</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Sequential barcode per copy</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 transition-colors ${
            activeTab === 'catalog'
              ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Book Accession Register ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 transition-colors ${
            activeTab === 'categories'
              ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Dynamic Categories ({categories.length})
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ACCESSION REGISTER TABLE WITH COPIES & SERIAL NUMBERS */}
      {/* ============================================================ */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Click "+ Create Book" above to open the popup and accession new titles with sequential copy serial numbers.</span>
            <span>{books.length} Books Registered</span>
          </div>

          {books.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400 border-t border-b border-zinc-200">
              No books registered in library yet. Click "+ Create Book" above to accession your first title.
            </div>
          ) : (
            <div className="border-t border-b border-zinc-200 overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-3">Title & Author</th>
                    <th className="py-3 px-3">Category & Code</th>
                    <th className="py-3 px-3">Accession / Barcode Base</th>
                    <th className="py-3 px-3 text-center">Copies</th>
                    <th className="py-3 px-3">Shelf & Rack</th>
                    <th className="py-3 px-3">Sequential Serial Numbers</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {books.map((book, index) => {
                    const copiesCount = book.total !== undefined ? book.total : (book.total_copies || 1);
                    const copiesList = Array.isArray(book.copies_detail) && book.copies_detail.length > 0
                      ? book.copies_detail
                      : generateSequentialCopiesList(copiesCount, (book.category_code || (book.category || 'GEN').slice(0, 3)).toUpperCase(), '101');

                    return (
                      <tr key={`${book.id || book._id || 'book'}-${index}`} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-zinc-900">{book.title}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{book.author}</div>
                        </td>

                        <td className="py-3 px-3 text-zinc-600">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-100 text-zinc-800 font-medium border border-zinc-200">
                            {book.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="font-medium text-zinc-800">{book.accession}</div>
                          <div className="text-[10px] text-zinc-400">{book.barcode}</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {book.available !== undefined ? book.available : copiesCount} / {copiesCount} Copies
                          </span>
                        </td>

                        <td className="py-3 px-3 text-zinc-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            <span>{book.shelf}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {copiesList.slice(0, 3).map((cp, idx) => (
                              <span key={idx} className="font-mono text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                                {cp.serial_no}
                              </span>
                            ))}
                            {copiesList.length > 3 && (
                              <span className="text-[10px] text-zinc-500 font-medium px-1 py-0.5">
                                +{copiesList.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setViewingCopiesBook({ ...book, copies_detail: copiesList })}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-medium transition-colors"
                          >
                            View All Copies
                          </button>
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

      {/* ============================================================ */}
      {/* TAB 2: DYNAMIC CATEGORIES MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Dynamic categories replace rigid presets. Every category assigns an automatic accession prefix code to its copies.</span>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg space-y-2">
              <div>No dynamic categories created yet.</div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium"
              >
                + Create First Category
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {categories.map((cat, index) => {
                const bookCount = books.filter(b => b.category?.toLowerCase() === cat.name.toLowerCase()).length;
                return (
                  <div
                    key={`${cat.id || cat.code || cat.name}-${index}`}
                    className="p-4 border border-zinc-200 rounded-lg space-y-3 hover:border-zinc-300 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-zinc-900">{cat.name}</span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {cat.code}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {cat.description || 'Custom category for institutional book acquisition and rack organization.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-400">
                        {bookCount} Titles in this category
                      </span>

                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 1: CREATE BOOK MODAL (WITH SEQUENTIAL COPIES PREVIEW) */}
      {/* ============================================================ */}
      {isCreateBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-base text-zinc-900">Create Book</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Accession new book holding. Generates sequential IDs and serial numbers for every copy.
                </p>
              </div>
              <button
                onClick={() => setIsCreateBookModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBookSubmit} className="space-y-4 text-xs">
              {/* Title & Author */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Operating System Concepts"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Author(s) *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Silberschatz, Galvin & Gagne"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Dynamic Category & Total Copies */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-zinc-700">Category (Dynamic) *</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-semibold text-zinc-900 underline hover:opacity-80"
                    >
                      + New Category
                    </button>
                  </div>
                  {categories.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400 italic">No categories yet.</span>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-2 py-1 bg-zinc-900 text-white rounded text-[11px] font-medium"
                      >
                        + Create Category First
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedCategoryName || categories[0]?.name}
                      onChange={(e) => setSelectedCategoryName(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
                    >
                      {categories.map(c => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} [Code: {c.code}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Total Copies to Generate *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 font-bold focus:outline-none focus:border-zinc-900"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 2, 4, 10].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setCopies(cnt)}
                          className={`px-2 py-1 border rounded text-[11px] font-medium ${
                            copies === cnt ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shelf Location, ISBN, Publisher */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Shelf & Rack</label>
                  <input
                    type="text"
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                    placeholder="e.g. Rack CS-03 (Row 1)"
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">ISBN Number</label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-013..."
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Wiley, Pearson, etc."
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* ============================================================ */}
              {/* SEQUENTIAL COPIES & SERIAL NUMBER PREVIEW IN POPUP */}
              {/* ============================================================ */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                      Sequential Copy Allocation ({sequentialCopies.length} Copies Generated)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200 text-zinc-800">
                      Code: {currentCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateCodes}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium"
                    title="Regenerate Sequence IDs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate Codes</span>
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-200 border border-zinc-200 rounded-md bg-white">
                  {sequentialCopies.map((cp) => (
                    <div key={cp.copy_number} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {cp.copy_number}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-zinc-900">{cp.serial_no}</span>
                          <span className="text-[10px] text-zinc-400 ml-2">Accession: {cp.accession}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-500">{cp.barcode}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {cp.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  Every single physical copy is assigned its own unique serial number and barcode for tracking, checkout, and inventory auditing.
                </span>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBookModalOpen(false)}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create Book ({copies} Copies)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 2: DYNAMIC CATEGORY CREATION MODAL */}
      {/* ============================================================ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Create Dynamic Category</h3>
                <p className="text-xs text-zinc-500">Adds a new department or subject category to the system</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!newCatCode) {
                      setNewCatCode(e.target.value.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    }
                  }}
                  placeholder="e.g. Mechanical Engineering or Cyber Security"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Prefix Code (Used in Serial Numbers & Barcodes) *
                </label>
                <input
                  type="text"
                  required
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. MECH, CYB, AI, ECE"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono uppercase text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  This code prefixes all copy serial numbers (e.g. SN-<strong>{newCatCode || 'CODE'}</strong>-0101-01).
                </span>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Department textbooks and reference monographs"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* POPUP 3: VIEW COPIES & SERIAL NUMBERS MODAL */}
      {/* ============================================================ */}
      {viewingCopiesBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">{viewingCopiesBook.title}</h3>
                <p className="text-xs text-zinc-500">
                  {viewingCopiesBook.author} • Category: <strong className="text-zinc-800">{viewingCopiesBook.category}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewingCopiesBook(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Total Copies: <strong>{viewingCopiesBook.copies_detail?.length || viewingCopiesBook.total}</strong></span>
                <span>Shelf Location: <strong>{viewingCopiesBook.shelf}</strong></span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                {(viewingCopiesBook.copies_detail || []).map((cp) => (
                  <div key={cp.copy_number} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {cp.copy_number}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-zinc-900">{cp.serial_no}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Accession: {cp.accession}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-zinc-700">{cp.barcode}</div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cp.status || 'Available'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 text-right">
              <button
                onClick={() => setViewingCopiesBook(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium"
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
