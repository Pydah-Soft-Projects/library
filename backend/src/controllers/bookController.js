const Book = require('../models/Book');
const Category = require('../models/Category');
const { logAudit } = require('../services/auditService');



async function getBooks(req, res) {
  try {
    const { q, category, available_only } = req.query || {};
    const query = {};

    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (q) {
      const term = q.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { author: { $regex: term, $options: 'i' } },
        { accession: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } },
        { shelf: { $regex: term, $options: 'i' } },
        { isbn: { $regex: term, $options: 'i' } }
      ];
    }

    if (available_only === 'true') {
      query.available = { $gt: 0 };
    }

    const books = await Book.find(query).sort({ created_at: -1 }).lean();

    const formattedBooks = books.map(b => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      category_code: b.category_code,
      accession: b.accession,
      barcode: b.barcode,
      shelf: b.shelf,
      total: b.total,
      available: b.available !== undefined && b.available !== null ? Number(b.available) : (b.copies_detail?.length || b.total || 1),
      publisher: b.publisher,
      edition: b.edition,
      copies_detail: b.copies_detail || []
    }));

    res.json({
      total: formattedBooks.length,
      books: formattedBooks
    });
  } catch (err) {
    console.error('Error in getBooks:', err);
    res.status(500).json({ error: 'Failed to retrieve books from database' });
  }
}

async function getBookById(req, res) {
  try {
    const { id } = req.params;
    let book = null;
    try {
      book = await Book.findById(id).lean();
    } catch (_) {}

    if (!book) {
      book = await Book.findOne({
        $or: [{ accession: id }, { barcode: id }]
      }).lean();
    }

    if (!book) {
      return res.status(404).json({ error: 'Book record not found' });
    }

    res.json({
      book: {
        id: book._id.toString(),
        ...book
      }
    });
  } catch (err) {
    console.error('Error in getBookById:', err);
    res.status(500).json({ error: 'Failed to find book' });
  }
}


async function getLatestAccessionSerial() {
  try {
    const books = await Book.find({}, 'accession barcode copies_detail').lean();
    let max = 0;
    books.forEach(b => {
      if (Array.isArray(b.copies_detail)) {
        b.copies_detail.forEach(c => {
          const n1 = parseInt(String(c.accession || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n1) && n1 > max) max = n1;
          const n2 = parseInt(String(c.serial_no || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n2) && n2 > max) max = n2;
        });
      }
      const n1 = parseInt(String(b.accession || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n1) && n1 > max) max = n1;
      const n2 = parseInt(String(b.barcode || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n2) && n2 > max) max = n2;
    });
    return max;
  } catch (e) {
    return 0;
  }
}

async function getLatestSerialEndpoint(req, res) {
  try {
    const latest = await getLatestAccessionSerial();
    res.json({ latest_serial: latest, next_serial: latest + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createBook(req, res) {
  try {
    const { 
      title, 
      author, 
      isbn, 
      category, 
      category_code, 
      accession, 
      barcode, 
      shelf, 
      total, 
      available, 
      publisher, 
      edition,
      copies_detail 
    } = req.body || {};

    if (!title || !author) {
      return res.status(400).json({ error: 'Book title and author are required' });
    }

    const copies = Math.max(1, parseInt(total, 10) || 1);
    const catCode = (category_code || (category || 'GEN').slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN';

    // Auto-generate sequential copy IDs and serial numbers continuing from max existing serial
    let finalCopiesDetail = [];
    if (Array.isArray(copies_detail) && copies_detail.length > 0) {
      finalCopiesDetail = copies_detail;
    } else {
      const latestSerial = await getLatestAccessionSerial();
      for (let i = 1; i <= copies; i++) {
        const serialStr = String(latestSerial + i);
        finalCopiesDetail.push({
          copy_number: i,
          serial_no: serialStr,
          accession: serialStr,
          barcode: serialStr,
          status: 'Available'
        });
      }
    }

    const firstCopyAcc = finalCopiesDetail[0]?.accession || '1';
    const lastCopyAcc = finalCopiesDetail[finalCopiesDetail.length - 1]?.accession || firstCopyAcc;
    const finalAccession = accession || (copies > 1 ? `${firstCopyAcc} - ${lastCopyAcc}` : firstCopyAcc);
    const finalBarcode = barcode || firstCopyAcc;

    const newBook = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn ? isbn.trim() : '',
      category: category || 'General',
      category_code: catCode,
      accession: finalAccession,
      barcode: finalBarcode,
      shelf: shelf ? shelf.trim() : 'Central Stack',
      total: finalCopiesDetail.length,
      available: available !== undefined ? parseInt(available, 10) : finalCopiesDetail.length,
      publisher: publisher ? publisher.trim() : 'Institutional Press',
      edition: edition ? edition.trim() : 'Standard Edition',
      copies_detail: finalCopiesDetail
    });

    logAudit({
      actor_id: req.user?.userId || 'STAFF',
      action_key: 'catalog.create',
      target_resource: `BOOK:${newBook._id.toString()}`,
      payload: { 
        title: newBook.title, 
        accession: newBook.accession, 
        copies: finalCopiesDetail.length, 
        serial_numbers: finalCopiesDetail.map(c => c.serial_no) 
      }
    });

    res.status(201).json({
      message: `Book created with ${finalCopiesDetail.length} sequential copies and serial numbers`,
      book: {
        id: newBook._id.toString(),
        ...newBook.toObject()
      }
    });
  } catch (err) {
    console.error('Error creating book in MongoDB:', err);
    res.status(500).json({ error: 'Failed to create book: ' + err.message });
  }
}

async function bulkCreateBooks(req, res) {
  try {
    const { books } = req.body || {};
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ error: 'Array of books is required' });
    }

    const createdBooks = [];
    const errors = [];
    let currentLatestSerial = await getLatestAccessionSerial();

    for (let index = 0; index < books.length; index++) {
      const item = books[index];
      const title = (item.title || item.titleName || item['title Name'] || '').trim();
      const author = (item.author || item.authorName || item['authorName'] || 'BPB Publication').trim();

      if (!title) {
        errors.push({ index, error: 'Missing book title' });
        continue;
      }

      // Category is strictly optional - defaults to 'General'
      const rawCategory = (item.category || item.categoryName || item['Category Name'] || '').trim();
      const category = rawCategory || 'General';
      const catCode = (item.category_code || category.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN';
      
      const copies = Math.max(1, parseInt(item.total || item.copies || item.quantity || (item.copies_detail ? item.copies_detail.length : 1), 10));

      let finalCopiesDetail = [];
      if (Array.isArray(item.copies_detail) && item.copies_detail.length > 0) {
        finalCopiesDetail = item.copies_detail.map((c, i) => {
          const acc = String(c.accession || c.serial_no || (++currentLatestSerial)).trim();
          const num = parseInt(acc.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > currentLatestSerial) currentLatestSerial = num;
          return {
            copy_number: c.copy_number || i + 1,
            serial_no: String(c.serial_no || acc),
            accession: acc,
            barcode: String(c.barcode || acc),
            status: c.status || 'Available'
          };
        });
      } else {
        for (let i = 1; i <= copies; i++) {
          const serial = String(++currentLatestSerial);
          finalCopiesDetail.push({
            copy_number: i,
            serial_no: serial,
            accession: serial,
            barcode: serial,
            status: 'Available'
          });
        }
      }

      const firstAcc = finalCopiesDetail[0]?.accession || String(currentLatestSerial);
      const lastAcc = finalCopiesDetail[finalCopiesDetail.length - 1]?.accession || firstAcc;
      const baseAcc = item.accession || (finalCopiesDetail.length > 1 ? `${firstAcc} - ${lastAcc}` : firstAcc);
      const baseBarcode = item.barcode || firstAcc;

      try {
        const newBook = await Book.create({
          title,
          author,
          isbn: (item.isbn || item['ClassificationNumber'] || '').trim(),
          category,
          category_code: catCode,
          accession: baseAcc,
          barcode: baseBarcode,
          shelf: (item.shelf || item.almWsId || item['Alm WS.ID'] || item['Place Of Publication'] || 'Central Stack').trim() || 'Central Stack',
          total: finalCopiesDetail.length,
          available: item.available !== undefined ? parseInt(item.available, 10) : finalCopiesDetail.length,
          publisher: (item.publisher || item.publisherName || item['publisher Name'] || 'BPB Publication').trim() || 'BPB Publication',
          edition: (item.edition || item.year || item['Year Of Publication'] || 'Standard Edition').trim() || 'Standard Edition',
          copies_detail: finalCopiesDetail
        });

        createdBooks.push({
          id: newBook._id.toString(),
          _id: newBook._id.toString(),
          title: newBook.title,
          author: newBook.author,
          isbn: newBook.isbn,
          category: newBook.category,
          category_code: newBook.category_code,
          accession: newBook.accession,
          barcode: newBook.barcode,
          shelf: newBook.shelf,
          total: newBook.total,
          available: newBook.available,
          publisher: newBook.publisher,
          edition: newBook.edition,
          copies_detail: newBook.copies_detail
        });
      } catch (err) {
        console.error('Error bulk saving book:', err);
        errors.push({ title, error: err.message });
      }
    }

    logAudit({
      actor_id: req.user?.userId || 'STAFF',
      action_key: 'catalog.bulk_import',
      target_resource: 'BOOKS',
      payload: { 
        imported_count: createdBooks.length, 
        error_count: errors.length,
        titles: createdBooks.map(b => b.title)
      }
    });

    res.status(201).json({
      message: `Successfully imported ${createdBooks.length} books into the catalog`,
      imported_count: createdBooks.length,
      books: createdBooks,
      errors
    });
  } catch (err) {
    console.error('Error in bulkCreateBooks:', err);
    res.status(500).json({ error: 'Failed to bulk import books: ' + err.message });
  }
}

async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const updated = await Book.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully', book: updated });
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
}

async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Book.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
}

const BASELINE_CATEGORIES = [
  { name: 'Computer Science & Engineering', code: 'CSE', description: 'Computing systems, algorithms, architectures & software' },
  { name: 'Mechanical Engineering', code: 'MECH', description: 'Thermal, dynamics, robotics and mechanics' },
  { name: 'Electronics & Communication', code: 'ECE', description: 'Signals, VLSI design, communications and circuits' },
  { name: 'Artificial Intelligence & Data Science', code: 'AIDS', description: 'Machine learning, neural networks & statistical modeling' },
  { name: 'Management & Business Studies', code: 'MGMT', description: 'Administration, finance, human resource & marketing' },
  { name: 'General Reference', code: 'GEN', description: 'Handbooks, dictionaries, general science & encyclopedias' }
];

let categoriesSeeded = false;
async function ensureSeedCategories() {
  if (categoriesSeeded) return;
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      for (const cat of BASELINE_CATEGORIES) {
        await Category.create(cat);
      }
      console.log('📚 Seeded baseline academic categories in database');
    }
    categoriesSeeded = true;
  } catch (err) {
    console.error('Error ensuring categories in DB:', err.message);
  }
}

async function getCategories(req, res) {
  try {
    await ensureSeedCategories();
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({ total: categories.length, categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

async function createCategory(req, res) {
  try {
    const { name, code, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cleanName = name.trim();
    const cleanCode = (code || cleanName.slice(0, 3)).trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN';

    const existing = await Category.findOne({ name: cleanName });
    if (existing) {
      return res.status(409).json({ error: `Category "${cleanName}" already exists` });
    }

    const cat = await Category.create({
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : ''
    });

    res.status(201).json({ message: 'Category created successfully', category: cat });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category: ' + err.message });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body || {};
    const updated = await Category.findByIdAndUpdate(
      id,
      {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {})
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category updated successfully', category: updated });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category: ' + err.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

module.exports = {
  getBooks,
  getBookById,
  createBook,
  bulkCreateBooks,
  updateBook,
  deleteBook,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ensureSeedCategories,
  getLatestSerialEndpoint
};
