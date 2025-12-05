// backend/database.js - FINAL WITH METRICS TABLES & STATUS COLUMNS & LAST_LOGIN
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

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
// MIGRATION FUNCTIONS
// ========================

// Add missing columns to existing tables
const migrateMetricsTables = async () => {
  try {
    // Check if system_metrics table exists and add missing columns
    const tableInfo = await dbOperations.all(
      `PRAGMA table_info(system_metrics)`
    );
    
    const existingColumns = tableInfo.map(col => col.name);
    
    // Add missing columns
    const columnsToAdd = [
      { name: 'description', type: 'TEXT' },
      { name: 'metric_type', type: 'TEXT DEFAULT "gauge"' },
      { name: 'unit', type: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        try {
          await dbOperations.run(
            `ALTER TABLE system_metrics ADD COLUMN ${column.name} ${column.type}`
          );
          console.log(`Added column ${column.name} to system_metrics table`);
        } catch (err) {
          if (!err.message.includes('duplicate column name')) {
            console.error(`Error adding column ${column.name}:`, err);
          }
        }
      }
    }
    
    console.log('Metrics table migration completed');
  } catch (error) {
    // Table might not exist yet, that's ok
    console.log('Metrics table migration check:', error.message);
  }
};

// ========================
// CREATE ALL TABLES — WITH METRICS TABLES
// ========================
const initializeTables = async () => {
  // Existing user tables
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

  // Events table
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

  // ========================
  // METRICS TABLES
  // ========================
  
  // System Metrics Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE NOT NULL,
      metric_value TEXT NOT NULL,
      metric_type TEXT DEFAULT 'gauge',
      unit TEXT,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Performance Metrics Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER,
      request_size INTEGER,
      response_size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Security Logs Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      user_id TEXT,
      user_email TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // System Alerts Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      source_module TEXT,
      affected_items TEXT,
      recommendations TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // User Activity Logs Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS user_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_email TEXT,
      activity_type TEXT NOT NULL,
      activity_details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Blocked IPs Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by TEXT DEFAULT 'system',
      attempts INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Backup History Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_type TEXT DEFAULT 'automatic',
      status TEXT NOT NULL,
      size_mb REAL,
      duration_seconds INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // System Uptime Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_uptime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      status TEXT DEFAULT 'up',
      last_check TEXT,
      response_time_ms INTEGER,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Run migrations for existing tables
  await migrateMetricsTables();
  
  // Initialize default metrics
  await initializeDefaultMetrics();
  
  // Initialize default dashboard metrics
  await initializeDefaultDashboardMetrics();

  console.log('All tables created/verified — including metrics tables');
};

// Initialize default system metrics (without description for now)
const initializeDefaultMetrics = async () => {
  const defaultMetrics = [
    { key: 'system_uptime_days', value: '0', type: 'counter', unit: 'days', description: 'System uptime in days' },
    { key: 'database_uptime_days', value: '0', type: 'counter', unit: 'days', description: 'Database uptime in days' },
    { key: 'database_size_mb', value: '0', type: 'gauge', unit: 'MB', description: 'Database size in megabytes' },
    { key: 'avg_response_time', value: '0', type: 'gauge', unit: 'ms', description: 'Average API response time' },
    { key: 'p95_response_time', value: '0', type: 'gauge', unit: 'ms', description: '95th percentile response time' },
    { key: 'p99_response_time', value: '0', type: 'gauge', unit: 'ms', description: '99th percentile response time' },
    { key: 'failed_login_attempts_24h', value: '0', type: 'counter', unit: 'count', description: 'Failed login attempts in last 24 hours' },
    { key: 'password_resets_24h', value: '0', type: 'counter', unit: 'count', description: 'Password resets in last 24 hours' },
    { key: 'active_blocked_ips', value: '0', type: 'gauge', unit: 'count', description: 'Currently blocked IP addresses' },
    { key: 'security_alerts_24h', value: '0', type: 'counter', unit: 'count', description: 'Security alerts in last 24 hours' },
    { key: 'total_tables', value: '0', type: 'gauge', unit: 'count', description: 'Total database tables' },
    { key: 'total_rows', value: '0', type: 'gauge', unit: 'count', description: 'Total rows across key tables' },
    { key: 'last_system_restart', value: new Date().toISOString(), type: 'timestamp', description: 'Last system restart time' },
    { key: 'last_backup_status', value: 'pending', type: 'status', description: 'Last backup status' },
    { key: 'last_backup_time', value: 'never', type: 'timestamp', description: 'Last backup time' },
    { key: 'backup_success_rate', value: '0', type: 'gauge', unit: '%', description: 'Backup success rate' },
  ];

  for (const metric of defaultMetrics) {
    try {
      // First check if metric already exists
      const existing = await dbOperations.get(
        `SELECT metric_key FROM system_metrics WHERE metric_key = ?`,
        [metric.key]
      );
      
      if (!existing) {
        // Insert without description first (it might not exist)
        try {
          await dbOperations.run(
            `INSERT INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [metric.key, metric.value, metric.type, metric.unit, metric.description]
          );
        } catch (descError) {
          // If description column doesn't exist, insert without it
          await dbOperations.run(
            `INSERT INTO system_metrics (metric_key, metric_value) 
             VALUES (?, ?)`,
            [metric.key, metric.value]
          );
          
          // Try to update other columns if they exist
          try {
            await dbOperations.run(
              `UPDATE system_metrics SET metric_type = ?, unit = ? WHERE metric_key = ?`,
              [metric.type, metric.unit, metric.key]
            );
          } catch (updateError) {
            // Ignore update errors
          }
        }
      } else {
        // Update existing metric
        try {
          await dbOperations.run(
            `UPDATE system_metrics 
             SET metric_value = ?, metric_type = ?, unit = ?, description = ?, updated_at = datetime('now')
             WHERE metric_key = ?`,
            [metric.value, metric.type, metric.unit, metric.description, metric.key]
          );
        } catch (updateError) {
          // Try without description
          try {
            await dbOperations.run(
              `UPDATE system_metrics 
               SET metric_value = ?, updated_at = datetime('now')
               WHERE metric_key = ?`,
              [metric.value, metric.key]
            );
          } catch (simpleError) {
            console.error(`Error updating metric ${metric.key}:`, simpleError.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error with metric ${metric.key}:`, error.message);
    }
  }
};

// Initialize default dashboard metrics
const initializeDefaultDashboardMetrics = async () => {
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
// METRICS HELPER FUNCTIONS
// ========================

const getDatabaseSize = async () => {
  try {
    const stats = await fs.stat(dbPath);
    return (stats.size / (1024 * 1024)).toFixed(2); // Size in MB
  } catch (error) {
    console.error('Error getting database size:', error);
    return '0';
  }
};

const getTableCounts = async () => {
  try {
    const tables = await dbOperations.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    return tables.length;
  } catch (error) {
    console.error('Error getting table count:', error);
    return 0;
  }
};

const getTotalRowsCount = async () => {
  try {
    const keyTables = ['customers', 'event_managers', 'admins', 'events'];
    let totalRows = 0;
    
    for (const tableName of keyTables) {
      try {
        const count = await dbOperations.get(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        totalRows += count?.count || 0;
      } catch (e) {
        // Table might not exist
      }
    }
    
    return totalRows;
  } catch (error) {
    console.error('Error getting total rows count:', error);
    return 0;
  }
};

// Update system metrics periodically
const updateSystemMetrics = async () => {
  try {
    console.log('Updating system metrics...');
    
    // Update database size
    const dbSize = await getDatabaseSize();
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [dbSize, 'database_size_mb']
    );

    // Update table count
    const tableCount = await getTableCounts();
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [tableCount.toString(), 'total_tables']
    );

    // Update total rows
    const totalRows = await getTotalRowsCount();
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [totalRows.toString(), 'total_rows']
    );

    // Update active blocked IPs count
    const blockedIPs = await dbOperations.get(
      `SELECT COUNT(*) as count FROM blocked_ips WHERE is_active = 1`
    );
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [blockedIPs?.count?.toString() || '0', 'active_blocked_ips']
    );

    // Update failed login attempts in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const failedLogins = await dbOperations.get(
      `SELECT COUNT(*) as count FROM security_logs 
       WHERE event_type = 'failed_login' 
       AND created_at >= ?`,
      [twentyFourHoursAgo]
    );
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [failedLogins?.count?.toString() || '0', 'failed_login_attempts_24h']
    );

    // Update password resets in last 24 hours
    const passwordResets = await dbOperations.get(
      `SELECT COUNT(*) as count FROM user_activity_logs 
       WHERE activity_type = 'password_reset' 
       AND created_at >= ?`,
      [twentyFourHoursAgo]
    );
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [passwordResets?.count?.toString() || '0', 'password_resets_24h']
    );

    // Update security alerts in last 24 hours
    const securityAlerts = await dbOperations.get(
      `SELECT COUNT(*) as count FROM system_alerts 
       WHERE severity IN ('high', 'critical') 
       AND created_at >= ?
       AND acknowledged = 0`,
      [twentyFourHoursAgo]
    );
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [securityAlerts?.count?.toString() || '0', 'security_alerts_24h']
    );

    // Update average response time from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const perfMetrics = await dbOperations.all(
      `SELECT response_time_ms FROM performance_metrics 
       WHERE created_at >= ? AND response_time_ms > 0
       LIMIT 100`,
      [oneHourAgo]
    );
    
    if (perfMetrics.length > 0) {
      const total = perfMetrics.reduce((sum, m) => sum + m.response_time_ms, 0);
      const avg = Math.round(total / perfMetrics.length);
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [avg.toString(), 'avg_response_time']
      );
    }

    // Update backup status if any backup exists
    const latestBackup = await dbOperations.get(
      `SELECT status, created_at FROM backup_history 
       ORDER BY created_at DESC LIMIT 1`
    );
    
    if (latestBackup) {
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [latestBackup.status, 'last_backup_status']
      );
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [latestBackup.created_at, 'last_backup_time']
      );
    }

    console.log('System metrics updated successfully');
  } catch (error) {
    console.error('Error updating system metrics:', error);
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
    
    // Start metrics updates every 5 minutes
    setInterval(updateSystemMetrics, 5 * 60 * 1000);
    
    // Initial metrics update (wait 5 seconds for server to be ready)
    setTimeout(updateSystemMetrics, 5000);
    
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
  addLastLoginToUserTables,
  updateSystemMetrics,
  getDatabaseSize,
  getTableCounts,
  getTotalRowsCount,
  migrateMetricsTables
};