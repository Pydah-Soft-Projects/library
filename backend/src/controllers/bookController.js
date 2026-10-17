const db = require('../config/db');
const { logAudit } = require('../services/auditService');

function getBooks(req, res) {
  const { q, category, available_only } = req.query || {};
  let results = [...db.books];

  if (category && category !== 'All') {
    results = results.filter(b => b.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    const term = q.toLowerCase();
    results = results.filter(b => 
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.isbn.toLowerCase().includes(term) ||
      b.accession_no.toLowerCase().includes(term) ||
      b.barcode.toLowerCase().includes(term) ||
      b.shelf_location.toLowerCase().includes(term)
    );
  }

  if (available_only === 'true') {
    results = results.filter(b => b.available_copies > 0);
  }

  res.json({
    total: results.length,
    books: results
  });
}

function getBookById(req, res) {
  const id = parseInt(req.params.id, 10);
  const book = db.books.find(b => b.id === id);
  if (!book) {
    return res.status(404).json({ error: 'Book accession record not found' });
  }
  res.json({ book });
}

function createBook(req, res) {
  const { isbn, title, author, category, publisher, publication_year, shelf_location, total_copies } = req.body || {};

  if (!isbn || !title || !author) {
    return res.status(400).json({ error: 'ISBN, Title, and Author are mandatory' });
  }

  const copies = parseInt(total_copies, 10) || 1;
  const newBook = {
    id: db.books.length + 1,
    isbn,
    accession_no: `ACC-${category ? category.slice(0, 3).toUpperCase() : 'GEN'}-${Math.floor(1000 + Math.random() * 9000)}`,
    barcode: `BC-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    author,
    category: category || 'General',
    publisher: publisher || 'Institutional Acquisition',
    publication_year: publication_year || new Date().getFullYear(),
    shelf_location: shelf_location || 'Central Stack',
    total_copies: copies,
    available_copies: copies
  };

  db.books.push(newBook);

  logAudit({
    actor_id: 2, // Librarian
    action_key: 'catalog.create',
    target_resource: `BOOK:${newBook.id}`,
    payload: { title: newBook.title, accession: newBook.accession_no }
  });

  res.status(201).json({
    message: 'Book accessioned successfully',
    book: newBook
  });
}

module.exports = {
  getBooks,
  getBookById,
  createBook
};
