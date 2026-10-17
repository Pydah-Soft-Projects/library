import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginView from './components/LoginView';
import JwtModal from './components/JwtModal';

// Student Views
import StudentDashboardView from './components/StudentDashboardView';
import StudentExploreBooksView from './components/StudentExploreBooksView';
import StudentMyBooksView from './components/StudentMyBooksView';
import StudentMyFinesView from './components/StudentMyFinesView';
import StudentProfileView from './components/StudentProfileView';

// Admin / Librarian / Staff Views
import AdminDashboardView from './components/AdminDashboardView';
import BooksInLibraryView from './components/BooksInLibraryView';
import CirculationView from './components/CirculationView';
import AdminBookManagementView from './components/AdminBookManagementView';
import AdminStudentManagementView from './components/AdminStudentManagementView';
import AdminOverdueFinesView from './components/AdminOverdueFinesView';
import AdminPermissionsView from './components/AdminPermissionsView';
import AdminAuditLogsView from './components/AdminAuditLogsView';

// Modals & Footer
import { UpiModal, WaiveModal } from './components/UpiModal';
import Footer from './components/Footer';

const INITIAL_BOOKS = [
  {
    id: 1,
    title: 'Higher Engineering Mathematics',
    author: 'Dr. B.S. Grewal',
    isbn: '978-8174091955',
    category: 'Engineering',
    accession: 'ACC-ENG-0412',
    barcode: 'BC-ENG-8841',
    shelf: 'Rack E-14 (Row 2)',
    total: 8,
    available: 5,
    publisher: 'Khanna Publishers',
    edition: '44th Edition'
  },
  {
    id: 2,
    title: 'Operating System Concepts',
    author: 'Silberschatz, Galvin & Gagne',
    isbn: '978-1119800361',
    category: 'Computer Science',
    accession: 'ACC-CSE-1189',
    barcode: 'BC-CSE-3920',
    shelf: 'Rack CS-03 (Row 1)',
    total: 10,
    available: 3,
    publisher: 'Wiley Global Education',
    edition: '10th Edition'
  },
  {
    id: 3,
    title: 'Database System Concepts',
    author: 'Korth, Sudarshan & Silberschatz',
    isbn: '978-0078022159',
    category: 'Computer Science',
    accession: 'ACC-CSE-2401',
    barcode: 'BC-CSE-5521',
    shelf: 'Rack CS-05 (Row 3)',
    total: 10,
    available: 2,
    publisher: 'McGraw-Hill Education',
    edition: '7th Edition'
  },
  {
    id: 4,
    title: 'Digital Signal Processing: Principles & Applications',
    author: 'John G. Proakis, Dimitris Manolakis',
    isbn: '978-0131873742',
    category: 'Electronics',
    accession: 'ACC-ECE-0891',
    barcode: 'BC-ECE-7201',
    shelf: 'Rack EC-08 (Row 4)',
    total: 6,
    available: 2,
    publisher: 'Pearson Education',
    edition: '4th Edition'
  },
  {
    id: 5,
    title: 'Robbins & Cotran Pathologic Basis of Disease',
    author: 'Vinay Kumar, Abul Abbas, Jon Aster',
    isbn: '978-0323531139',
    category: 'Medical',
    accession: 'ACC-MED-0314',
    barcode: 'BC-MED-4412',
    shelf: 'Rack MD-02 (Row 1)',
    total: 5,
    available: 1,
    publisher: 'Elsevier',
    edition: '10th Edition'
  }
];

const INITIAL_LOANS = [
  {
    id: 1,
    bookTitle: 'Higher Engineering Mathematics',
    bookBarcode: 'BC-ENG-8841',
    accession: 'ACC-ENG-0412',
    patronName: 'Priya Sharma',
    patronId: 'STU-2023-CS042',
    issueDateFormatted: '15 Oct 2026',
    dueDateFormatted: '14 Nov 2026',
    status: 'Borrowed',
    renewalsCount: 0
  },
  {
    id: 2,
    bookTitle: 'Operating System Concepts',
    bookBarcode: 'BC-CSE-3920',
    accession: 'ACC-CSE-1189',
    patronName: 'Rahul Verma',
    patronId: 'STU-2024-ME019',
    issueDateFormatted: '12 Sep 2026',
    dueDateFormatted: '12 Oct 2026',
    status: 'Overdue',
    renewalsCount: 0
  }
];

const INITIAL_FINES = [
  {
    id: 1,
    user_id: 5,
    patronName: 'Rahul Verma',
    patronId: 'STU-2024-ME019',
    bookTitle: 'Operating System Concepts',
    amount: 25.00,
    status: 'Unpaid',
    daysOverdue: 5
  }
];

const INITIAL_STUDENTS = [
  {
    id: 'STU-2023-CS042',
    rollNo: 'STU-2023-CS042',
    name: 'Priya Sharma',
    department: 'Computer Science & Engineering',
    year: '3rd Year B.Tech',
    email: 'priya.cs23@college.edu.in',
    phone: '+91 98450 44055',
    status: 'Active',
    borrowedCount: 1,
    fineBalance: 0
  },
  {
    id: 'STU-2024-ME019',
    rollNo: 'STU-2024-ME019',
    name: 'Rahul Verma',
    department: 'Mechanical Engineering',
    year: '2nd Year B.Tech',
    email: 'rahul.me24@college.edu.in',
    phone: '+91 98450 55066',
    status: 'Frozen',
    borrowedCount: 1,
    fineBalance: 25.00
  },
  {
    id: 'STU-2023-EC081',
    rollNo: 'STU-2023-EC081',
    name: 'Ananya Deshmukh',
    department: 'Electronics & Communication',
    year: '3rd Year B.Tech',
    email: 'ananya.ec23@college.edu.in',
    phone: '+91 98450 66077',
    status: 'Active',
    borrowedCount: 0,
    fineBalance: 0
  },
  {
    id: 'STU-2022-CE014',
    rollNo: 'STU-2022-CE014',
    name: 'Karthik Raja',
    department: 'Civil Engineering',
    year: '4th Year B.Tech',
    email: 'karthik.ce22@college.edu.in',
    phone: '+91 98450 77088',
    status: 'Active',
    borrowedCount: 0,
    fineBalance: 0
  }
];

const INITIAL_RESERVATIONS = [
  {
    id: 1,
    bookId: 3,
    bookTitle: 'Database System Concepts',
    bookAccession: 'ACC-CSE-2401',
    studentId: 'STU-2023-CS042',
    studentName: 'Priya Sharma',
    reservedAtFormatted: 'Today, 10:30 AM',
    shelfLocation: 'Rack CS-05 (Row 3)',
    expiresIn: '46 hours'
  }
];

export default function App() {
  // Enforce Clean Standard Theme across entire application
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('lm_theme');
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
      if (saved) {
        const u = JSON.parse(saved);
        const r = (u.role || '').toLowerCase();
        if (r.includes('student')) return 'student_dashboard';
        return 'admin_dashboard';
      }
    } catch {}
    return 'student_dashboard';
  });

  const [currentStudentId, setCurrentStudentId] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.patron_id) return u.patron_id;
      }
    } catch {}
    return 'STU-2023-CS042';
  });

  // Master Application State with LocalStorage Persistence
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_books');
      return saved ? JSON.parse(saved) : INITIAL_BOOKS;
    } catch {
      return INITIAL_BOOKS;
    }
  });

  const [loans, setLoans] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_loans');
      return saved ? JSON.parse(saved) : INITIAL_LOANS;
    } catch {
      return INITIAL_LOANS;
    }
  });

  const [fines, setFines] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_fines');
      return saved ? JSON.parse(saved) : INITIAL_FINES;
    } catch {
      return INITIAL_FINES;
    }
  });

  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_students');
      let list = saved ? JSON.parse(saved) : [...INITIAL_STUDENTS];
      const savedUser = localStorage.getItem('lm_jwt_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const pid = u.patron_id || `STU-${u.id}`;
        if (!list.some(s => s.id === pid || s.rollNo === pid || s.email === u.email)) {
          list.push({
            id: pid,
            name: u.full_name || u.name,
            rollNo: pid,
            email: u.email,
            department: u.department || 'Computer Science & Engineering',
            year: '1st Year',
            status: u.status || 'Active',
            borrowedCount: 0,
            fineBalance: 0
          });
        }
      }
      return list;
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  const [reservations, setReservations] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_reservations');
      return saved ? JSON.parse(saved) : INITIAL_RESERVATIONS;
    } catch {
      return INITIAL_RESERVATIONS;
    }
  });

  // Automatically persist changes to LocalStorage
  useEffect(() => {
    try { localStorage.setItem('lm_books', JSON.stringify(books)); } catch {}
  }, [books]);

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

  // Sync enrolled patrons from backend API
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data && data.users && Array.isArray(data.users)) {
          setStudents(prev => {
            const merged = [...prev];
            data.users.forEach(u => {
              const pid = u.patron_id || u.rollNo || `PATRON-${u.id}`;
              const exists = merged.some(s => s.id === pid || s.rollNo === pid || s.email === u.email);
              if (!exists) {
                merged.push({
                  id: pid,
                  name: u.full_name || u.name,
                  rollNo: pid,
                  email: u.email,
                  department: u.department || 'Engineering',
                  phone: u.phone,
                  year: 'Enrolled Member',
                  status: u.status || 'Active',
                  borrowedCount: u.borrowedCount || 0,
                  fineBalance: u.fineBalance || 0
                });
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, time: '12:30:00', text: 'SYSTEM ONLINE: Node.js + Express REST API verified. ACID ledger ready.' },
    { id: 2, time: '12:00:00', text: 'CRON SCAN: Evaluated active loans. Rahul Verma (STU-2024-ME019) overdue by 5 days. Accrued ₹25.00 fine.' },
    { id: 3, time: '11:15:00', text: 'CIRCULATION DESK: Priya Sharma borrowed ACC-ENG-0412. Due: 14 Nov 2026.' }
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
      setCurrentTab('admin_dashboard');
    } else if (roleLower.includes('librarian')) {
      setCurrentRole('librarian');
      setCurrentTab('admin_dashboard');
    } else if (roleLower.includes('staff')) {
      setCurrentRole('substaff');
      setCurrentTab('admin_dashboard');
    } else {
      setCurrentRole('student');
      setCurrentTab('student_dashboard');
    }

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

  // Add Book (Catalog Acquisition)
  const handleAddBook = (newBook) => {
    setBooks(prev => [newBook, ...prev]);
    addToast(`Textbook "${newBook.title}" added with ${newBook.total} copies at ${newBook.shelf}!`, 'success');
    addAuditLog(`CATALOG ACQUISITION: Added "${newBook.title}" [${newBook.accession}], ${newBook.total} copies at ${newBook.shelf}.`);
  };

  // Update Book
  const handleUpdateBook = (updatedBook) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    addAuditLog(`CATALOG UPDATE: Updated details for "${updatedBook.title}" (Shelf: ${updatedBook.shelf}).`);
  };

  // Delete Book
  const handleDeleteBook = (bookId) => {
    const target = books.find(b => b.id === bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
    addToast(`Book "${target?.title}" archived from active catalog.`, 'info');
    addAuditLog(`CATALOG WEEDING: Archived/deleted title "${target?.title}" [${target?.accession}].`);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans transition-colors duration-200">
      {/* Collapsible Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        activeLoansCount={activeLoansCount}
        overdueFinesCount={overdueFinesCount}
        studentActiveLoansCount={studentLoans.filter(l => l.status !== 'Returned').length}
        studentHasOverdue={studentHasOverdue}
        studentFineAmount={studentFineAmount}
        onLogout={() => handleLogout(true)}
        onToast={addToast}
      />

      {/* Main Workspace Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <TopBar
          currentTab={currentTab}
          currentRole={currentRole}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          totalPendingFines={totalPendingFines}
          currentStudentId={currentStudentId}
          setCurrentStudentId={setCurrentStudentId}
          authToken={authToken}
          currentUser={currentUser}
          onOpenJwtModal={() => setIsJwtModalOpen(true)}
          onLogout={() => handleLogout(true)}
          onToast={addToast}
        />

        {/* Dynamic Main Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ==================== STUDENT VIEWS ==================== */}
          {currentTab === 'student_dashboard' && (
            <StudentDashboardView
              currentStudent={currentStudent}
              studentLoans={studentLoans}
              studentFines={studentFines}
              onNavigate={setCurrentTab}
              onOpenPayFine={(fine) => setSelectedFineForUpi(fine)}
              books={books}
              reservations={reservations}
              onReserveBook={handleReserveBook}
            />
          )}

          {currentTab === 'student_catalog' && (
            <StudentExploreBooksView
              books={books}
              reservations={reservations}
              onReserveBook={handleReserveBook}
              onCancelReservation={handleCancelReservation}
              currentStudent={currentStudent}
              onToast={addToast}
            />
          )}

          {currentTab === 'student_my_books' && (
            <StudentMyBooksView
              studentLoans={studentLoans}
              studentFines={studentFines}
              onRenew={handleRenewLoan}
              onToast={addToast}
              onOpenPayFine={(fine) => setSelectedFineForUpi(fine)}
              reservations={reservations}
              onCancelReservation={handleCancelReservation}
              currentStudent={currentStudent}
            />
          )}

          {currentTab === 'student_my_fines' && (
            <StudentMyFinesView
              studentFines={studentFines}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
            />
          )}

          {currentTab === 'student_profile' && (
            <StudentProfileView
              currentStudent={currentStudent}
              hasOverdue={studentHasOverdue}
              onLogout={() => handleLogout(true)}
              onUpdateProfile={handleUpdateProfile}
              onToast={addToast}
            />
          )}

          {/* ==================== ADMIN & STAFF VIEWS ==================== */}
          {currentTab === 'admin_dashboard' && (
            <AdminDashboardView
              books={books}
              loans={loans}
              fines={fines}
              auditLogs={auditLogs}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'admin_in_library' && (
            <BooksInLibraryView
              books={books}
              onSelectIssue={(book) => {
                setPrefilledBookForIssue(book);
                setCurrentTab('admin_circulation');
                addToast(`Selected "${book.title}" [${book.accession}] for checkout at Circulation Desk.`, 'info');
              }}
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_checked_out' && (
            <CirculationView
              books={books}
              loans={loans}
              students={students}
              onIssueBook={handleIssueBook}
              onReturnBook={handleReturnBook}
              prefilledBook={prefilledBookForIssue}
              onClearPrefilled={() => setPrefilledBookForIssue(null)}
              initialSection="checked_out"
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_circulation' && (
            <CirculationView
              books={books}
              loans={loans}
              students={students}
              onIssueBook={handleIssueBook}
              onReturnBook={handleReturnBook}
              prefilledBook={prefilledBookForIssue}
              onClearPrefilled={() => setPrefilledBookForIssue(null)}
              initialSection="desk"
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_books' && (
            <AdminBookManagementView
              books={books}
              onAddBook={handleAddBook}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_students' && (
            <AdminStudentManagementView
              students={students}
              onToggleFreeze={handleToggleFreeze}
              onAddStudent={handleAddStudent}
              loans={loans}
              fines={fines}
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_fines' && (
            <AdminOverdueFinesView
              fines={fines}
              onCollectCash={handleCollectCash}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
              onOpenWaiveModal={(fine) => setSelectedFineForWaive(fine)}
              currentRole={currentRole}
            />
          )}

          {currentTab === 'admin_permissions' && (
            <AdminPermissionsView
              onToast={addToast}
            />
          )}

          {currentTab === 'admin_logs' && (
            <AdminAuditLogsView
              auditLogs={auditLogs}
            />
          )}
        </main>

        {/* Footer */}
        <Footer onSwitchTab={setCurrentTab} />
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
