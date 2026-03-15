// scripts/initDatabase.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ticketing.db');
const db = new sqlite3.Database(dbPath);

async function initDatabase() {
  try {
    console.log('🔧 Initializing database with default accounts...');

    // Create tables if they don't exist
    await runQuery(`CREATE TABLE IF NOT EXISTS admins (
      admin_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS event_managers (
      manager_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runQuery(`CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      account_status TEXT DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin account
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();
    
    await runQuery(
      `INSERT OR REPLACE INTO admins (admin_id, username, email, password_hash, role) 
       VALUES (?, ?, ?, ?, 'SUPER_ADMIN')`,
      [adminId, 'admin', 'admin@tickethub.co.za', adminPassword]
    );

    // Create default event manager account
    const managerPassword = await bcrypt.hash('manager123', 10);
    const managerId = uuidv4();
    
    await runQuery(
      `INSERT OR REPLACE INTO event_managers (manager_id, username, email, password_hash, first_name, last_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [managerId, 'eventmanager', 'manager@tickethub.co.za', managerPassword, 'Event', 'Manager']
    );

    // Create default customer account
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerId = uuidv4();
    
    await runQuery(
      `INSERT OR REPLACE INTO customers (customer_id, first_name, last_name, email, password_hash) 
       VALUES (?, ?, ?, ?, ?)`,
      [customerId, 'John', 'Doe', 'customer@tickethub.co.za', customerPassword]
    );

    console.log('✅ Default accounts created successfully!');
    console.log('\n📋 DEFAULT LOGIN CREDENTIALS:');
    console.log('┌─────────────────┬──────────────────────┬─────────────┐');
    console.log('│ Role            │ Username/Email       │ Password    │');
    console.log('├─────────────────┼──────────────────────┼─────────────┤');
    console.log('│ Admin           │ admin                │ admin123    │');
    console.log('│ Event Manager   │ eventmanager         │ manager123  │');
    console.log('│ Customer        │ customer@tickethub...│ customer123 │');
    console.log('└─────────────────┴──────────────────────┴─────────────┘');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    db.close();
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

initDatabase();