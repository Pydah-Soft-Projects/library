import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  BookOpen, Plus, Sparkles, RefreshCw, Layers, MapPin, 
  Check, ArrowRight, Hash, Bookmark, Eye, CheckCircle2,
  X, Tag, Barcode, Copy, Trash2, FolderPlus, Search, List,
  FileSpreadsheet, UploadCloud, Download, AlertCircle, FileText, CheckCircle,
  Upload, SlidersHorizontal
} from 'lucide-react';

export default function BookCreationView({ 
  books = [],
  onAddBook, 
  onBulkAddBooks,
  onNavigate, 
  onToast 
}) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'excel' | 'categories'

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
        }
      })
      .catch(() => {});
  }, []);

  // Form State: Create Book Popup (Category is completely optional)
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

  // Excel Upload & Parser State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedBooks, setParsedBooks] = useState([]);
  const [parseSummary, setParseSummary] = useState(null); // { totalRows, validCount, invalidCount }
  const [excelSearchTerm, setExcelSearchTerm] = useState('');
  const [defaultUploadCategory, setDefaultUploadCategory] = useState('');
  const [defaultUploadShelf, setDefaultUploadShelf] = useState('Central Stack');
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef(null);

  // Helper to extract highest serial / accession number from catalog
  const getHighestSerialNumber = (bookList) => {
    let maxNum = 0;
    if (!Array.isArray(bookList)) return 0;
    bookList.forEach(b => {
      if (Array.isArray(b.copies_detail) && b.copies_detail.length > 0) {
        b.copies_detail.forEach(c => {
          const n1 = parseInt(String(c.accession || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n1) && n1 > maxNum) maxNum = n1;
          const n2 = parseInt(String(c.serial_no || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n2) && n2 > maxNum) maxNum = n2;
        });
      } else {
        const n1 = parseInt(String(b.accession || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(n1) && n1 > maxNum) maxNum = n1;
        const n2 = parseInt(String(b.barcode || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(n2) && n2 > maxNum) maxNum = n2;
      }
    });
    return maxNum;
  };

  const latestCatalogSerial = getHighestSerialNumber(books);
  const [startSerial, setStartSerial] = useState(latestCatalogSerial + 1);

  // Automatically update startSerial when books catalog changes or modal opens
  useEffect(() => {
    const latest = getHighestSerialNumber(books);
    setStartSerial(latest + 1);
  }, [books, isCreateBookModalOpen]);

  // Selected Category Object (Defaults to General if not chosen)
  const currentCategoryObj = categories.find(c => c.name === selectedCategoryName) || { name: 'General', code: 'GEN' };
  const currentCode = (currentCategoryObj.code || (currentCategoryObj.name.slice(0, 3))).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'GEN';

  // Sequential Copies Generator: each copy's accession number IS the serial number
  const generateSequentialCopiesList = (copyCount, startingNum) => {
    const list = [];
    const count = Math.max(1, parseInt(copyCount, 10) || 1);
    const start = Math.max(1, parseInt(startingNum, 10) || 1);
    for (let i = 0; i < count; i++) {
      const serialStr = String(start + i);
      list.push({
        copy_number: i + 1,
        serial_no: serialStr,
        accession: serialStr,
        barcode: serialStr,
        status: 'Available'
      });
    }
    return list;
  };

  const sequentialCopies = generateSequentialCopiesList(copies, startSerial);

  // Submit Create Book (Category is completely optional, serial numbers follow latest catalog)
  const handleCreateBookSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      if (onToast) onToast('Please enter book title and author.', 'danger');
      return;
    }

    const copyCount = Math.max(1, parseInt(copies, 10) || 1);
    const targetCatObj = categories.find(c => c.name === selectedCategoryName) || { name: 'General', code: 'GEN' };
    const targetCode = (targetCatObj.code || targetCatObj.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'GEN';
    const finalCopies = generateSequentialCopiesList(copyCount, startSerial);

    const firstAcc = finalCopies[0]?.accession || String(startSerial);
    const lastAcc = finalCopies[finalCopies.length - 1]?.accession || firstAcc;
    const finalAccession = copyCount > 1 ? `${firstAcc} - ${lastAcc}` : firstAcc;

    const newBook = {
      id: Date.now(),
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || '',
      category: selectedCategoryName ? targetCatObj.name : 'General',
      category_code: targetCode,
      accession: finalAccession,
      barcode: firstAcc,
      shelf: shelf.trim() || 'Central Stack',
      total: copyCount,
      available: copyCount,
      publisher: publisher.trim() || 'BPB Publication',
      edition: edition.trim() || 'Standard Edition',
      copies_detail: finalCopies
    };

    if (onAddBook) {
      onAddBook(newBook);
    }

    if (onToast) {
      onToast(`Book "${title}" created with ${copyCount} sequential copies (Serial #${firstAcc} to #${lastAcc})!`, 'success');
    }

    setIsCreateBookModalOpen(false);
    setTitle('');
    setAuthor('');
    setSelectedCategoryName('');
    setCopies(2);
  };

    // ==================== EXCEL PARSER LOGIC ====================
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file);
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    parseExcelFile(file);
  };

  const parseExcelFile = (file) => {
    setUploadedFileName(file.name);
    setIsParsingExcel(true);
    setImportCompleted(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 1. Convert sheet to 2D row grid
        const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawGrid || rawGrid.length === 0) {
          if (onToast) onToast('The uploaded spreadsheet contains no data rows.', 'danger');
          setIsParsingExcel(false);
          return;
        }

        // 2. Intelligent Header Detection: scan first 25 rows to identify the real column headers
        const HEADER_KEYWORDS = [
          'title', 'titlename', 'booktitle', 'book_title', 'name',
          'accession', 'accessionno', 'accession_no', 'accno',
          'author', 'authorname', 'author_name',
          'publisher', 'publishername', 'publisher_name',
          'isbn', 'category', 'categoryname', 'edition', 'pages', 'barcode', 'serialno'
        ];

        let bestRowIdx = 0;
        let maxScore = 0;
        for (let i = 0; i < Math.min(25, rawGrid.length); i++) {
          const row = rawGrid[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          let score = 0;
          row.forEach(cell => {
            const clean = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (HEADER_KEYWORDS.some(kw => clean.includes(kw))) score++;
          });
          if (score > maxScore) {
            maxScore = score;
            bestRowIdx = i;
          }
        }

        const headers = Array.isArray(rawGrid[bestRowIdx])
          ? rawGrid[bestRowIdx].map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
          : [];

        // 3. Convert grid rows into mapped key-value rows
        const rawRows = [];
        for (let i = bestRowIdx + 1; i < rawGrid.length; i++) {
          const row = rawGrid[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          const map = {};
          headers.forEach((h, colIdx) => {
            if (h) {
              map[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
            }
          });
          rawRows.push(map);
        }

        if (rawRows.length === 0) {
          if (onToast) onToast('No readable book records found below header in spreadsheet.', 'danger');
          setIsParsingExcel(false);
          return;
        }

        // Grouping Map to accumulate multiple entries of the same book into copies count
        const groupedBooksMap = new Map();
        let skippedRowsCount = 0;
        let runningSerial = getHighestSerialNumber(books);

        let lastSeenTitle = '';
        let lastSeenTitleId = '';
        let lastSeenAuthor = '';
        let lastSeenPublisher = '';
        let lastSeenCategory = '';
        let lastSeenShelf = '';

        rawRows.forEach((map, idx) => {
          let titleVal = (
            map['titlename'] ||
            map['title'] ||
            map['booktitle'] ||
            map['name'] ||
            ''
          ).toString().trim();

          const accVal = (
            map['accessionno'] ||
            map['accession'] ||
            map['accno'] ||
            map['serialno'] ||
            ''
          ).toString().trim();

          let titleId = (map['titleid'] || '').toString().trim();

          // Gracefully skip metadata/status/total footer rows (like "Status :", "Total :"), header repeats, or empty rows
          const lowerTitle = titleVal.toLowerCase();
          const lowerAcc = accVal.toLowerCase();
          if (
            lowerTitle.includes('status :') || 
            lowerTitle === 'status' || 
            lowerAcc.includes('status') ||
            lowerTitle.includes('total :') ||
            lowerTitle === 'total' ||
            lowerAcc.includes('total') ||
            lowerTitle.startsWith('report') ||
            lowerAcc.startsWith('report')
          ) {
            skippedRowsCount++;
            return;
          }

          // Fallback to previous row's title if accession exists but title is empty
          if (!titleVal && accVal && lastSeenTitle) {
            titleVal = lastSeenTitle;
            if (!titleId) titleId = lastSeenTitleId;
          }

          if (!titleVal && !accVal) {
            skippedRowsCount++;
            return;
          }

          if (titleVal) {
            lastSeenTitle = titleVal;
            lastSeenTitleId = titleId;
          }

          // Track numeric accession for continuing serial numbers
          const numericAcc = parseInt(accVal.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numericAcc) && numericAcc > runningSerial) {
            runningSerial = numericAcc;
          }

          const authorVal = (
            map['authorname'] ||
            map['author'] ||
            map['authors'] ||
            map['publishername'] ||
            'BPB Publication'
          ).toString().trim() || 'Institutional Author';

          const publisherVal = (
            map['publishername'] ||
            map['publisher'] ||
            'BPB Publication'
          ).toString().trim() || 'BPB Publication';

          const editionVal = (
            map['edition'] ||
            map['yearofpublication'] ||
            map['year'] ||
            'Standard Edition'
          ).toString().trim();

          const pagesVal = (map['pages'] || '').toString().trim();

          const shelfVal = (
            map['palceofpublication'] ||
            map['placeofpublication'] ||
            map['almwsid'] ||
            map['shelf'] ||
            map['rack'] ||
            'Central Stack'
          ).toString().trim() || 'Central Stack';

          const categoryVal = (
            map['categoryname'] ||
            map['category'] ||
            'General'
          ).toString().trim() || 'General';

          const isbnVal = (
            map['classificationnumber'] ||
            map['cluttercallno'] ||
            map['isbn'] ||
            ''
          ).toString().trim();

          // Group by titleId if provided, or normalized title name
          const groupKey = titleId ? ('id_' + titleId) : ('title_' + titleVal.toLowerCase());

          if (!groupedBooksMap.has(groupKey)) {
            groupedBooksMap.set(groupKey, {
              titleId,
              title: titleVal,
              author: authorVal,
              publisher: publisherVal,
              edition: editionVal,
              pages: pagesVal,
              shelf: shelfVal,
              category: categoryVal,
              isbn: isbnVal,
              copies: []
            });
          }

          const bookGroup = groupedBooksMap.get(groupKey);
          const copyNumber = bookGroup.copies.length + 1;
          const copyAccession = accVal || String(runningSerial + 1);

          bookGroup.copies.push({
            copy_number: copyNumber,
            serial_no: copyAccession,
            accession: copyAccession,
            barcode: copyAccession,
            status: 'Available'
          });
        });

        // Convert grouped books into normalized list for review
        const normalizedList = Array.from(groupedBooksMap.values()).map((b, idx) => {
          const firstAcc = b.copies[0]?.accession || '1';
          const lastAcc = b.copies[b.copies.length - 1]?.accession || firstAcc;
          const accDisplay = b.copies.length > 1 ? `${firstAcc} - ${lastAcc}` : firstAcc;

          return {
            id: `excel-book-${Date.now()}-${idx}`,
            rowNumber: idx + 1,
            titleId: b.titleId,
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            edition: b.edition,
            pages: b.pages,
            category: b.category,
            hasFileCategory: Boolean(b.category && b.category !== 'General'),
            shelf: b.shelf,
            total: b.copies.length,
            available: b.copies.length,
            accession: accDisplay,
            barcode: firstAcc,
            isbn: b.isbn,
            copies_detail: b.copies,
            isValid: true
          };
        });

        setParsedBooks(normalizedList);
        const totalCopiesCount = normalizedList.reduce((sum, b) => sum + b.total, 0);

        setParseSummary({
          totalTitles: normalizedList.length,
          totalCopies: totalCopiesCount,
          skippedRows: skippedRowsCount,
          validCount: normalizedList.length,
          invalidCount: 0
        });

        if (onToast) {
          onToast(`Parsed ${normalizedList.length} book titles with ${totalCopiesCount} physical copies! (Accessions: #${normalizedList[0]?.copies_detail[0]?.accession} to #${runningSerial})`, 'success');
        }
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        if (onToast) onToast('Failed to parse file: ' + err.message, 'danger');
      } finally {
        setIsParsingExcel(false);
      }
    };

    reader.onerror = () => {
      setIsParsingExcel(false);
      if (onToast) onToast('Failed to read the file.', 'danger');
    };

    reader.readAsArrayBuffer(file);
  };

  // Sample Excel Generator matching exact software columns & multiple copies per book
  const handleDownloadSampleExcel = () => {
    const sampleHeaders = [
      'AccessionNo', 'TitleId', 'TitleName', 'AuthorName', 'MediaName', 'AllowLend.',
      'PublisherName', 'Palce OfPublication', 'Year OfPublication', 'Clutter/Call No',
      'Category Name', 'ClassificationNumber', 'Language Name', 'BindingSize', 'Pages',
      'Edition', 'SupplierName', 'BillNumber', 'Date OfPurchase', 'Entry Date', 'Currency', 'DiscountPercent'
    ];

    const sampleRows = [
      sampleHeaders,
      ['1', '1121', 'Let us c', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2022', '', 'Computer Science', '978-8176566216', 'English', 'Standard', '748', '8th', 'VGS', 'BILL-101', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['2', '1121', 'Let us c', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2022', '', 'Computer Science', '978-8176566216', 'English', 'Standard', '748', '8th', 'VGS', 'BILL-101', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['3', '1121', 'Let us c', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2022', '', 'Computer Science', '978-8176566216', 'English', 'Standard', '748', '8th', 'VGS', 'BILL-101', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['4', '651', 'UnderstadingPointers in C', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2021', '', 'Computer Science', '978-8176563581', 'English', 'Standard', '501', '3rd', 'VGS', 'BILL-102', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['5', '651', 'UnderstadingPointers in C', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2021', '', 'Computer Science', '978-8176563581', 'English', 'Standard', '501', '3rd', 'VGS', 'BILL-102', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['6', '651', 'UnderstadingPointers in C', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2021', '', 'Computer Science', '978-8176563581', 'English', 'Standard', '501', '3rd', 'VGS', 'BILL-102', '2024-01-15', '2024-01-20', 'INR', '0'],
      ['7', '651', 'UnderstadingPointers in C', 'Yashavant Kanetkar', 'BOOK', 'Y', 'BPB Publication', '18', '2021', '', 'Computer Science', '978-8176563581', 'English', 'Standard', '501', '3rd', 'VGS', 'BILL-102', '2024-01-15', '2024-01-20', 'INR', '0']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Books');
    XLSX.writeFile(wb, 'library_books_sample_template.xlsx');
    if (onToast) onToast('Downloaded sample template with multiple copies and sequential accession serials!', 'info');
  };

    const handleConfirmImport = async () => {
    const validBooks = parsedBooks.filter(b => b.isValid);
    if (validBooks.length === 0) {
      if (onToast) onToast('No valid books found to import.', 'danger');
      return;
    }

    setIsImporting(true);

    const payload = validBooks.map(b => ({
      title: b.title,
      author: b.author,
      category: b.category || defaultUploadCategory || 'General',
      accession: b.accession,
      barcode: b.barcode || b.copies_detail?.[0]?.barcode || b.accession,
      shelf: b.shelf || defaultUploadShelf || 'Central Stack',
      total: b.copies_detail?.length || b.total || 1,
      available: b.copies_detail?.length || b.total || 1,
      publisher: b.publisher || 'BPB Publication',
      edition: b.edition || 'Standard Edition',
      isbn: b.isbn || '',
      copies_detail: b.copies_detail || []
    }));

    try {
      if (onBulkAddBooks) {
        const res = await onBulkAddBooks(payload);
        setImportCount(res?.count || payload.length);
      } else {
        const res = await fetch('/api/books/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ books: payload })
        });
        const data = await res.json();
        setImportCount(data.imported_count || payload.length);
      }

      setImportCompleted(true);
      setParsedBooks([]);
      const totalCopiesImported = payload.reduce((sum, b) => sum + (b.copies_detail?.length || 1), 0);
      if (onToast) onToast(`Successfully imported ${payload.length} titles with ${totalCopiesImported} physical copies!`, 'success');
    } catch (err) {
      console.error('Import error:', err);
      if (onToast) onToast('Failed to import books: ' + err.message, 'danger');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteParsedRow = (id) => {
    setParsedBooks(prev => {
      const next = prev.filter(b => b.id !== id);
      const valid = next.filter(b => b.isValid).length;
      setParseSummary(s => s ? { ...s, totalRows: next.length, validCount: valid, invalidCount: next.length - valid } : null);
      return next;
    });
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
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('excel')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs ${
              activeTab === 'excel'
                ? 'bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload Excel</span>
          </button>

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
      <div className="flex items-center gap-6 border-b border-zinc-200 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 transition-colors shrink-0 ${
            activeTab === 'catalog'
              ? 'text-zinc-900 font-bold border-b-2 border-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Book Accession Register ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'excel'
              ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Excel Upload & Parser</span>
          {parsedBooks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {parsedBooks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 transition-colors shrink-0 ${
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
                      : generateSequentialCopiesList(copiesCount, book.accession || (index + 1));

                    return (
                      <tr key={book.id || book._id || index} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-3 max-w-[220px]">
                          <div className="font-semibold text-zinc-900 truncate">{book.title}</div>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">{book.author}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {book.category || 'General'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-zinc-700">
                          <div className="font-semibold">{book.accession}</div>
                          {book.barcode && <div className="text-[10px] text-zinc-400">{book.barcode}</div>}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {book.available !== undefined ? book.available : copiesCount} / {copiesCount} Copies
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-zinc-600 font-mono text-[11px]">
                          {book.shelf || 'Central Stack'}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {copiesList.slice(0, 3).map((cp, idx) => (
                              <span key={idx} className="font-mono text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                                {cp.serial_no || cp.accession || `#${cp.copy_number}`}
                              </span>
                            ))}
                            {copiesList.length > 3 && (
                              <button
                                type="button"
                                onClick={() => setViewingCopiesBook({ ...book, copies_detail: copiesList })}
                                className="font-mono text-[10px] bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-600 border border-zinc-200 transition-colors cursor-pointer"
                              >
                                +{copiesList.length - 3} more
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingCopiesBook({ ...book, copies_detail: copiesList })}
                            className="px-2.5 py-1 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-700 text-xs font-medium transition-colors"
                          >
                            Copies ({copiesList.length})
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
      {/* TAB 3: EXCEL UPLOAD & SPREADSHEET PARSER */}
      {/* ============================================================ */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          {/* Header & Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50/60 via-white to-white border border-emerald-200/80 rounded-2xl shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <h2 className="text-base font-bold text-zinc-900">
                  Excel Book Parser & Bulk Uploader
                </h2>
              </div>
              <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                Upload existing books from Excel (.xlsx, .xls) or CSV. Accepts college software exports with columns like <code className="font-mono text-emerald-700 font-semibold">Title Id, title Name, authorName, Alm WS.ID, publisher Name, Place Of Publication, Year Of Publication, Class/call No, Category Name</code>. All fields and <strong className="text-zinc-800">Category are completely optional</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Sample Template (.xlsx)</span>
            </button>
          </div>

          {/* Import Success Notification */}
          {importCompleted && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">Bulk Import Successful!</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {importCount} books were accessioned and stored in the database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('all_books')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View in All Books</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportCompleted(false);
                    setUploadedFileName('');
                  }}
                  className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          )}

          {/* File Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFile}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-zinc-900">
                {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Click to select or drag & drop Excel / CSV file'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports .xlsx, .xls, .csv files exported from existing library systems
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs">
              {isParsingExcel ? 'Parsing spreadsheet...' : 'Browse Computer Files'}
            </span>
          </div>

          {/* Parsed Books Review & Settings Panel */}
          {parsedBooks.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-5">
              {/* Prominent Total Books & Total Copies Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Total Books</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    {(parseSummary?.totalTitles || parsedBooks.length).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Unique catalog titles</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Copies</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                    {(parseSummary?.totalCopies || parsedBooks.reduce((s, b) => s + b.total, 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Total physical holdings</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-purple-600" />
                    <span>Accession Range</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-1.5 font-mono truncate" title="Accession range">
                    {parsedBooks[0]?.copies_detail?.[0]?.accession 
                      ? `#${parsedBooks[0].copies_detail[0].accession} – #${parsedBooks[parsedBooks.length - 1]?.copies_detail?.[parsedBooks[parsedBooks.length - 1]?.copies_detail?.length - 1]?.accession || parsedBooks[parsedBooks.length - 1]?.accession}` 
                      : 'Sequential Acc'}
                  </div>
                  <span className="text-[10px] text-slate-400">Barcode serial mappings</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>File Import Status</span>
                  </div>
                  <div className="text-xs font-bold text-teal-800 mt-1.5 truncate" title={uploadedFileName}>
                    {uploadedFileName || 'Ready to Catalog'}
                  </div>
                  <span className="text-[10px] text-teal-600 font-medium">
                    {(parseSummary?.skippedRows || 0) > 0 ? `${parseSummary.skippedRows} footer/status rows skipped` : 'Ready for accessioning'}
                  </span>
                </div>
              </div>

              {/* Action Buttons Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="text-xs text-zinc-500">
                  Review the catalog holdings below. Click <strong>Confirm & Import</strong> to add all books and physical copies to the database.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedBooks([]);
                      setUploadedFileName('');
                      setParseSummary(null);
                    }}
                    className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Clear File
                  </button>
                  <button
                    type="button"
                    disabled={isImporting || parsedBooks.length === 0}
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Confirm & Import All {parsedBooks.length} Titles ({parseSummary?.totalCopies || parsedBooks.reduce((s, b) => s + b.total, 0)} Copies)</span>
                  </button>
                </div>
              </div>

              {/* Upload Defaults Configuration Strip (2 Columns: Default Category and Default Shelf) */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Fallback Category (Optional)
                  </label>
                  <select
                    value={defaultUploadCategory}
                    onChange={(e) => setDefaultUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">General (Default for rows without category)</option>
                    {categories.map(c => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} [{c.code}]
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Applied if Category column is empty in row</span>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Default Shelf / Rack
                  </label>
                  <input
                    type="text"
                    value={defaultUploadShelf}
                    onChange={(e) => setDefaultUploadShelf(e.target.value)}
                    placeholder="Central Stack"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Used when Alm WS.ID/Shelf is empty</span>
                </div>
              </div>

              {/* Search Filter in Parsed Rows with live counts */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={excelSearchTerm}
                    onChange={(e) => setExcelSearchTerm(e.target.value)}
                    placeholder="Filter parsed books by title, author, accession, or category..."
                    className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="text-xs text-slate-600 shrink-0 font-medium">
                  Showing <strong>{parsedBooks.filter(b => {
                    if (!excelSearchTerm) return true;
                    const q = excelSearchTerm.toLowerCase();
                    return (
                      b.title.toLowerCase().includes(q) ||
                      b.author.toLowerCase().includes(q) ||
                      b.accession.toLowerCase().includes(q) ||
                      b.category.toLowerCase().includes(q) ||
                      (b.titleId && b.titleId.toLowerCase().includes(q))
                    );
                  }).length.toLocaleString()}</strong> of <strong>{parsedBooks.length.toLocaleString()}</strong> titles
                  <span className="text-slate-400 ml-1.5">
                    ({parsedBooks.filter(b => {
                      if (!excelSearchTerm) return true;
                      const q = excelSearchTerm.toLowerCase();
                      return (
                        b.title.toLowerCase().includes(q) ||
                        b.author.toLowerCase().includes(q) ||
                        b.accession.toLowerCase().includes(q) ||
                        b.category.toLowerCase().includes(q) ||
                        (b.titleId && b.titleId.toLowerCase().includes(q))
                      );
                    }).reduce((sum, b) => sum + b.total, 0).toLocaleString()} copies)
                  </span>
                </div>
              </div>

              {/* Interactive Parsed Books Table - Fixed column alignment */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 text-center w-14">#</th>
                      <th className="py-3 px-3 text-left w-64">Book Title & TitleId</th>
                      <th className="py-3 px-3 text-center w-28">Copies Count</th>
                      <th className="py-3 px-3 text-left w-56">Accession Range</th>
                      <th className="py-3 px-3 text-left w-48">Author & Publisher</th>
                      <th className="py-3 px-3 text-center w-28">Category</th>
                      <th className="py-3 px-3 text-center w-28">Shelf</th>
                      <th className="py-3 px-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {parsedBooks
                      .filter(b => {
                        if (!excelSearchTerm) return true;
                        const q = excelSearchTerm.toLowerCase();
                        return (
                          b.title.toLowerCase().includes(q) ||
                          b.author.toLowerCase().includes(q) ||
                          b.accession.toLowerCase().includes(q) ||
                          b.category.toLowerCase().includes(q) ||
                          (b.titleId && b.titleId.toLowerCase().includes(q))
                        );
                      })
                      .map((book) => {
                        const allSerialsStr = book.copies_detail?.map(c => c.accession).join(', ') || book.accession;
                        return (
                          <tr
                            key={book.id}
                            className="hover:bg-zinc-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-[11px] text-zinc-400 font-mono text-center align-middle">
                              {book.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <div className="font-bold text-zinc-900 truncate" title={book.title}>{book.title}</div>
                              {book.titleId && (
                                <span className="text-[10px] text-blue-700 font-mono font-medium block">
                                  TitleId: {book.titleId}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center align-middle">
                              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                {book.total} {book.total === 1 ? 'Copy' : 'Copies'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <div className="font-mono font-bold text-zinc-900 text-xs">
                                Acc: #{book.accession}
                              </div>
                              {book.copies_detail && book.copies_detail.length > 1 ? (
                                <div 
                                  className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate cursor-help"
                                  title={`All Serials: ${allSerialsStr}`}
                                >
                                  {book.total} copies (#{book.copies_detail[0]?.accession} to #{book.copies_detail[book.copies_detail.length - 1]?.accession})
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Single accession</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 align-middle">
                              <div className="font-medium text-zinc-800 truncate" title={book.author}>{book.author}</div>
                              <div className="text-[11px] text-zinc-400 truncate" title={`${book.publisher} (${book.edition})`}>
                                {book.publisher} • {book.edition}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center align-middle">
                              {book.hasFileCategory ? (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 truncate max-w-[100px]" title={book.category}>
                                  {book.category}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] text-zinc-500 bg-zinc-100 border border-zinc-200 truncate max-w-[100px]">
                                  {defaultUploadCategory || 'General'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px] text-center align-middle">
                              {book.shelf || defaultUploadShelf}
                            </td>
                            <td className="py-2.5 px-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleDeleteParsedRow(book.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Remove from import"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-zinc-50/90 font-bold border-t border-zinc-200 text-xs sticky bottom-0 z-10">
                    <tr>
                      <td className="py-3 px-3 text-center text-zinc-400">Total</td>
                      <td className="py-3 px-3 text-zinc-900 font-bold">
                        {parsedBooks.filter(b => {
                          if (!excelSearchTerm) return true;
                          const q = excelSearchTerm.toLowerCase();
                          return (
                            b.title.toLowerCase().includes(q) ||
                            b.author.toLowerCase().includes(q) ||
                            b.accession.toLowerCase().includes(q) ||
                            b.category.toLowerCase().includes(q) ||
                            (b.titleId && b.titleId.toLowerCase().includes(q))
                          );
                        }).length.toLocaleString()} Titles
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold">
                          {parsedBooks.filter(b => {
                            if (!excelSearchTerm) return true;
                            const q = excelSearchTerm.toLowerCase();
                            return (
                              b.title.toLowerCase().includes(q) ||
                              b.author.toLowerCase().includes(q) ||
                              b.accession.toLowerCase().includes(q) ||
                              b.category.toLowerCase().includes(q) ||
                              (b.titleId && b.titleId.toLowerCase().includes(q))
                            );
                          }).reduce((sum, b) => sum + b.total, 0).toLocaleString()} Copies
                        </span>
                      </td>
                      <td colSpan={5} className="py-3 px-3 text-right text-zinc-500 font-medium">
                        All physical copies mapped with sequential accession numbers
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
                    <label className="font-medium text-zinc-700">Category (Optional)</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-semibold text-zinc-900 underline hover:opacity-80"
                    >
                      + New Category
                    </button>
                  </div>
                  <select
                    value={selectedCategoryName}
                    onChange={(e) => setSelectedCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-zinc-900"
                  >
                    <option value="">General (Default - No category specified)</option>
                    {categories.map(c => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} [Code: {c.code}]
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Optional. Default is General category.
                  </span>
                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-zinc-700">
                        Starting Serial / Accession *
                      </label>
                      {latestCatalogSerial > 0 && (
                        <span className="text-[10px] text-blue-600 font-semibold">
                          Next after #{latestCatalogSerial}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      value={startSerial}
                      onChange={(e) => setStartSerial(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      Following from the end of catalog serial numbers
                    </span>
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
                    placeholder="BPB Publication, Wiley, etc."
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* SEQUENTIAL COPIES & SERIAL NUMBER PREVIEW IN POPUP */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                    Sequential Copy Allocation ({sequentialCopies.length} Copies Generated)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
                    Accession Range: #{sequentialCopies[0]?.accession} to #{sequentialCopies[sequentialCopies.length - 1]?.accession}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-200 border border-zinc-200 rounded-md bg-white">
                  {sequentialCopies.map((cp) => (
                    <div key={cp.copy_number} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {cp.copy_number}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-zinc-900">Accession & Serial #{cp.accession}</span>
                          <span className="text-[10px] text-zinc-400 ml-2 font-mono">Barcode: {cp.barcode}</span>
                        </div>
                      </div>

                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cp.status}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  Every copy is assigned its sequential accession and serial number following directly from the latest serial number in the library catalog.
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
