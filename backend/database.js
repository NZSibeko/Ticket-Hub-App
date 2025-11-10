const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'ticketing.db');
let db = null;
let isConnected = false;

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

// Initialize database tables
async function initDatabase() {
  try {
    console.log('🔧 Initializing database tables...');

    // Create or update tickets table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      qr_code TEXT UNIQUE NOT NULL,
      ticket_status TEXT DEFAULT 'PURCHASED',
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      validation_date DATETIME,
      price DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'ZAR',
      payment_status TEXT DEFAULT 'PENDING',
      ticket_type TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (event_id),
      FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    )`);

    // Users/Customers table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS customers (
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
    console.log('✅ Customers table created/verified');

    // Events table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS events (
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
    console.log('✅ Events table created/verified');

    // Event Ticket Types table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS event_ticket_types (
      ticket_type_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      available_quantity INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    )`);
    console.log('✅ Event ticket types table created/verified');

    // Tickets table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS tickets (
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
    )`);
    console.log('✅ Tickets table created/verified');

    // Try to add ticket_type column if it doesn't exist (safe to run multiple times)
    try {
      await dbOperations.run("ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'general'");
      console.log('✅ Added ticket_type column to tickets table');
    } catch (err) {
      // Ignore error if column already exists
      if (err.message.includes('duplicate column name')) {
        console.log('ℹ️  ticket_type column already exists');
      }
    }

    // Payments table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS payments (
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
    console.log('✅ Payments table created/verified');

    // Admin users table with extended roles
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'SUPER_ADMIN', 'EVENT_MANAGER', 'SUPPORT', 'SUPERHERO')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Admins table created/verified');

    // Event Managers table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS event_managers (
      manager_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )`);
    console.log('✅ Event managers table created/verified');

    // Safely add ticket_type column if it doesn't exist
    try {
      await dbOperations.run("ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'general'");
      console.log('✅ Added ticket_type column to tickets table');
    } catch (alterError) {
      if (alterError.code === 'SQLITE_ERROR' && alterError.message.includes('duplicate column name')) {
        console.log('ℹ️ ticket_type column already exists, skipping...');
      } else {
        throw alterError;
      }
    }

    // Create indexes for event_managers
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_event_managers_email ON event_managers(email)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_event_managers_username ON event_managers(username)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_event_managers_status ON event_managers(status)');
    console.log('✅ Event managers indexes created/verified');

    console.log('✅ All database tables initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

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

// Helper function to ensure default event manager exists
async function ensureDefaultEventManager(bcrypt, uuidv4) {
  try {
    console.log('🔍 Checking for default event manager...');
    
    const existing = await dbOperations.get(
      'SELECT * FROM event_managers WHERE username = ?',
      ['eventmanager']
    );

    if (!existing) {
      console.log('📝 Creating default event manager account...');
      
      const passwordHash = await bcrypt.hash('eventmanager123', 10);
      const managerId = uuidv4();
      
      await dbOperations.run(
        `INSERT INTO event_managers (
          manager_id, username, email, password_hash, 
          first_name, last_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          managerId,
          'eventmanager',
          'manager@tickethub.co.za',
          passwordHash,
          'Event',
          'Manager'
        ]
      );

      console.log('✅ Default event manager created successfully');
      console.log('┌────────────────────────────────────────────┐');
      console.log('│  DEFAULT EVENT MANAGER CREDENTIALS         │');
      console.log('├────────────────────────────────────────────┤');
      console.log('│  Username: eventmanager                    │');
      console.log('│  Email: manager@tickethub.co.za            │');
      console.log('│  Password: eventmanager123                 │');
      console.log('├────────────────────────────────────────────┤');
      console.log('│  ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!   │');
      console.log('└────────────────────────────────────────────┘');
    } else {
      console.log('ℹ️  Default event manager already exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring default event manager:', error);
    throw error;
  }
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }

    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
        reject(err);
      } else {
        console.log('✅ Database connection closed');
        db = null;
        isConnected = false;
        resolve();
      }
    });
  });
}

// Export everything
module.exports = { 
  db, 
  dbOperations, 
  connectDatabase,
  closeDatabase,
  ensureDefaultEventManager 
};