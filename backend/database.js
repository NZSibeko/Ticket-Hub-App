// backend/database.js - FINAL 100% WORKING (November 19, 2025)
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
// CREATE ALL TABLES
// ========================
const initializeTables = async () => {
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS event_managers (
      manager_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'event_manager',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
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
      role TEXT DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      location TEXT,
      source_url TEXT,
      has_ticketing INTEGER DEFAULT 0,
      ticket_provider TEXT,
      partnership_status TEXT DEFAULT 'untapped',
      notes TEXT,
      venue TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      organizer_name TEXT,
      capacity INTEGER,
      archived INTEGER DEFAULT 0,
      category TEXT DEFAULT 'General',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_name)
    )
  `);

  console.log('All tables created/verified');
};

// Add missing columns if needed
const updateEventsTable = async () => {
  const columns = [
    'venue TEXT',
    'contact_email TEXT',
    'contact_phone TEXT',
    'organizer_name TEXT',
    'capacity INTEGER',
    'archived INTEGER DEFAULT 0',
    'category TEXT DEFAULT "General"'
  ];

  for (const col of columns) {
    try {
      await dbOperations.run(`ALTER TABLE events ADD COLUMN ${col}`);
      console.log(`✅ Added column: ${col}`);
    } catch (err) {
      // Ignore if column already exists
      if (!err.message.includes('duplicate column name')) {
        console.error('Error adding column:', err);
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
      await dbOperations.run(
        `INSERT INTO event_managers (manager_id, name, email, password, phone, role) VALUES (?, ?, ?, ?, ?, 'event_manager')`,
        [uuidv4(), 'Default Manager', 'manager@tickethub.co.za', hashed, '+27 82 000 0000']
      );
      console.log('✅ Default event manager created');
    } else {
      console.log('✅ Default event manager already exists');
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
      await dbOperations.run(
        `INSERT INTO admins (admin_id, name, email, password, role) VALUES (?, ?, ?, ?, 'SUPER_ADMIN')`,
        [uuidv4(), 'Super Admin', 'admin@tickethub.co.za', hashed]
      );
      console.log('✅ Default admin created');
    } else {
      console.log('✅ Default admin already exists');
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
      await dbOperations.run(
        `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, role)
         VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
        [uuidv4(), 'Test', 'Customer', 'customer@test.com', hashed, '+27 71 123 4567']
      );
      console.log('✅ Default customer created: customer@test.com / customer123');
    } else {
      console.log('✅ Default customer already exists');
    }
  } catch (err) {
    console.log('Customer check skipped:', err.message);
  }
};

// ========================
// RUN INITIALIZATION AFTER EVERYTHING IS DEFINED
// ========================
(async () => {
  try {
    await initializeTables();
    await updateEventsTable();
  } catch (err) {
    console.error('Initialization error:', err);
  }
})();

// ========================
// EXPORT EVERYTHING
// ========================
module.exports = {
  dbOperations,
  connectDatabase,
  ensureDefaultEventManager,
  ensureDefaultAdmin,
  ensureDefaultCustomer,
  initializeTables,
  updateEventsTable
};