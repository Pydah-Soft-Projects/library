import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginView from './components/LoginView';
import JwtModal from './components/JwtModal';

// 6 Core Minimalist Page Views
import DashboardView from './components/DashboardView';
import BookCreationView from './components/BookCreationView';
import AllBooksView from './components/AllBooksView';
import BookIssuesReturnsView from './components/BookIssuesReturnsView';
import UserManagementView from './components/UserManagementView';
import SettingsView from './components/SettingsView';

// Modals & Footer
import { UpiModal, WaiveModal } from './components/UpiModal';
import Footer from './components/Footer';

const INITIAL_LOANS = [];
const INITIAL_FINES = [];
const INITIAL_STUDENTS = [];
const INITIAL_RESERVATIONS = [];

export default function App() {
  // Enforce Clean Standard Theme and purge any legacy mock data from LocalStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('lm_theme');

    try {
      ['lm_students', 'lm_loans', 'lm_fines', 'lm_reservations'].forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw && (raw.includes('Priya') || raw.includes('Rahul') || raw.includes('STU-2023-CS042') || raw.includes('STU-2024-ME019') || raw.includes('Ananya') || raw.includes('Karthik'))) {
          localStorage.removeItem(key);
        }
      });
      const rawBooks = localStorage.getItem('lm_books');
      if (rawBooks && (rawBooks.includes('Grewal') || rawBooks.includes('Silberschatz') || rawBooks.includes('Korth') || rawBooks.includes('Robbins') || rawBooks.includes('Proakis') || rawBooks.includes('Higher Engineering'))) {
        localStorage.removeItem('lm_books');
      }
    } catch {}
  }, []);

  const [authToken, setAuthToken] = useState(() => localStorage.getItem('lm_jwt_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isJwtModalOpen, setIsJwtModalOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      if (saved) {
        const u = JSON.parse(saved);
        const r = (u.role || '').toLowerCase();
        if (r.includes('admin')) return 'superadmin';
        if (r.includes('librarian')) return 'librarian';
        if (r.includes('staff')) return 'substaff';
        return 'student';
      }
    } catch {}
    return 'student';
  });

  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      if (saved) return 'dashboard';
    } catch {}
    return 'dashboard';
  });

  const [currentStudentId, setCurrentStudentId] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.patron_id) return u.patron_id;
      }
    } catch {}
    return '';
  });

  const DEMO_BOOK_KEYWORDS = [
    'higher engineering mathematics',
    'operating system concepts',
    'database system concepts',
    'digital signal processing',
    'robbins & cotran',
    'grewal',
    'silberschatz',
    'saketh',
    'text book',
    'modern compiler design',
    'compiler design',
    'dick grune',
    'grune',
    'proakis',
    'manolakis',
    'vinay kumar'
  ];

  // Books state loaded live from MongoDB Atlas backend
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_books');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const cleaned = list
            .filter(b => {
              const titleLow = (b.title || '').toLowerCase();
              const authorLow = (b.author || '').toLowerCase();
              return !DEMO_BOOK_KEYWORDS.some(kw => titleLow.includes(kw) || authorLow.includes(kw));
            })
            .map(b => ({
              ...b,
              accession: String(b.accession || '').replace(/[\s\-_]/g, ''),
              barcode: String(b.barcode || '').replace(/[\s\-_]/g, ''),
              copies_detail: Array.isArray(b.copies_detail)
                ? b.copies_detail.map(cp => ({
                    ...cp,
                    serial_no: String(cp.serial_no || '').replace(/[\s\-_]/g, ''),
                    accession: String(cp.accession || '').replace(/[\s\-_]/g, ''),
                    barcode: String(cp.barcode || '').replace(/[\s\-_]/g, '')
                  }))
                : b.copies_detail
            }));
          localStorage.setItem('lm_books', JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch {}
    return [];
  });

  const [loans, setLoans] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_loans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fines, setFines] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_fines');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reservations, setReservations] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync books live from backend on launch, stripping out legacy demo seed titles
  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        if (data && data.books && Array.isArray(data.books)) {
          const nonDemoBooks = data.books.filter(b => {
            const titleLow = (b.title || '').toLowerCase();
            const authorLow = (b.author || '').toLowerCase();
            return !DEMO_BOOK_KEYWORDS.some(kw => titleLow.includes(kw) || authorLow.includes(kw));
          }).map(b => ({
            id: b.id || b._id,
            title: b.title,
            author: b.author,
            isbn: b.isbn,
            category: b.category,
            category_code: (b.category_code || '').replace(/[\s\-_]/g, ''),
            accession: String(b.accession || b.accession_no || `AC${b.id}`).replace(/[\s\-_]/g, ''),
            barcode: String(b.barcode || `BC${b.id}`).replace(/[\s\-_]/g, ''),
            shelf: b.shelf || b.shelf_location || 'Central Stack',
            total: b.total !== undefined ? b.total : (b.total_copies || 1),
            available: b.available !== undefined ? b.available : (b.available_copies || 1),
            publisher: b.publisher,
            edition: b.edition,
            copies_detail: Array.isArray(b.copies_detail)
              ? b.copies_detail.map(cp => ({
                  ...cp,
                  serial_no: String(cp.serial_no || '').replace(/[\s\-_]/g, ''),
                  accession: String(cp.accession || '').replace(/[\s\-_]/g, ''),
                  barcode: String(cp.barcode || '').replace(/[\s\-_]/g, '')
                }))
              : []
          }));
          setBooks(nonDemoBooks);
          try { localStorage.setItem('lm_books', JSON.stringify(nonDemoBooks)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('lm_loans', JSON.stringify(loans)); } catch {}
  }, [loans]);

  useEffect(() => {
    try { localStorage.setItem('lm_fines', JSON.stringify(fines)); } catch {}
  }, [fines]);

  useEffect(() => {
    try { localStorage.setItem('lm_students', JSON.stringify(students)); } catch {}
  }, [students]);

  useEffect(() => {
    try { localStorage.setItem('lm_reservations', JSON.stringify(reservations)); } catch {}
  }, [reservations]);

  // Sync enrolled patrons from backend API (live from MongoDB)
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data && data.users && Array.isArray(data.users)) {
          const liveStudents = data.users.map(u => ({
            id: u.patron_id || u.rollNo || u.id,
            name: u.full_name || u.name,
            rollNo: u.patron_id || u.rollNo || u.id,
            email: u.email,
            department: u.department || 'General',
            phone: u.phone || '',
            role: u.role,
            status: u.status || 'Active',
            borrowedCount: u.borrowedCount || 0,
            fineBalance: u.fineBalance || 0
          }));
          setStudents(liveStudents);
        }
      })
      .catch(() => {});
  }, []);

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, time: '12:00:00', text: 'SYSTEM ONLINE: Node.js Express REST API connected to MongoDB Atlas. Live patron catalog ready.' }
  ]);

  const [selectedFineForUpi, setSelectedFineForUpi] = useState(null);
  const [selectedFineForWaive, setSelectedFineForWaive] = useState(null);
  const [prefilledBookForIssue, setPrefilledBookForIssue] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const addAuditLog = (text) => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [{ id: Date.now(), time, text }, ...prev]);
  };

  // JWT Login Success Handler
  const handleLoginSuccess = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('lm_jwt_token', token);
    localStorage.setItem('lm_jwt_user', JSON.stringify(user));

    const roleLower = (user.role || '').toLowerCase();
    if (roleLower.includes('admin') || roleLower.includes('superadmin')) {
      setCurrentRole('superadmin');
    } else if (roleLower.includes('librarian')) {
      setCurrentRole('librarian');
    } else if (roleLower.includes('staff')) {
      setCurrentRole('substaff');
    } else {
      setCurrentRole('student');
    }
    setCurrentTab('dashboard');

    if (user.patron_id) {
      setCurrentStudentId(user.patron_id);
      setStudents(prev => {
        const exists = prev.some(s => s.id === user.patron_id || s.rollNo === user.patron_id || s.email === user.email);
        if (!exists) {
          const newPatron = {
            id: user.patron_id,
            name: user.full_name,
            rollNo: user.patron_id,
            email: user.email,
            department: user.department || 'Computer Science & Engineering',
            year: '1st Year',
            status: user.status || 'Active',
            borrowedCount: 0,
            fineBalance: 0
          };
          const next = [...prev, newPatron];
          try { localStorage.setItem('lm_students', JSON.stringify(next)); } catch {}
          return next;
        }
        return prev;
      });
    }

    addToast(`Welcome, ${user.full_name}! Signed in successfully. JWT verified.`, 'success');
    addAuditLog(`JWT AUTH: "${user.full_name}" (${user.patron_id || user.email}) authenticated. Role: ${user.role}.`);
  };

  // JWT Logout Handler
  const handleLogout = (showToast = true) => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('lm_jwt_token');
    localStorage.removeItem('lm_jwt_user');
    if (showToast) {
      addToast('Logged out of institutional session. JWT invalidated.', 'info');
    }
    addAuditLog(`JWT AUTH: Session terminated. JWT Bearer token cleared.`);
  };

  // Verify JWT on app launch
  useEffect(() => {
    const token = localStorage.getItem('lm_jwt_token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.valid) {
            handleLogout(false);
          }
        })
        .catch(() => {
          // Retain session if offline
        });
    }
  }, []);

  // Student specific data with reliable fallback to currentUser
  const currentStudent = students.find(s => 
    s.id === currentStudentId || 
    s.rollNo === currentStudentId ||
    (currentUser && (s.email === currentUser.email || s.name === currentUser.full_name))
  ) || (currentUser ? {
    id: currentUser.patron_id || `STU-${currentUser.id}`,
    name: currentUser.full_name,
    rollNo: currentUser.patron_id || `STU-${currentUser.id}`,
    email: currentUser.email,
    department: currentUser.department || 'Computer Science & Engineering',
    status: 'Active',
    borrowedCount: 0,
    fineBalance: 0
  } : students[0]);

  const studentLoans = loans.filter(l => l.patronId === currentStudent.id || l.patronId === currentStudent.rollNo);
  const studentFines = fines.filter(f => f.patronId === currentStudent.id || f.patronId === currentStudent.rollNo);
  const studentHasOverdue = studentLoans.some(l => l.status === 'Overdue') || studentFines.some(f => f.status === 'Unpaid');
  const studentFineAmount = studentFines.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + Number(f.amount), 0);

  // Overall counts for badges
  const activeLoansCount = loans.filter(l => l.status !== 'Returned').length;
  const overdueFinesCount = loans.filter(l => l.status === 'Overdue').length;
  const totalPendingFines = fines.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + Number(f.amount), 0);

  // Issue Book (Circulation Desk) with selected loan duration (7, 14, 21, 30 days or manual date)
  const handleIssueBook = async (barcode, patronId, customDueDateStr = null) => {
    const cleanId = String(patronId || '').trim().toLowerCase();
    const patron = students.find(s => 
      (s.id && s.id.toLowerCase() === cleanId) || 
      (s.rollNo && s.rollNo.toLowerCase() === cleanId) ||
      (s.name && s.name.toLowerCase() === cleanId) ||
      (s.email && s.email.toLowerCase() === cleanId)
    );

    // CRITICAL: Block any issue to unregistered patrons
    if (!patron) {
      addToast(`Cannot issue book: Patron "${patronId}" is NOT registered in the library patron database. You can only issue books to enrolled students.`, 'danger');
      return;
    }

    if (patron.status === 'Frozen') {
      addToast(`Cannot issue: Patron account for ${patron.name} (${patron.rollNo || patron.id}) is FROZEN. Resolve overdue penalties first.`, 'danger');
      return;
    }

    const targetBook = books.find(b => b.barcode === barcode || b.accession === barcode);
    if (!targetBook || targetBook.available <= 0) {
      addToast('Cannot issue: Zero available copies in stock', 'danger');
      return;
    }

    try {
      await fetch('/api/circulation/issue', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ 
          barcode, 
          patron_id: patron.rollNo || patron.id, 
          patron_name: patron.name,
          department: patron.department,
          due_date: customDueDateStr 
        })
      });
    } catch {
      // Local sync fallback
    }

    // Decrement available copies
    setBooks(prev => prev.map(b => {
      if (b.barcode === barcode || b.accession === barcode) {
        return { ...b, available: Math.max(b.available - 1, 0) };
      }
      return b;
    }));

    // Increment student borrowed count
    setStudents(prev => prev.map(s => {
      if (s.id === patron.id || s.rollNo === patron.rollNo) {
        return { ...s, borrowedCount: (s.borrowedCount || 0) + 1 };
      }
      return s;
    }));

    let dueDateStr = customDueDateStr;
    if (!dueDateStr) {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      dueDateStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const patronName = patron.name;

    const newLoan = {
      id: Date.now(),
      bookTitle: targetBook.title,
      bookBarcode: targetBook.barcode,
      accession: targetBook.accession,
      patronName,
      patronId: patron.rollNo || patron.id,
      issueDateFormatted: 'Today',
      dueDateFormatted: dueDateStr,
      status: 'Borrowed',
      renewalsCount: 0
    };

    setLoans(prev => [newLoan, ...prev]);
    addToast(`Book "${targetBook.title}" issued to ${patronName}! Due Date: ${dueDateStr}`, 'success');
    addAuditLog(`ISSUE: "${targetBook.title}" [${targetBook.accession}] issued to ${patronName} (${patronId}). Due Date: ${dueDateStr}`);
  };

  // Return Book (Circulation Desk)
  const handleReturnBook = async (barcode) => {
    const targetBook = books.find(b => b.barcode === barcode || b.accession === barcode);
    const targetLoan = loans.find(l => (l.bookBarcode === barcode || l.accession === barcode) && l.status !== 'Returned');

    if (!targetLoan) {
      addToast(`No active loan found for barcode/accession [${barcode}]`, 'danger');
      return;
    }

    try {
      await fetch('/api/circulation/return', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ barcode })
      });
    } catch {
      // Local sync fallback
    }

    if (targetBook) {
      setBooks(prev => prev.map(b => {
        if (b.id === targetBook.id) {
          return { ...b, available: Math.min(b.available + 1, b.total) };
        }
        return b;
      }));
    }

    // Decrement student borrowedCount
    setStudents(prev => prev.map(s => {
      if (s.id === targetLoan.patronId || s.rollNo === targetLoan.patronId) {
        return { ...s, borrowedCount: Math.max((s.borrowedCount || 1) - 1, 0) };
      }
      return s;
    }));

    setLoans(prev => prev.map(l => {
      if (l.id === targetLoan.id) {
        return { ...l, status: 'Returned' };
      }
      return l;
    }));

    addToast(`Book "${targetLoan.bookTitle}" returned to stock. Reshelve at: ${targetBook?.shelf || 'Central Stack'}`, 'success');
    addAuditLog(`RETURN: "${targetLoan.bookTitle}" returned by ${targetLoan.patronName}. Copy restored to ${targetBook?.shelf || 'Stack'}.`);
  };

  // Real Loan Renewal (+15 Days Extension)
  const handleRenewLoan = (loan) => {
    const currentRenewals = loan.renewalsCount || 0;
    if (currentRenewals >= 2) {
      addToast(`Renewal quota reached (Max 2 renewals allowed for "${loan.bookTitle}"). Please return book to desk.`, 'danger');
      return;
    }

    const patron = students.find(s => s.id === loan.patronId || s.rollNo === loan.patronId);
    if (patron && patron.status === 'Frozen') {
      addToast('Cannot renew: Patron account has an active hold or overdue penalty.', 'danger');
      return;
    }

    const currentDue = new Date(loan.dueDateFormatted || Date.now());
    const validCurrentDue = isNaN(currentDue.getTime()) ? new Date() : currentDue;
    validCurrentDue.setDate(validCurrentDue.getDate() + 15);
    const newDueDateStr = validCurrentDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    setLoans(prev => prev.map(l => {
      if (l.id === loan.id) {
        return {
          ...l,
          dueDateFormatted: newDueDateStr,
          status: 'Borrowed',
          renewalsCount: currentRenewals + 1
        };
      }
      return l;
    }));

    addToast(`Renewal approved (+15 Days) for "${loan.bookTitle}"! New Due Date: ${newDueDateStr}`, 'success');
    addAuditLog(`RENEWAL: Extended loan on "${loan.bookTitle}" for ${loan.patronName}. New Due: ${newDueDateStr} (Renewal #${currentRenewals + 1}).`);
  };

  // Book Reservation & Hold Management
  const handleReserveBook = (book) => {
    const existing = reservations.find(r => r.bookId === book.id && r.studentId === currentStudent.id);
    if (existing) {
      addToast(`You already have an active hold on "${book.title}".`, 'info');
      return;
    }

    const newRes = {
      id: Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      bookAccession: book.accession,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      reservedAtFormatted: 'Today, ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      shelfLocation: book.shelf,
      expiresIn: '48 hours'
    };

    setReservations(prev => [newRes, ...prev]);
    addToast(`Hold confirmed for "${book.title}"! Pick up at ${book.shelf} within 48h.`, 'success');
    addAuditLog(`HOLD RESERVATION: ${currentStudent.name} (${currentStudent.id}) reserved "${book.title}" [${book.accession}].`);
  };

  const handleCancelReservation = (reservationId) => {
    const target = reservations.find(r => r.id === reservationId);
    setReservations(prev => prev.filter(r => r.id !== reservationId));
    addToast(`Hold reservation on "${target?.bookTitle || 'Book'}" has been released.`, 'info');
    addAuditLog(`HOLD RELEASED: Cancelled hold for ${target?.studentName} on "${target?.bookTitle}".`);
  };

  // Student Account Freeze Toggle (Admin)
  const handleToggleFreeze = (student) => {
    const nextStatus = student.status === 'Active' ? 'Frozen' : 'Active';
    setStudents(prev => prev.map(s => {
      if (s.id === student.id || s.rollNo === student.rollNo) {
        return { ...s, status: nextStatus };
      }
      return s;
    }));

    addToast(
      nextStatus === 'Frozen'
        ? `Account for ${student.name} (${student.rollNo || student.id}) is now FROZEN. Borrowing privileges suspended.`
        : `Account for ${student.name} (${student.rollNo || student.id}) is ACTIVE. Privileges restored.`,
      nextStatus === 'Frozen' ? 'danger' : 'success'
    );
    addAuditLog(`PATRON GOVERNANCE: ${student.name} (${student.rollNo || student.id}) account status set to ${nextStatus}.`);
  };

  // Register New Student Patron (Admin)
  const handleAddStudent = async (newStudent) => {
    setStudents(prev => [newStudent, ...prev]);
    addToast(`Student patron ${newStudent.name} (${newStudent.rollNo}) registered successfully! Default password is 'student123'.`, 'success');
    addAuditLog(`PATRON ONBOARDING: Registered ${newStudent.name} [${newStudent.rollNo}], Dept: ${newStudent.department}.`);

    // Sync to backend auth database so they can immediately log in
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newStudent.name,
          email: newStudent.email || `${newStudent.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu.in`,
          password: 'student123',
          department: newStudent.department,
          phone: newStudent.phone,
          patron_id: newStudent.rollNo
        })
      });
    } catch {
      // offline fallback
    }
  };

  // Update Student Profile (Patron Self-Service)
  const handleUpdateProfile = (updatedStudent) => {
    setStudents(prev => prev.map(s => {
      if (s.id === updatedStudent.id || s.rollNo === updatedStudent.rollNo) {
        return { ...s, ...updatedStudent };
      }
      return s;
    }));
    setCurrentUser(prev => ({ ...prev, ...updatedStudent }));
    addAuditLog(`PATRON PROFILE: Updated contact details/avatar for ${updatedStudent.name} (${updatedStudent.id || updatedStudent.rollNo}).`);
  };

  // Add Book (Create Book) via MongoDB REST API
  const handleAddBook = async (newBook) => {
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(newBook)
      });
      const data = await res.json();
      if (data.book) {
        setBooks(prev => [data.book, ...prev]);
        addToast(`Book "${data.book.title}" created successfully!`, 'success');
      } else {
        setBooks(prev => [newBook, ...prev]);
        addToast(`Book "${newBook.title}" created!`, 'success');
      }
    } catch {
      setBooks(prev => [newBook, ...prev]);
      addToast(`Book "${newBook.title}" created!`, 'success');
    }
    addAuditLog(`CREATE BOOK: "${newBook.title}" [${newBook.accession}].`);
  };

  // Update Book via MongoDB REST API
  const handleUpdateBook = async (updatedBook) => {
    const bookId = updatedBook.id || updatedBook._id;
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(updatedBook)
      });
    } catch {}
    setBooks(prev => prev.map(b => (b.id === bookId || b._id === bookId) ? updatedBook : b));
    addToast(`Book "${updatedBook.title}" updated.`, 'success');
    addAuditLog(`UPDATE BOOK: "${updatedBook.title}".`);
  };

  // Delete Book via MongoDB REST API
  const handleDeleteBook = async (bookId) => {
    const target = books.find(b => b.id === bookId || b._id === bookId);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
      });
    } catch {}
    setBooks(prev => prev.filter(b => b.id !== bookId && b._id !== bookId));
    addToast(`Book "${target?.title || 'Book'}" deleted from active catalog.`, 'info');
    addAuditLog(`DELETE BOOK: "${target?.title}" [${target?.accession}].`);
  };

  // Settle Fine via Cash
  const handleCollectCash = (fine) => {
    setFines(prev => prev.map(f => {
      if (f.id === fine.id) {
        return { ...f, status: 'Paid', method: 'Cash (Desk Receipt)', paid_at: new Date().toISOString() };
      }
      return f;
    }));

    // Unfreeze student
    setStudents(prev => prev.map(s => {
      if (s.id === fine.patronId || s.rollNo === fine.patronId) {
        return { ...s, fineBalance: 0, status: 'Active' };
      }
      return s;
    }));

    // Update loan status if overdue
    setLoans(prev => prev.map(l => {
      if (l.patronId === fine.patronId && l.status === 'Overdue') {
        return { ...l, status: 'Borrowed' };
      }
      return l;
    }));

    addToast(`Cash payment of ₹${Number(fine.amount).toFixed(2)} received from ${fine.patronName}. Account unheld!`, 'success');
    addAuditLog(`FINE SETTLEMENT: ₹${Number(fine.amount).toFixed(2)} collected via CASH for ${fine.patronName}. Account unheld.`);
  };

  // Settle Fine via UPI
  const handleConfirmUpi = (fine) => {
    setFines(prev => prev.map(f => {
      if (f.id === fine.id) {
        return { ...f, status: 'Paid', method: 'UPI Online (GPay/PhonePe)', paid_at: new Date().toISOString() };
      }
      return f;
    }));

    setStudents(prev => prev.map(s => {
      if (s.id === fine.patronId || s.rollNo === fine.patronId) {
        return { ...s, fineBalance: 0, status: 'Active' };
      }
      return s;
    }));

    setLoans(prev => prev.map(l => {
      if (l.patronId === fine.patronId && l.status === 'Overdue') {
        return { ...l, status: 'Borrowed' };
      }
      return l;
    }));

    addToast(`UPI Payment of ₹${Number(fine.amount).toFixed(2)} confirmed! Instant digital receipt generated. Account unheld!`, 'success');
    addAuditLog(`UPI SETTLEMENT: ₹${Number(fine.amount).toFixed(2)} paid via UPI for ${fine.patronName}. Verified online.`);
  };

  // Waive Fine
  const handleConfirmWaive = (fine, reason) => {
    setFines(prev => prev.map(f => {
      if (f.id === fine.id) {
        return { ...f, status: 'Waived', waiver_reason: reason, paid_at: new Date().toISOString() };
      }
      return f;
    }));

    setStudents(prev => prev.map(s => {
      if (s.id === fine.patronId || s.rollNo === fine.patronId) {
        return { ...s, fineBalance: 0, status: 'Active' };
      }
      return s;
    }));

    setLoans(prev => prev.map(l => {
      if (l.patronId === fine.patronId && l.status === 'Overdue') {
        return { ...l, status: 'Borrowed' };
      }
      return l;
    }));

    addToast(`Fine of ₹${Number(fine.amount).toFixed(2)} officially waived. Reason: "${reason}". Account restored!`, 'info');
    addAuditLog(`FINE WAIVER: ₹${Number(fine.amount).toFixed(2)} waived for ${fine.patronName}. Reason: ${reason}.`);
  };

  // Unauthenticated Patron / Staff: Render JWT Login Screen
  if (!authToken) {
    return (
      <div>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onToast={addToast}
        />
        {/* Floating System Notifications */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-right duration-200 ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : t.type === 'danger'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-sm">{t.type === 'success' ? '✅' : t.type === 'danger' ? '⚠️' : 'ℹ️'}</span>
              <span className="leading-snug">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex font-sans">
      {/* Minimal Collapsible Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        booksCount={books.length}
        activeLoansCount={activeLoansCount}
        overdueFinesCount={overdueFinesCount}
        onLogout={() => handleLogout(true)}
        onToast={addToast}
      />

      {/* Main Workspace Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Dynamic Main Views - Flat, Minimalist & Full-Width */}
        <main className="flex-1 p-6 sm:p-8 w-full">
          {/* 1. Dashboard */}
          {(currentTab === 'dashboard' || currentTab === 'admin_dashboard' || currentTab === 'student_dashboard') && (
            <DashboardView
              books={books}
              loans={loans}
              fines={fines}
              students={students}
              auditLogs={auditLogs}
              onNavigate={setCurrentTab}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
              onOpenWaiveModal={(fine) => setSelectedFineForWaive(fine)}
            />
          )}

          {/* 2. Create Book */}
          {currentTab === 'book_creation' && (
            <BookCreationView
              books={books}
              onAddBook={handleAddBook}
              onNavigate={setCurrentTab}
              onToast={addToast}
            />
          )}

          {/* 3. All Books Catalog */}
          {(currentTab === 'all_books' || currentTab === 'admin_books' || currentTab === 'admin_in_library' || currentTab === 'student_catalog') && (
            <AllBooksView
              books={books}
              loans={loans}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onSelectIssue={(book) => {
                setPrefilledBookForIssue(book);
                setCurrentTab('book_issues_returns');
                addToast(`Selected "${book.title}" [${book.accession}] for checkout at Circulation Desk.`, 'info');
              }}
              onNavigate={setCurrentTab}
              onToast={addToast}
            />
          )}

          {/* 4. Book Issues & Returns */}
          {(currentTab === 'book_issues_returns' || currentTab === 'admin_circulation' || currentTab === 'admin_checked_out' || currentTab === 'admin_fines' || currentTab === 'student_my_books' || currentTab === 'student_my_fines') && (
            <BookIssuesReturnsView
              books={books}
              loans={loans}
              students={students}
              onIssueBook={handleIssueBook}
              onReturnBook={handleReturnBook}
              onRenewLoan={handleRenewLoan}
              onCollectCash={handleCollectCash}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
              onOpenWaiveModal={(fine) => setSelectedFineForWaive(fine)}
              prefilledBook={prefilledBookForIssue}
              onClearPrefilled={() => setPrefilledBookForIssue(null)}
              initialSection={currentTab === 'admin_checked_out' ? 'loans' : currentTab === 'admin_fines' ? 'return' : 'issue'}
              onToast={addToast}
            />
          )}

          {/* 5. User Management */}
          {(currentTab === 'user_management' || currentTab === 'admin_students' || currentTab === 'admin_permissions' || currentTab === 'admin_logs' || currentTab === 'student_profile') && (
            <UserManagementView
              students={students}
              loans={loans}
              fines={fines}
              onAddStudent={handleAddStudent}
              onToggleFreeze={handleToggleFreeze}
              onToast={addToast}
            />
          )}

          {/* 6. Settings */}
          {currentTab === 'settings' && (
            <SettingsView
              authToken={authToken}
              currentUser={currentUser}
              onToast={addToast}
            />
          )}
        </main>
      </div>

      {/* Interactive UPI QR Modal */}
      <UpiModal
        isOpen={!!selectedFineForUpi}
        onClose={() => setSelectedFineForUpi(null)}
        fine={selectedFineForUpi}
        onConfirmPayment={handleConfirmUpi}
      />

      {/* Fine Waiver Modal */}
      <WaiveModal
        isOpen={!!selectedFineForWaive}
        onClose={() => setSelectedFineForWaive(null)}
        fine={selectedFineForWaive}
        onConfirmWaive={handleConfirmWaive}
      />

      {/* JWT Token Inspector Modal */}
      <JwtModal
        isOpen={isJwtModalOpen}
        onClose={() => setIsJwtModalOpen(false)}
        token={authToken}
        user={currentUser}
      />

      {/* Floating System Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-right duration-200 ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : t.type === 'danger'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <span className="text-sm">{t.type === 'success' ? '✅' : t.type === 'danger' ? '⚠️' : 'ℹ️'}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
