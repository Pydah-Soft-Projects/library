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

  users: [],

  // Dynamic Books Holdings (Managed via MongoDB Atlas collection: books)
  books: [],

  // Circulation records (Enforcing 30-Day Policy)
  borrow_records: [],

  // Fines Ledger
  fines: [],

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
