const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'ticketing.db');
let db = null;
let isConnected = false;

// Initialize database connection
function connectDatabase() {
  return new Promise((resolve, reject) => {
    if (db && isConnected) {
      console.log('✅ Using existing database connection');
      return resolve(db);
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database');
        isConnected = true;
        initDatabase()
          .then(() => resolve(db))
          .catch(reject);
      }
    });
  });
}

// Initialize database tables
function initDatabase() {
  return new Promise((resolve, reject) => {
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
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating customers table:', err);
          reject(err);
        }
      });

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
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating events table:', err);
          reject(err);
        }
      });

      // Event Ticket Types table
      db.run(`CREATE TABLE IF NOT EXISTS event_ticket_types (
        ticket_type_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        available_quantity INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating event_ticket_types table:', err);
          reject(err);
        }
      });

      // Tickets table - FIXED: Simplified without PRAGMA check
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
        ticket_type TEXT DEFAULT 'general',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(event_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating tickets table:', err);
          reject(err);
        } else {
          console.log('✅ Tickets table created/verified');
          // Try to add ticket_type column if it doesn't exist (safe to run multiple times)
          db.run("ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'general'", (err) => {
            if (err) {
              // Ignore error if column already exists - this is expected
              if (!err.message.includes('duplicate column name')) {
                console.log('ℹ️  ticket_type column already exists or could not be added');
              }
            } else {
              console.log('✅ Added ticket_type column to tickets table');
            }
          });
        }
      });

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
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating payments table:', err);
          reject(err);
        }
      });

      // Admin users table with extended roles
      db.run(`CREATE TABLE IF NOT EXISTS admins (
        admin_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'SUPER_ADMIN', 'EVENT_MANAGER', 'SUPPORT', 'SUPERHERO')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating admins table:', err);
          reject(err);
        } else {
          console.log('✅ Database tables initialized');
          resolve();
        }
      });
    });
  });
}

// Helper functions for database operations with connection checks
const dbOperations = {
  // Check if database is connected
  isConnected: () => isConnected && db,

  // Generic run function
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!db || !isConnected) {
        reject(new Error('Database not connected. Call connectDatabase() first.'));
        return;
      }
      
      db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  },

  // Generic get function
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!db || !isConnected) {
        reject(new Error('Database not connected. Call connectDatabase() first.'));
        return;
      }
      
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Generic all function
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (!db || !isConnected) {
        reject(new Error('Database not connected. Call connectDatabase() first.'));
        return;
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

module.exports = { db, dbOperations, connectDatabase };