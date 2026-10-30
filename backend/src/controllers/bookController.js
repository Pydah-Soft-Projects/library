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
      available: b.available,
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
    const randBase = Math.floor(1000 + Math.random() * 9000);
    const finalAccession = accession || `ACC-${catCode}-${randBase}`;
    const finalBarcode = barcode || `BC-${catCode}-${randBase}`;

    // Auto-generate sequential copy IDs and serial numbers if not passed explicitly
    let finalCopiesDetail = [];
    if (Array.isArray(copies_detail) && copies_detail.length > 0) {
      finalCopiesDetail = copies_detail;
    } else {
      for (let i = 1; i <= copies; i++) {
        finalCopiesDetail.push({
          copy_number: i,
          serial_no: `SN-${catCode}-${randBase}-${String(i).padStart(2, '0')}`,
          accession: `${finalAccession}-C${i}`,
          barcode: `${finalBarcode}-${i}`,
          status: 'Available'
        });
      }
    }

    const newBook = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn ? isbn.trim() : '',
      category: category || 'General',
      category_code: catCode,
      accession: finalAccession,
      barcode: finalBarcode,
      shelf: shelf ? shelf.trim() : 'Central Stack',
      total: copies,
      available: available !== undefined ? parseInt(available, 10) : copies,
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
        copies: copies, 
        serial_numbers: finalCopiesDetail.map(c => c.serial_no) 
      }
    });

    res.status(201).json({
      message: `Book created with ${copies} sequential copies and serial numbers`,
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

async function getCategories(req, res) {
  try {
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
  updateBook,
  deleteBook,
  getCategories,
  createCategory,
  deleteCategory
};
