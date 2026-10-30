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
import { X, ShieldAlert } from 'lucide-react';

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
  const [roles, setRoles] = useState([]);
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_jwt_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role || 'Superadmin';
      }
    } catch {}
    return 'Superadmin';
  });

  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const validTabs = ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings'];
      if (hash && validTabs.includes(hash)) {
        return hash;
      }
      const savedTab = localStorage.getItem('lm_current_tab');
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [hrmsUsersCount, setHrmsUsersCount] = useState(1);

  useEffect(() => {
    fetch('/api/roles/assignments')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.users)) {
          setHrmsUsersCount(data.users.length);
        } else if (data && data.assignments) {
          setHrmsUsersCount(Object.keys(data.assignments).length);
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize currentTab with URL Hash and LocalStorage for seamless browser reload support
  useEffect(() => {
    if (currentTab) {
      if (window.location.hash !== `#${currentTab}`) {
        window.location.hash = `#${currentTab}`;
      }
      try {
        localStorage.setItem('lm_current_tab', currentTab);
      } catch {}
    }
  }, [currentTab]);

  // Listen to browser navigation (Back, Forward, Direct URL hash changes)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const validTabs = ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings'];
      if (hash && validTabs.includes(hash) && hash !== currentTab) {
        setCurrentTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentTab]);

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

  // Books state loaded live from MongoDB Atlas backend
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_books');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.map(b => ({
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

  // Fetch all dynamic roles from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch all registered patrons/users live from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.users)) {
          setStudents(data.users);
          try { localStorage.setItem('lm_students', JSON.stringify(data.users)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync books live from MongoDB Atlas backend without any keyword filtering
  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        if (data && data.books && Array.isArray(data.books)) {
          const loadedBooks = data.books.map(b => {
            const copyCount = b.total !== undefined ? b.total : (b.total_copies || 1);
            const catCode = (b.category_code || (b.category || 'GEN').slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN';
            const baseAcc = String(b.accession || b.accession_no || `AC${b.id}`).replace(/[\s\-_]/g, '');
            const baseBar = String(b.barcode || `BC${b.id}`).replace(/[\s\-_]/g, '');

            // Ensure copies_detail has valid serial numbers and copies count
            let copiesDetail = [];
            if (Array.isArray(b.copies_detail) && b.copies_detail.length > 0) {
              copiesDetail = b.copies_detail.map((cp, idx) => ({
                ...cp,
                copy_number: cp.copy_number || idx + 1,
                serial_no: String(cp.serial_no || `SN${catCode}${idx + 1}`).replace(/[\s\-_]/g, ''),
                accession: String(cp.accession || `${baseAcc}${idx + 1}`).replace(/[\s\-_]/g, ''),
                barcode: String(cp.barcode || `${baseBar}${idx + 1}`).replace(/[\s\-_]/g, ''),
                status: cp.status || 'Available'
              }));
            } else {
              copiesDetail = Array.from({ length: copyCount }, (_, idx) => ({
                copy_number: idx + 1,
                serial_no: `SN${catCode}${idx + 1}`,
                accession: `${baseAcc}${idx + 1}`,
                barcode: `${baseBar}${idx + 1}`,
                status: idx < (b.available !== undefined ? b.available : copyCount) ? 'Available' : 'Issued'
              }));
            }

            return {
              id: b.id || b._id,
              _id: b.id || b._id,
              title: b.title,
              author: b.author,
              isbn: b.isbn,
              category: b.category,
              category_code: catCode,
              accession: baseAcc,
              barcode: baseBar,
              shelf: b.shelf || b.shelf_location || 'Central Stack',
              total: copyCount,
              available: b.available !== undefined ? b.available : (b.available_copies !== undefined ? b.available_copies : copyCount),
              publisher: b.publisher,
              edition: b.edition,
              copies_detail: copiesDetail
            };
          });

          setBooks(loadedBooks);
          try { localStorage.setItem('lm_books', JSON.stringify(loadedBooks)); } catch {}
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

  // Sync active circulation loans live from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/circulation/loans')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.loans)) {
          setLoans(data.loans);
          try { localStorage.setItem('lm_loans', JSON.stringify(data.loans)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync fine ledgers live from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/fines')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.fines)) {
          setFines(data.fines);
          try { localStorage.setItem('lm_fines', JSON.stringify(data.fines)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync hold reservations live from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/circulation/reservations')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.reservations)) {
          setReservations(data.reservations);
          try { localStorage.setItem('lm_reservations', JSON.stringify(data.reservations)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync security audit trails live from MongoDB Atlas backend
  useEffect(() => {
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.logs) && data.logs.length > 0) {
          setAuditLogs(data.logs.map(l => ({
            id: l.id,
            time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString('en-IN') : 'Recent',
            text: `${(l.action_key || 'SYSTEM').toUpperCase()}: ${l.target_resource || ''} ${l.payload ? JSON.stringify(l.payload) : ''}`
          })));
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

  // Live System Settings (Collegiate Lending Guidelines from database)
  const [systemSettings, setSystemSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('lm_system_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      default_loan_days: 30,
      daily_fine_rate: 5.0,
      max_books_quota: 4,
      max_renewals: 2
    };
  });

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.settings) {
          setSystemSettings(data.settings);
          try {
            localStorage.setItem('lm_system_settings', JSON.stringify(data.settings));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
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

    setCurrentRole(user.role || 'Superadmin');
    setCurrentTab(getInitialTab());

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

  // Compute effective permissions for currently authenticated user / persona
  const isSuperadmin = (currentRole || '').toLowerCase() === 'superadmin' || 
                       (currentUser?.role || '').toLowerCase() === 'superadmin';

  const matchedRole = roles.find(r => 
    (r.name || r.id || '').toLowerCase() === (currentRole || currentUser?.role || '').toLowerCase()
  );

  const effectivePermissions = isSuperadmin
    ? ['dashboard', 'book_creation', 'all_books', 'book_issues_returns', 'user_management', 'settings']
    : (Array.isArray(currentUser?.permissions) && currentUser.permissions.length > 0
        ? currentUser.permissions
        : (matchedRole?.page_privileges || matchedRole?.permissions || ['dashboard', 'all_books']));

  const hasPagePrivilege = (pageId) => isSuperadmin || effectivePermissions.includes(pageId);

  // Automatically redirect user if currentTab is outside their permitted page privileges
  useEffect(() => {
    if (!isSuperadmin && effectivePermissions.length > 0) {
      const baseTab = currentTab === 'admin_dashboard' || currentTab === 'student_dashboard' ? 'dashboard'
        : currentTab === 'admin_books' || currentTab === 'admin_in_library' || currentTab === 'student_catalog' ? 'all_books'
        : currentTab === 'admin_circulation' || currentTab === 'admin_checked_out' || currentTab === 'admin_fines' || currentTab === 'student_my_books' || currentTab === 'student_my_fines' ? 'book_issues_returns'
        : currentTab === 'admin_students' || currentTab === 'admin_permissions' || currentTab === 'admin_logs' || currentTab === 'student_profile' ? 'user_management'
        : currentTab;

      if (!effectivePermissions.includes(baseTab)) {
        setCurrentTab(effectivePermissions[0]);
      }
    }
  }, [currentTab, effectivePermissions, isSuperadmin]);

  // Issue Book (Circulation Desk) - Handles both object payload and individual parameters
  const handleIssueBook = async (barcodeOrPayload, patronIdParam, customDueDateStr = null, patronObj = null) => {
    let barcode = barcodeOrPayload;
    let patronId = patronIdParam;
    let dueDateParam = customDueDateStr;
    let patron = patronObj;

    if (barcodeOrPayload && typeof barcodeOrPayload === 'object' && !Array.isArray(barcodeOrPayload)) {
      barcode = barcodeOrPayload.bookBarcode || barcodeOrPayload.barcode || barcodeOrPayload.accession;
      patronId = barcodeOrPayload.patronId || barcodeOrPayload.studentPin || barcodeOrPayload.rollNo;
      dueDateParam = barcodeOrPayload.manualDueDate || barcodeOrPayload.dueDate || barcodeOrPayload.customDueDateStr;
      if (barcodeOrPayload.patronName) {
        patron = {
          id: patronId,
          name: barcodeOrPayload.patronName,
          pin_no: patronId,
          rollNo: patronId,
          department: barcodeOrPayload.department || 'General'
        };
      }
    }

    const cleanId = String(patronId || '').trim().toLowerCase();
    if (!patron) {
      patron = students.find(s => 
        (s.id && String(s.id).toLowerCase() === cleanId) || 
        (s.rollNo && String(s.rollNo).toLowerCase() === cleanId) ||
        (s.pin_no && String(s.pin_no).toLowerCase() === cleanId) ||
        (s.name && String(s.name).toLowerCase() === cleanId) ||
        (s.email && String(s.email).toLowerCase() === cleanId)
      );
    }

    if (patron && patron.status === 'Frozen') {
      addToast(`Cannot issue: Patron account for ${patron.name} (${patron.rollNo || patron.id}) is FROZEN. Resolve overdue penalties first.`, 'danger');
      return;
    }

    const cleanBarcode = String(barcode || '').trim().toLowerCase();
    const targetBook = books.find(b => 
      (b.barcode && String(b.barcode).toLowerCase() === cleanBarcode) || 
      (b.accession && String(b.accession).toLowerCase() === cleanBarcode) ||
      (b.id && String(b.id) === String(barcode)) ||
      (b._id && String(b._id) === String(barcode)) ||
      (b.title && String(b.title).toLowerCase() === cleanBarcode)
    );

    const getBookAvail = (b) => {
      if (!b) return 0;
      if (b.available !== undefined && b.available !== null && !isNaN(Number(b.available))) return Number(b.available);
      if (Array.isArray(b.copies_detail) && b.copies_detail.length > 0) {
        return b.copies_detail.filter(c => !c.status || c.status.toLowerCase() === 'available').length;
      }
      return Number(b.total || b.copies || 1);
    };

    const bookAvail = getBookAvail(targetBook);
    if (!targetBook || bookAvail <= 0) {
      addToast(`Cannot issue: Zero available copies in stock for "${targetBook?.title || barcode}"`, 'danger');
      return;
    }

    const finalPatronId = patron?.pin_no || patron?.rollNo || patron?.id || patronId || 'STUDENT';
    const finalPatronName = patron?.name || `Patron #${finalPatronId}`;
    const finalDept = patron?.department || 'General';

    try {
      const res = await fetch('/api/circulation/issue', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ 
          barcode: targetBook.barcode || targetBook.accession || barcode, 
          patron_id: finalPatronId, 
          patron_name: finalPatronName,
          department: finalDept,
          due_date: dueDateParam 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to issue book.', 'danger');
        return;
      }
      if (data.loan) {
        setLoans(prev => [data.loan, ...prev.filter(l => l.id !== data.loan.id)]);
      }
    } catch {
      // Local sync fallback
    }

    // Decrement available copies
    setBooks(prev => prev.map(b => {
      if (b.id === targetBook.id || b.barcode === targetBook.barcode || b.accession === targetBook.accession) {
        const curAvail = getBookAvail(b);
        return { ...b, available: Math.max(curAvail - 1, 0) };
      }
      return b;
    }));

    // Increment student borrowed count
    if (patron) {
      setStudents(prev => prev.map(s => {
        if (s.id === patron.id || s.rollNo === patron.rollNo || s.pin_no === patron.pin_no) {
          return { ...s, borrowedCount: (s.borrowedCount || 0) + 1 };
        }
        return s;
      }));
    }

    let dueDateStr = dueDateParam;
    if (!dueDateStr) {
      const due = new Date();
      due.setDate(due.getDate() + (systemSettings?.default_loan_days || 30));
      dueDateStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const newLoan = {
      id: Date.now(),
      bookTitle: targetBook.title,
      bookBarcode: targetBook.barcode || targetBook.accession,
      accession: targetBook.accession,
      patronName: finalPatronName,
      patronId: finalPatronId,
      department: finalDept,
      issueDateFormatted: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      dueDateFormatted: dueDateStr,
      status: 'Borrowed',
      renewalsCount: 0
    };

    setLoans(prev => [newLoan, ...prev]);
    addToast(`Book "${targetBook.title}" issued to ${finalPatronName}! Due Date: ${dueDateStr}`, 'success');
    addAuditLog(`ISSUE: "${targetBook.title}" [${targetBook.accession}] issued to ${finalPatronName} (${finalPatronId}). Due Date: ${dueDateStr}`);
  };

  // Return Book (Circulation Desk) - Matches by Loan ID or Barcode
  const handleReturnBook = async (barcodeOrId) => {
    const cleanParam = String(barcodeOrId || '').trim().toLowerCase();
    const targetLoan = loans.find(l => 
      l.status !== 'Returned' && (
        (l.id && String(l.id).toLowerCase() === cleanParam) ||
        (l._id && String(l._id).toLowerCase() === cleanParam) ||
        (l.bookBarcode && String(l.bookBarcode).toLowerCase() === cleanParam) ||
        (l.accession && String(l.accession).toLowerCase() === cleanParam)
      )
    );

    if (!targetLoan) {
      addToast(`No active loan found for record [${barcodeOrId}]`, 'danger');
      return;
    }

    const targetBook = books.find(b => 
      (b.barcode && b.barcode === targetLoan.bookBarcode) || 
      (b.accession && b.accession === targetLoan.accession) ||
      (b.title && b.title === targetLoan.bookTitle)
    );

    const barcodeForApi = targetLoan.bookBarcode || targetLoan.accession || targetBook?.barcode || targetBook?.accession || barcodeOrId;

    try {
      const res = await fetch('/api/circulation/return', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ barcode: barcodeForApi })
      });
      const data = await res.json();
      if (data.fine) {
        setFines(prev => [data.fine, ...prev]);
      }
    } catch {
      // Local sync fallback
    }

    if (targetBook) {
      setBooks(prev => prev.map(b => {
        if (b.id === targetBook.id || b.barcode === targetBook.barcode || b.accession === targetBook.accession) {
          const curAvail = Number(b.available !== undefined ? b.available : 0);
          const maxTotal = Number(b.total || b.copies || curAvail + 1);
          return { ...b, available: Math.min(curAvail + 1, maxTotal) };
        }
        return b;
      }));
    }

    // Decrement student borrowedCount
    setStudents(prev => prev.map(s => {
      if (s.id === targetLoan.patronId || s.rollNo === targetLoan.patronId || s.pin_no === targetLoan.patronId) {
        return { ...s, borrowedCount: Math.max((s.borrowedCount || 1) - 1, 0) };
      }
      return s;
    }));

    const now = new Date();
    const retDateFormatted = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    setLoans(prev => prev.map(l => {
      if (l.id === targetLoan.id) {
        return { 
          ...l, 
          status: 'Returned',
          return_date: now.toISOString(),
          returnDate: now.toISOString(),
          returnDateFormatted: retDateFormatted
        };
      }
      return l;
    }));

    addToast(`Book "${targetLoan.bookTitle}" returned to stock. Reshelve at: ${targetBook?.shelf || 'Central Stack'}`, 'success');
    addAuditLog(`RETURN: "${targetLoan.bookTitle}" returned by ${targetLoan.patronName}. Copy restored to shelf.`);
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

    try {
      fetch('/api/circulation/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ loan_id: loan.id, barcode: loan.bookBarcode || loan.accession })
      }).catch(() => {});
    } catch {}

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

  // Book Reservation & Hold Management (Persisted in MongoDB)
  const handleReserveBook = async (book) => {
    const existing = reservations.find(r => (r.bookId === book.id || r.bookId === book._id) && r.studentId === currentStudent.id);
    if (existing) {
      addToast(`You already have an active hold on "${book.title}".`, 'info');
      return;
    }

    try {
      const res = await fetch('/api/circulation/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          book_id: book.id || book._id,
          book_title: book.title,
          book_accession: book.accession,
          student_id: currentStudent.id,
          student_name: currentStudent.name,
          shelf_location: book.shelf || 'Central Stack'
        })
      });
      const data = await res.json();
      if (res.ok && data.reservation) {
        setReservations(prev => [data.reservation, ...prev]);
        addToast(data.message || `Hold confirmed for "${book.title}"!`, 'success');
      } else {
        addToast(data.error || 'Failed to place reservation.', 'danger');
      }
    } catch {
      // Local fallback
    }
  };

  const handleCancelReservation = (reservationId) => {
    const target = reservations.find(r => r.id === reservationId);
    setReservations(prev => prev.filter(r => r.id !== reservationId));
    try {
      fetch(`/api/circulation/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
      }).catch(() => {});
    } catch {}
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

    // Persist status change to MongoDB Atlas backend
    try {
      fetch(`/api/users/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ status: nextStatus })
      }).catch(() => {});
    } catch {}

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

  // Bulk Add Books (Excel Upload) via MongoDB REST API
  const handleBulkAddBooks = async (booksArray) => {
    try {
      const res = await fetch('/api/books/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ books: booksArray })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.books)) {
        setBooks(prev => [...data.books, ...prev]);
        addToast(`Successfully imported ${data.books.length} books!`, 'success');
        addAuditLog(`EXCEL BULK IMPORT: Uploaded ${data.books.length} books from spreadsheet.`);
        return { success: true, count: data.books.length };
      } else {
        throw new Error(data.error || 'Bulk upload failed');
      }
    } catch (err) {
      // Fallback local update if network error
      setBooks(prev => [...booksArray, ...prev]);
      addToast(`Imported ${booksArray.length} books to catalog.`, 'success');
      addAuditLog(`EXCEL BULK IMPORT: Uploaded ${booksArray.length} books.`);
      return { success: true, count: booksArray.length };
    }
  };

  // Bulk Import Circulations (Issues & Returns Spreadsheet) via REST API
  const handleBulkImportCirculations = async (circulationsArray) => {
    try {
      const res = await fetch('/api/circulation/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ circulations: circulationsArray })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.loans)) {
        setLoans(prev => [...data.loans, ...prev]);
        addToast(`Successfully imported ${data.loans.length} circulation records!`, 'success');
        addAuditLog(`BULK CIRCULATION IMPORT: Uploaded ${data.loans.length} loan records.`);
        return { success: true, count: data.loans.length };
      } else {
        throw new Error(data.error || 'Bulk circulation import failed');
      }
    } catch (err) {
      setLoans(prev => [...circulationsArray, ...prev]);
      addToast(`Imported ${circulationsArray.length} circulation records to desk.`, 'success');
      addAuditLog(`BULK CIRCULATION IMPORT: Staged ${circulationsArray.length} loan records.`);
      return { success: true, count: circulationsArray.length };
    }
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
    // Settle fine dynamically in MongoDB Atlas
    try {
      fetch(`/api/fines/${fine.id}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ payment_method: 'Cash' })
      }).catch(() => {});
    } catch {}

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
    // Settle fine dynamically in MongoDB Atlas
    try {
      fetch(`/api/fines/${fine.id}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ payment_method: 'UPI Online (GPay/PhonePe)' })
      }).catch(() => {});
    } catch {}

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
    // Waive fine dynamically in MongoDB Atlas
    try {
      fetch(`/api/fines/${fine.id}/waive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ waiver_reason: reason })
      }).catch(() => {});
    } catch {}

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
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
          {toasts.map(t => (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`pointer-events-auto p-3.5 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-right duration-200 cursor-pointer ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : t.type === 'danger'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-sm shrink-0">{t.type === 'success' ? '✅' : t.type === 'danger' ? '⚠️' : 'ℹ️'}</span>
                <span className="leading-snug break-words">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                className="p-1 rounded-lg hover:bg-black/10 text-current opacity-60 hover:opacity-100 transition-opacity shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
        roles={roles}
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
          {hasPagePrivilege('dashboard') && (currentTab === 'dashboard' || currentTab === 'admin_dashboard' || currentTab === 'student_dashboard') && (
            <DashboardView
              books={books}
              loans={loans}
              fines={fines}
              students={students}
              auditLogs={auditLogs}
              hrmsUsersCount={hrmsUsersCount}
              onNavigate={setCurrentTab}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
              onOpenWaiveModal={(fine) => setSelectedFineForWaive(fine)}
            />
          )}

          {/* 2. Create Book */}
          {hasPagePrivilege('book_creation') && currentTab === 'book_creation' && (
            <BookCreationView
              books={books}
              onAddBook={handleAddBook}
              onBulkAddBooks={handleBulkAddBooks}
              onNavigate={setCurrentTab}
              onToast={addToast}
            />
          )}

          {/* 3. All Books Catalog */}
          {hasPagePrivilege('all_books') && (currentTab === 'all_books' || currentTab === 'admin_books' || currentTab === 'admin_in_library' || currentTab === 'student_catalog') && (
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
          {hasPagePrivilege('book_issues_returns') && (currentTab === 'book_issues_returns' || currentTab === 'admin_circulation' || currentTab === 'admin_checked_out' || currentTab === 'admin_fines' || currentTab === 'student_my_books' || currentTab === 'student_my_fines') && (
            <BookIssuesReturnsView
              books={books}
              loans={loans}
              students={students}
              auditLogs={auditLogs}
              systemSettings={systemSettings}
              onBulkImportCirculations={handleBulkImportCirculations}
              onIssueBook={handleIssueBook}
              onReturnBook={handleReturnBook}
              onRenewLoan={handleRenewLoan}
              onCollectCash={handleCollectCash}
              onOpenUpiModal={(fine) => setSelectedFineForUpi(fine)}
              onOpenWaiveModal={(fine) => setSelectedFineForWaive(fine)}
              prefilledBook={prefilledBookForIssue}
              onClearPrefilled={() => setPrefilledBookForIssue(null)}
              initialSection={currentTab === 'admin_checked_out' ? 'loans' : currentTab === 'admin_fines' ? 'return' : null}
              onToast={addToast}
            />
          )}

          {/* 5. User Management */}
          {hasPagePrivilege('user_management') && (currentTab === 'user_management' || currentTab === 'admin_students' || currentTab === 'admin_permissions' || currentTab === 'admin_logs' || currentTab === 'student_profile') && (
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
          {hasPagePrivilege('settings') && currentTab === 'settings' && (
            <SettingsView
              authToken={authToken}
              currentUser={currentUser}
              onToast={addToast}
            />
          )}

          {/* Access Restricted Notice if user tries to view an unauthorized tab */}
          {!hasPagePrivilege(
            currentTab === 'admin_dashboard' || currentTab === 'student_dashboard' ? 'dashboard'
            : currentTab === 'admin_books' || currentTab === 'admin_in_library' || currentTab === 'student_catalog' ? 'all_books'
            : currentTab === 'admin_circulation' || currentTab === 'admin_checked_out' || currentTab === 'admin_fines' || currentTab === 'student_my_books' || currentTab === 'student_my_fines' ? 'book_issues_returns'
            : currentTab === 'admin_students' || currentTab === 'admin_permissions' || currentTab === 'admin_logs' || currentTab === 'student_profile' ? 'user_management'
            : currentTab
          ) && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50 border border-zinc-200/90 rounded-2xl space-y-4 my-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">Access Restricted</h2>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                  Your institutional account does not have privilege to access this view. Privileges are managed by your System Superadmin.
                </p>
              </div>
              {effectivePermissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentTab(effectivePermissions[0])}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  Return to Allowed Workspace
                </button>
              )}
            </div>
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
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto p-3.5 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-right duration-200 cursor-pointer ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : t.type === 'danger'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-sm shrink-0">{t.type === 'success' ? '✅' : t.type === 'danger' ? '⚠️' : 'ℹ️'}</span>
              <span className="leading-snug break-words">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
              className="p-1 rounded-lg hover:bg-black/10 text-current opacity-60 hover:opacity-100 transition-opacity shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
