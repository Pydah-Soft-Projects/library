/**
 * In-Memory ACID Datastore & Database Connection
 * Preloaded with Indian College Library Catalog, Patrons, and RBAC Matrix
 */

const db = {
  roles: [
    { id: 1, name: 'Superadmin', description: 'Sovereign governance, dynamic capability delegation & security audits' },
    { id: 2, name: 'Librarian', description: 'Acquisitions, catalog management, membership tiers, and NAAC reporting' },
    { id: 3, name: 'Sub-staff', description: 'Circulation desk operations, checkout/returns, and receipt collection' },
    { id: 4, name: 'Student', description: 'Patron end-user self-service OPAC search and personal loan countdowns' }
  ],

  permissions: [
    { id: 1, key: 'catalog.read', module: 'catalog', description: 'Search and read catalog holdings' },
    { id: 2, key: 'catalog.create', module: 'catalog', description: 'Accession new book titles and copies' },
    { id: 3, key: 'catalog.update', module: 'catalog', description: 'Edit book metadata, shelf location, or edition' },
    { id: 4, key: 'catalog.delete', module: 'catalog', description: 'Purge / weed out destroyed or archived volumes' },
    { id: 5, key: 'circulation.issue', module: 'circulation', description: 'Issue 30-day loans to registered patrons' },
    { id: 6, key: 'circulation.return', module: 'circulation', description: 'Process returns, check overdue, and release copies' },
    { id: 7, key: 'circulation.renew', module: 'circulation', description: 'Extend loan period subject to hold queue' },
    { id: 8, key: 'circulation.reserve', module: 'circulation', description: 'Place hold reservation on checked-out titles' },
    { id: 9, key: 'fines.read', module: 'fines', description: 'View fine ledgers and payment receipts' },
    { id: 10, key: 'fines.collect', module: 'fines', description: 'Collect fine payments via Cash or UPI QR' },
    { id: 11, key: 'fines.waive', module: 'fines', description: 'Grant official fine waivers with mandatory reason' },
    { id: 12, key: 'patrons.read', module: 'patrons', description: 'Inspect patron borrowing history and hold status' },
    { id: 13, key: 'patrons.manage', module: 'patrons', description: 'Add, update or freeze patron accounts' },
    { id: 14, key: 'system.roles.manage', module: 'system', description: 'Configure system roles and base permission sets' },
    { id: 15, key: 'system.overrides.manage', module: 'system', description: 'Grant dynamic per-user capability overrides' },
    { id: 16, key: 'system.audit.read', module: 'system', description: 'Read immutable forensic audit trails' }
  ],

  // Base role-permission mappings
  role_permissions: {
    1: ['catalog.read', 'catalog.create', 'catalog.update', 'catalog.delete', 'circulation.issue', 'circulation.return', 'circulation.renew', 'circulation.reserve', 'fines.read', 'fines.collect', 'fines.waive', 'patrons.read', 'patrons.manage', 'system.roles.manage', 'system.overrides.manage', 'system.audit.read'],
    2: ['catalog.read', 'catalog.create', 'catalog.update', 'catalog.delete', 'circulation.issue', 'circulation.return', 'circulation.renew', 'circulation.reserve', 'fines.read', 'fines.collect', 'fines.waive', 'patrons.read', 'patrons.manage'],
    3: ['catalog.read', 'circulation.issue', 'circulation.return', 'circulation.renew', 'circulation.reserve', 'fines.read', 'fines.collect', 'patrons.read'],
    4: ['catalog.read', 'circulation.reserve', 'fines.read']
  },

  // Dynamic User Permission Overrides (Table: user_permission_overrides)
  user_permission_overrides: {},

  users: [
    {
      id: 1,
      role_id: 1,
      full_name: 'Dr. A. K. Sharma',
      email: 'admin@collegelibrary.in',
      phone: '+91 98450 11022',
      status: 'Active',
      created_at: new Date('2024-01-01')
    },
    {
      id: 2,
      role_id: 2,
      full_name: 'Dr. K. Radhakrishnan',
      email: 'librarian@collegelibrary.in',
      phone: '+91 98450 22033',
      status: 'Active',
      created_at: new Date('2024-01-15')
    },
    {
      id: 3,
      role_id: 3,
      full_name: 'Ramesh Kumar',
      email: 'desk.staff@collegelibrary.in',
      phone: '+91 98450 33044',
      status: 'Active',
      created_at: new Date('2024-02-01')
    },
    {
      id: 4,
      role_id: 4,
      full_name: 'Priya Sharma',
      email: 'priya.cs23@college.edu.in',
      phone: '+91 98450 44055',
      patron_id: 'STU-2023-CS042',
      department: 'Computer Science & Engineering',
      status: 'Active',
      created_at: new Date('2024-07-20')
    },
    {
      id: 5,
      role_id: 4,
      full_name: 'Rahul Verma',
      email: 'rahul.me24@college.edu.in',
      phone: '+91 98450 55066',
      patron_id: 'STU-2024-ME019',
      department: 'Mechanical Engineering',
      status: 'Active',
      created_at: new Date('2024-08-01')
    },
    {
      id: 6,
      role_id: 4,
      full_name: 'Ananya Deshmukh',
      email: 'ananya.ec23@college.edu.in',
      phone: '+91 98450 66077',
      patron_id: 'STU-2023-EC081',
      department: 'Electronics & Communication',
      status: 'Active',
      created_at: new Date('2024-08-10')
    },
    {
      id: 7,
      role_id: 4,
      full_name: 'Karthik Nair',
      email: 'karthik.ce22@college.edu.in',
      phone: '+91 98450 77088',
      patron_id: 'STU-2022-CE014',
      department: 'Civil Engineering',
      status: 'Active',
      created_at: new Date('2024-08-15')
    }
  ],

  books: [
    {
      id: 1,
      isbn: '978-8174091955',
      accession_no: 'ACC-ENG-0412',
      barcode: 'BC-ENG-8841',
      title: 'Higher Engineering Mathematics',
      author: 'Dr. B.S. Grewal',
      category: 'Engineering',
      publisher: 'Khanna Publishers',
      publication_year: 2023,
      shelf_location: 'Rack E-14 (Row 2)',
      total_copies: 8,
      available_copies: 5
    },
    {
      id: 2,
      isbn: '978-1119800361',
      accession_no: 'ACC-CSE-1189',
      barcode: 'BC-CSE-3920',
      title: 'Operating System Concepts',
      author: 'Silberschatz, Galvin & Gagne',
      category: 'Computer Science',
      publisher: 'Wiley Global Education',
      publication_year: 2022,
      shelf_location: 'Rack CS-03 (Row 1)',
      total_copies: 10,
      available_copies: 3
    },
    {
      id: 3,
      isbn: '978-0078022159',
      accession_no: 'ACC-CSE-2401',
      barcode: 'BC-CSE-5521',
      title: 'Database System Concepts',
      author: 'Korth, Sudarshan & Silberschatz',
      category: 'Computer Science',
      publisher: 'McGraw-Hill Education',
      publication_year: 2021,
      shelf_location: 'Rack CS-05 (Row 3)',
      total_copies: 10,
      available_copies: 2
    },
    {
      id: 4,
      isbn: '978-0131873742',
      accession_no: 'ACC-ECE-0891',
      barcode: 'BC-ECE-7201',
      title: 'Digital Signal Processing: Principles & Applications',
      author: 'John G. Proakis, Dimitris Manolakis',
      category: 'Electronics',
      publisher: 'Pearson Education',
      publication_year: 2020,
      shelf_location: 'Rack EC-08 (Row 4)',
      total_copies: 6,
      available_copies: 2
    },
    {
      id: 5,
      isbn: '978-0323531139',
      accession_no: 'ACC-MED-0314',
      barcode: 'BC-MED-4412',
      title: 'Robbins & Cotran Pathologic Basis of Disease',
      author: 'Vinay Kumar, Abul Abbas, Jon Aster',
      category: 'Medical',
      publisher: 'Elsevier',
      publication_year: 2021,
      shelf_location: 'Rack MD-02 (Row 1)',
      total_copies: 5,
      available_copies: 1
    }
  ],

  // Circulation records (Enforcing 30-Day Policy)
  borrow_records: [
    {
      id: 1,
      user_id: 4, // Priya Sharma
      book_id: 1, // B.S. Grewal
      staff_id: 3, // Ramesh Kumar
      issue_date: new Date(Date.now() - 15 * 86400000).toISOString(),
      due_date: new Date(Date.now() + 15 * 86400000).toISOString(), // 30 days total
      return_date: null,
      status: 'Borrowed'
    },
    {
      id: 2,
      user_id: 5, // Rahul Verma
      book_id: 2, // Silberschatz
      staff_id: 3,
      issue_date: new Date(Date.now() - 35 * 86400000).toISOString(),
      due_date: new Date(Date.now() - 5 * 86400000).toISOString(), // Overdue by 5 days
      return_date: null,
      status: 'Overdue'
    }
  ],

  // Fines Ledger
  fines: [
    {
      id: 1,
      borrow_id: 2, // Rahul Verma's loan
      user_id: 5,
      amount: 25.00, // 5 days late * ₹5/day
      status: 'Unpaid',
      paid_at: null,
      collected_by: null,
      waiver_reason: null,
      created_at: new Date().toISOString()
    }
  ],

  // Immutable Forensic Audit Trail
  audit_logs: [
    {
      id: 1,
      actor_id: 1,
      action_key: 'system.boot',
      target_resource: 'SYSTEM',
      payload: { message: 'LibraryManagement API Server Booted with MySQL 8.0 ACID simulation' },
      ip_address: '127.0.0.1',
      timestamp: new Date().toISOString()
    }
  ]
};

module.exports = db;
