const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'ticketing.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Users/Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone_number TEXT,
      password_hash TEXT NOT NULL,
      account_status TEXT DEFAULT 'ACTIVE',
      profile_picture TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      event_description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      location TEXT NOT NULL,
      event_status TEXT DEFAULT 'PENDING',
      current_attendees INTEGER DEFAULT 0,
      max_attendees INTEGER NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      event_image TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES customers(customer_id)
    )`);

    // Tickets table
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      qr_code TEXT UNIQUE NOT NULL,
      ticket_status TEXT DEFAULT 'PURCHASED',
      purchase_date TEXT DEFAULT CURRENT_TIMESTAMP,
      validation_date TEXT,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_status TEXT DEFAULT 'PENDING',
      payment_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(event_id),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`);

    // Payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'PENDING',
      transaction_id TEXT,
      payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`);

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database tables initialized');
  });
}

// Helper functions for database operations
const dbOperations = {
  // Generic run function
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  // Generic get function
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Generic all function
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbOperations };