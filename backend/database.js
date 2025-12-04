// backend/database.js - FINAL WITH STATUS COLUMNS & LAST_LOGIN
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ticket_hub.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

const dbOperations = {
  isConnected: () => true,

  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  }),

  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),

  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  })
};

const connectDatabase = () => Promise.resolve();

// ========================
// CREATE ALL TABLES — WITH STATUS COLUMNS
// ========================
const initializeTables = async () => {
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS event_managers (
      manager_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'event_manager',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ADMINS TABLE — WITH STATUS COLUMN
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'admin',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'customer',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Events table — unchanged
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      event_description TEXT,
      start_date TEXT,
      end_date TEXT,
      location TEXT,
      image_url TEXT,  
      currency TEXT DEFAULT 'ZAR',
      has_ticketing INTEGER DEFAULT 0,
      ticket_types TEXT,
      partnership_status TEXT DEFAULT 'untapped',
      status TEXT DEFAULT 'DRAFT',
      notes TEXT,
      venue TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      organizer_name TEXT,
      max_attendees INTEGER,
      price REAL,
      capacity INTEGER, 
      archived INTEGER DEFAULT 0,
      category TEXT DEFAULT 'General',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_name)
    )
  `);
  
  // Dashboard tables
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS dashboard_user_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      joined TEXT,
      lastActive TEXT,
      avatar TEXT,
      country TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS dashboard_metrics (
      key TEXT PRIMARY KEY,
      value TEXT -- JSON data
    )
  `);

  // Initialize default metrics
  const defaultMetrics = [
      { key: 'stats', value: JSON.stringify({ total: 3, active: 3, newThisWeek: 0, suspended: 0, growthRate: 0, suspendedRate: 0, newThisWeekRate: 0 }) },
      { key: 'analytics', value: JSON.stringify({ roleDistribution: { 'Admin': 33, 'Event Manager': 33, 'Customer': 33 } }) },
      { key: 'recentActivity', value: JSON.stringify([
          { type: 'user_login', user: 'Super Admin', time: '5 mins ago', status: 'success' },
          { type: 'user_registered', user: 'Test Customer', time: '1 hour ago', status: 'success' },
          { type: 'event_created', user: 'Event Manager', time: '2 hours ago', status: 'warning' },
      ]) }
  ];

  for (const metric of defaultMetrics) {
    const existing = await dbOperations.get(`SELECT key FROM dashboard_metrics WHERE key = ?`, [metric.key]);
    if (!existing) {
        await dbOperations.run(`INSERT INTO dashboard_metrics (key, value) VALUES (?, ?)`, [metric.key, metric.value]);
    }
  }

  console.log('All tables created/verified — all user tables now have status and last_login columns');
};

// Migration: Add phone column if missing
const updateEventsTable = async () => {
  const columns = [
    'event_description TEXT',
    'start_date TEXT',
    'end_date TEXT',
    'image_url TEXT',
    'currency TEXT DEFAULT "ZAR"',
    'ticket_types TEXT', 
    'status TEXT DEFAULT "DRAFT"',
    'created_by TEXT',
    'capacity INTEGER',
    'venue TEXT',
    'category TEXT DEFAULT "General"',
    'archived INTEGER DEFAULT 0',
    'max_attendees INTEGER',
    'price REAL'
  ];

  for (const col of columns) {
    try {
      await dbOperations.run(`ALTER TABLE events ADD COLUMN ${col}`);
      console.log(`Added column: ${col}`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error('Error adding column:', err);
      }
    }
  }
};

// Add phone to existing admins table
const addPhoneToAdmins = async () => {
  try {
    await dbOperations.run(`ALTER TABLE admins ADD COLUMN phone TEXT`);
    console.log('Added phone column to admins table');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.error('Error adding phone column:', err);
    }
  }
};

// Migration: Add status column to all user tables
const addStatusToUserTables = async () => {
  const tables = ['event_managers', 'admins', 'customers'];
  
  for (const table of tables) {
    try {
      await dbOperations.run(`ALTER TABLE ${table} ADD COLUMN status TEXT DEFAULT 'active'`);
      console.log(`Added status column to ${table} table`);
      
      // Update existing users to have 'active' status
      await dbOperations.run(`UPDATE ${table} SET status = 'active' WHERE status IS NULL`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`Error adding status column to ${table}:`, err);
      }
    }
  }
};

// Migration: Add last_login column to user tables
const addLastLoginToUserTables = async () => {
  const tables = ['event_managers', 'admins', 'customers'];
  
  for (const table of tables) {
    try {
      await dbOperations.run(`ALTER TABLE ${table} ADD COLUMN last_login TEXT`);
      console.log(`Added last_login column to ${table} table`);
      
      // Set default last_login to created_at for existing users
      await dbOperations.run(`UPDATE ${table} SET last_login = created_at WHERE last_login IS NULL`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`Error adding last_login column to ${table}:`, err);
      }
    }
  }
};

// ========================
// DEFAULT USERS
// ========================
const ensureDefaultEventManager = async (bcrypt, uuidv4) => {
  try {
    const existing = await dbOperations.get(`SELECT * FROM event_managers WHERE email = ?`, ['manager@tickethub.co.za']);
    if (!existing) {
      const hashed = await bcrypt.hash('manager123', 10);
      const now = new Date().toISOString();
      await dbOperations.run(
        `INSERT INTO event_managers (manager_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, 'event_manager', ?, ?)`,
        [uuidv4(), 'Default Manager', 'manager@tickethub.co.za', hashed, '+27 82 000 0000', 'active', now, now]
      );
      await dbOperations.run(
        `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Default Manager', 'manager@tickethub.co.za', hashed, 'Event Manager', 'active', '2025-11-20', 'Just now', 'DM', 'South Africa']
      );
      console.log('Default event manager created');
    } else {
      console.log('Default event manager already exists');
    }
  } catch (err) {
    console.log('Event manager check skipped:', err.message);
  }
};

const ensureDefaultAdmin = async (bcrypt, uuidv4) => {
  try {
    const existing = await dbOperations.get(`SELECT * FROM admins WHERE email = ?`, ['admin@tickethub.co.za']);
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      const now = new Date().toISOString();
      await dbOperations.run(
        `INSERT INTO admins (admin_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, 'SUPER_ADMIN', ?, ?)`,
        [uuidv4(), 'Super Admin', 'admin@tickethub.co.za', hashed, null, 'active', now, now]
      );
      await dbOperations.run(
        `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Super Admin', 'admin@tickethub.co.za', hashed, 'Admin', 'active', '2025-11-15', 'Just now', 'SA', 'South Africa']
      );
      console.log('Default admin created');
    } else {
      console.log('Default admin already exists');
    }
  } catch (err) {
    console.log('Admin check skipped:', err.message);
  }
};

const ensureDefaultCustomer = async (bcrypt, uuidv4) => {
  try {
    const existing = await dbOperations.get(`SELECT * FROM customers WHERE email = ?`, ['customer@test.com']);
    if (!existing) {
      const hashed = await bcrypt.hash('customer123', 10);
      const now = new Date().toISOString();
      await dbOperations.run(
        `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, status, role, last_login, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', ?, ?)`,
        [uuidv4(), 'Test', 'Customer', 'customer@test.com', hashed, '+27 71 123 4567', 'active', now, now]
      );
      await dbOperations.run(
        `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Test Customer', 'customer@test.com', hashed, 'Customer', 'active', '2025-11-25', 'Just now', 'TC', 'South Africa']
      );
      console.log('Default customer created: customer@test.com / customer123');
    } else {
      console.log('Default customer already exists');
    }
  } catch (err) {
    console.log('Customer check skipped:', err.message);
  }
};

// ========================
// RUN INITIALIZATION
// ========================
(async () => {
  try {
    await initializeTables();
    await addStatusToUserTables();     // Add status columns
    await addLastLoginToUserTables();  // Add last_login columns
    await addPhoneToAdmins();
    await updateEventsTable();
  } catch (err) {
    console.error('Initialization error:', err);
  }
})();

// ========================
// EXPORT
// ========================
module.exports = {
  dbOperations,
  connectDatabase,
  ensureDefaultEventManager,
  ensureDefaultAdmin,
  ensureDefaultCustomer,
  initializeTables,
  updateEventsTable,
  addPhoneToAdmins,
  addStatusToUserTables,
  addLastLoginToUserTables
};