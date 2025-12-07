// backend/database.js - FIXED BUSINESS_METRICS TABLE ISSUE
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

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

// Fix business_metrics table by recreating it with updated_at column
const fixBusinessMetricsTable = async () => {
  try {
    // Check if business_metrics table exists
    const tableExists = await dbOperations.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='business_metrics'`
    );
    
    if (tableExists) {
      // Check if updated_at column exists
      const tableInfo = await dbOperations.all(
        `PRAGMA table_info(business_metrics)`
      );
      
      const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
      
      if (!hasUpdatedAt) {
        console.log('Fixing business_metrics table by recreating it...');
        
        // Create a backup of existing data
        const existingData = await dbOperations.all(
          `SELECT * FROM business_metrics`
        );
        
        // Drop the old table
        await dbOperations.run(`DROP TABLE IF EXISTS business_metrics_backup`);
        
        // Create backup table
        await dbOperations.run(`
          CREATE TABLE IF NOT EXISTS business_metrics_backup AS 
          SELECT * FROM business_metrics
        `);
        
        // Drop the old table
        await dbOperations.run(`DROP TABLE IF EXISTS business_metrics`);
        
        // Recreate the table with correct schema
        await dbOperations.run(`
          CREATE TABLE IF NOT EXISTS business_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_date TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_unit TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(metric_date, metric_type)
          )
        `);
        
        // Restore data if any existed
        if (existingData && existingData.length > 0) {
          console.log(`Restoring ${existingData.length} records to business_metrics table`);
          for (const row of existingData) {
            try {
              await dbOperations.run(`
                INSERT INTO business_metrics 
                (metric_date, metric_type, metric_value, metric_unit, details, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
              `, [
                row.metric_date,
                row.metric_type,
                row.metric_value,
                row.metric_unit || null,
                row.details || null,
                row.created_at
              ]);
            } catch (insertError) {
              console.log('Skipping duplicate record:', insertError.message);
            }
          }
        }
        
        console.log('business_metrics table fixed successfully');
      } else {
        console.log('business_metrics table already has updated_at column');
      }
    } else {
      console.log('business_metrics table does not exist yet, will be created');
    }
  } catch (error) {
    console.error('Error fixing business_metrics table:', error);
  }
};

// ========================
// CREATE ALL TABLES — WITH ALL METRICS TABLES
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
  
  // Tickets table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      event_id INTEGER NOT NULL,
      customer_id TEXT NOT NULL,
      ticket_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'confirmed',
      purchase_date TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(event_id),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )
  `);

  // Payments table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'ZAR',
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      transaction_id TEXT,
      receipt_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
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
  // CORE METRICS TABLES
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

  // ========================
  // EXTENDED METRICS TABLES
  // ========================

  // API Endpoint Performance Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS api_endpoint_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      user_agent TEXT,
      user_id TEXT,
      ip_address TEXT,
      request_size INTEGER,
      response_size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Database Query Performance Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS query_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_hash TEXT NOT NULL,
      query_text TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      table_name TEXT,
      rows_affected INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // System Resource Usage Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_resource_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpu_usage_percent REAL,
      memory_usage_percent REAL,
      memory_used_mb REAL,
      memory_total_mb REAL,
      disk_usage_percent REAL,
      disk_used_gb REAL,
      disk_total_gb REAL,
      network_rx_mb REAL,
      network_tx_mb REAL,
      process_count INTEGER,
      load_average REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Business Metrics Table (CORRECTED with updated_at column)
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS business_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metric_unit TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(metric_date, metric_type)
    )
  `);

  // User Session Metrics Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS user_session_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      page_views INTEGER DEFAULT 0,
      user_agent TEXT,
      ip_address TEXT,
      country TEXT,
      device_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Event Performance Metrics Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS event_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      total_views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      tickets_sold INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_id, date)
    )
  `);

  // Cache Performance Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS cache_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT NOT NULL,
      hit_count INTEGER DEFAULT 0,
      miss_count INTEGER DEFAULT 0,
      size_bytes INTEGER,
      ttl_seconds INTEGER,
      last_accessed TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

// Replace this section in database.js:
const ensureAllTables = async () => {
  // Create tickets table if it doesn't exist
  try {
    await dbOperations.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        ticket_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        ticket_type TEXT,
        quantity INTEGER DEFAULT 1,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES events(event_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      )
    `);
    console.log('Tickets table verified');
  } catch (error) {
    console.log('Tickets table already exists or error:', error.message);
  }
  
  // Create payments table if it doesn't exist
  try {
    await dbOperations.run(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'ZAR',
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      )
    `);
    console.log('Payments table verified');
  } catch (error) {
    console.log('Payments table already exists or error:', error.message);
  }
 };

// Fix the business_metrics table if it exists with wrong schema
await fixBusinessMetricsTable();

// Initialize default metrics
await initializeAllMetrics();

// Initialize default dashboard metrics
await initializeDefaultDashboardMetrics();

// Call ensureAllTables function
await ensureAllTables(); // Add this line

console.log('All tables created/verified — including all metrics tables');
};

// Update the initializeAllMetrics function to handle existing metrics
const initializeAllMetrics = async () => {
  const allMetrics = [
    // Core metrics
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
    
    // Extended metrics - only add if they don't exist
    { key: 'api_error_rate', value: '0', type: 'gauge', unit: '%', description: 'API error rate (4xx/5xx responses)' },
    { key: 'avg_api_response_time', value: '0', type: 'gauge', unit: 'ms', description: 'Average API response time' },
    { key: 'active_sessions', value: '0', type: 'gauge', unit: 'count', description: 'Active user sessions' },
    { key: 'concurrent_users', value: '0', type: 'gauge', unit: 'count', description: 'Concurrent users' },
    { key: 'cpu_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'CPU usage percentage' },
    { key: 'memory_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'Memory usage percentage' },
    { key: 'disk_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'Disk usage percentage' },
    { key: 'tickets_sold_today', value: '0', type: 'counter', unit: 'count', description: 'Tickets sold today' },
    { key: 'revenue_today', value: '0', type: 'counter', unit: 'ZAR', description: 'Revenue generated today' },
    { key: 'new_users_today', value: '0', type: 'counter', unit: 'count', description: 'New users registered today' },
    { key: 'events_created_today', value: '0', type: 'counter', unit: 'count', description: 'Events created today' },
    { key: 'avg_session_duration', value: '0', type: 'gauge', unit: 'min', description: 'Average user session duration' },
    { key: 'cache_hit_rate', value: '0', type: 'gauge', unit: '%', description: 'Cache hit rate' },
    { key: 'database_connections', value: '0', type: 'gauge', unit: 'count', description: 'Active database connections' },
    { key: 'slow_queries_count', value: '0', type: 'counter', unit: 'count', description: 'Slow queries count' },
    { key: 'total_events', value: '0', type: 'gauge', unit: 'count', description: 'Total events in system' },
    { key: 'active_events', value: '0', type: 'gauge', unit: 'count', description: 'Active events' },
    { key: 'pending_events', value: '0', type: 'gauge', unit: 'count', description: 'Pending event approvals' },
    { key: 'total_tickets', value: '0', type: 'gauge', unit: 'count', description: 'Total tickets sold' },
    { key: 'total_revenue', value: '0', type: 'gauge', unit: 'ZAR', description: 'Total revenue generated' },
    { key: 'user_growth_rate', value: '0', type: 'gauge', unit: '%', description: 'User growth rate (weekly)' },
    { key: 'event_growth_rate', value: '0', type: 'gauge', unit: '%', description: 'Event growth rate (weekly)' },
    { key: 'ticket_conversion_rate', value: '0', type: 'gauge', unit: '%', description: 'Ticket conversion rate' },
    { key: 'avg_ticket_price', value: '0', type: 'gauge', unit: 'ZAR', description: 'Average ticket price' },
    { key: 'peak_concurrent_users', value: '0', type: 'gauge', unit: 'count', description: 'Peak concurrent users (today)' },
    { key: 'api_requests_per_minute', value: '0', type: 'gauge', unit: 'req/min', description: 'API requests per minute' },
    { key: 'database_query_rate', value: '0', type: 'gauge', unit: 'queries/sec', description: 'Database queries per second' },
    { key: 'cache_efficiency', value: '0', type: 'gauge', unit: '%', description: 'Cache efficiency rate' },
    { key: 'error_rate_5xx', value: '0', type: 'gauge', unit: '%', description: 'Server error rate (5xx)' },
    { key: 'error_rate_4xx', value: '0', type: 'gauge', unit: '%', description: 'Client error rate (4xx)' },
    { key: 'avg_page_load_time', value: '0', type: 'gauge', unit: 'ms', description: 'Average page load time' },
    { key: 'user_retention_rate', value: '0', type: 'gauge', unit: '%', description: 'User retention rate (30 days)' },
    { key: 'event_attendance_rate', value: '0', type: 'gauge', unit: '%', description: 'Event attendance rate' },
    { key: 'ticket_refund_rate', value: '0', type: 'gauge', unit: '%', description: 'Ticket refund rate' },
    { key: 'support_tickets_open', value: '0', type: 'gauge', unit: 'count', description: 'Open support tickets' },
    { key: 'support_tickets_resolved', value: '0', type: 'counter', unit: 'count', description: 'Resolved support tickets (today)' },
    { key: 'avg_resolution_time', value: '0', type: 'gauge', unit: 'hours', description: 'Average ticket resolution time' },
  ];

  for (const metric of allMetrics) {
    try {
      // Use INSERT OR IGNORE to avoid duplicate errors
      await dbOperations.run(
        `INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [metric.key, metric.value, metric.type, metric.unit, metric.description]
      );
    } catch (error) {
      // If INSERT OR IGNORE fails, try to update existing
      try {
        await dbOperations.run(
          `UPDATE system_metrics 
           SET metric_value = ?, metric_type = ?, unit = ?, description = ?, updated_at = datetime('now')
           WHERE metric_key = ?`,
          [metric.value, metric.type, metric.unit, metric.description, metric.key]
        );
      } catch (updateError) {
        console.error(`Error updating metric ${metric.key}:`, updateError.message);
      }
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
    const keyTables = ['customers', 'event_managers', 'admins', 'events', 'tickets', 'payments'];
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

// Collect system resource metrics
const collectSystemResourceMetrics = async () => {
  try {
    const cpuUsage = os.loadavg()[0]; // 1-minute load average
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    // Get disk usage
    let diskStats = { usagePercent: '0', usedGB: '0', totalGB: '0' };
    try {
      if (fs.statfs) {
        const stats = await fs.statfs('/');
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bfree;
        const used = total - free;
        const usagePercent = (used / total) * 100;
        diskStats = {
          usagePercent: usagePercent.toFixed(2),
          usedGB: (used / 1024 / 1024 / 1024).toFixed(2),
          totalGB: (total / 1024 / 1024 / 1024).toFixed(2)
        };
      }
    } catch (diskError) {
      console.log('Disk stats not available:', diskError.message);
    }
    
    await dbOperations.run(`
      INSERT INTO system_resource_metrics 
      (cpu_usage_percent, memory_usage_percent, memory_used_mb, memory_total_mb, 
       disk_usage_percent, disk_used_gb, disk_total_gb, process_count, load_average)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cpuUsage.toFixed(2),
      memoryUsagePercent.toFixed(2),
      (usedMem / 1024 / 1024).toFixed(2),
      (totalMem / 1024 / 1024).toFixed(2),
      diskStats.usagePercent,
      diskStats.usedGB,
      diskStats.totalGB,
      os.cpus().length,
      cpuUsage.toFixed(2)
    ]);

    // Update system metrics
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [cpuUsage.toFixed(2), 'cpu_usage_percent']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [memoryUsagePercent.toFixed(2), 'memory_usage_percent']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [diskStats.usagePercent, 'disk_usage_percent']
    );

  } catch (error) {
    console.error('Error collecting system resource metrics:', error);
  }
};

// Update collectBusinessMetrics to handle missing tables
const collectBusinessMetrics = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize counts
    let ticketsSoldToday = 0;
    let revenueToday = 0;
    let totalTickets = 0;
    let totalRevenue = 0;
    
    // Check if tickets table exists
    try {
      const ticketsTableExists = await dbOperations.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'`
      );
      
      if (ticketsTableExists) {
        // Get tickets sold today
        const ticketsSold = await dbOperations.get(`
          SELECT COUNT(*) as count FROM tickets 
          WHERE DATE(created_at) = DATE('now')
        `);
        ticketsSoldToday = ticketsSold?.count || 0;
        
        // Get total tickets
        const totalTicketsRes = await dbOperations.get(`SELECT COUNT(*) as count FROM tickets`);
        totalTickets = totalTicketsRes?.count || 0;
      }
    } catch (ticketError) {
      console.log('Tickets table not found, skipping ticket metrics');
    }
    
    // Check if payments table exists
    try {
      const paymentsTableExists = await dbOperations.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='payments'`
      );
      
      if (paymentsTableExists) {
        // Get revenue today
        const revenueTodayRes = await dbOperations.get(`
          SELECT SUM(total_amount) as total FROM payments 
          WHERE DATE(created_at) = DATE('now') AND status = 'completed'
        `);
        revenueToday = revenueTodayRes?.total || 0;
        
        // Get total revenue
        const totalRevenueRes = await dbOperations.get(`
          SELECT SUM(total_amount) as total FROM payments WHERE status = 'completed'
        `);
        totalRevenue = totalRevenueRes?.total || 0;
      }
    } catch (paymentError) {
      console.log('Payments table not found, skipping revenue metrics');
    }
    
    // Get new users today
    const newUsers = await dbOperations.get(`
      SELECT COUNT(*) as count FROM (
        SELECT customer_id FROM customers WHERE DATE(created_at) = DATE('now')
        UNION ALL
        SELECT manager_id FROM event_managers WHERE DATE(created_at) = DATE('now')
        UNION ALL
        SELECT admin_id FROM admins WHERE DATE(created_at) = DATE('now')
      )
    `);
    
    // Get events created today
    const eventsCreated = await dbOperations.get(`
      SELECT COUNT(*) as count FROM events 
      WHERE DATE(created_at) = DATE('now')
    `);
    
    // Get total events
    const totalEvents = await dbOperations.get(`SELECT COUNT(*) as count FROM events`);
    const activeEvents = await dbOperations.get(`
      SELECT COUNT(*) as count FROM events 
      WHERE status = 'ACTIVE' OR status = 'active'
    `);
    const pendingEvents = await dbOperations.get(`
      SELECT COUNT(*) as count FROM events 
      WHERE status = 'PENDING' OR status = 'pending'
    `);
    
    // Update business metrics table
    await updateBusinessMetric(today, 'tickets_sold', ticketsSoldToday);
    await updateBusinessMetric(today, 'revenue', revenueToday);
    await updateBusinessMetric(today, 'new_users', newUsers?.count || 0);
    await updateBusinessMetric(today, 'events_created', eventsCreated?.count || 0);
    
    // Update all system metrics
    const metricUpdates = [
      ['tickets_sold_today', ticketsSoldToday.toString()],
      ['revenue_today', revenueToday.toString()],
      ['new_users_today', (newUsers?.count || 0).toString()],
      ['events_created_today', (eventsCreated?.count || 0).toString()],
      ['total_events', (totalEvents?.count || 0).toString()],
      ['active_events', (activeEvents?.count || 0).toString()],
      ['pending_events', (pendingEvents?.count || 0).toString()],
      ['total_tickets', totalTickets.toString()],
      ['total_revenue', totalRevenue.toString()]
    ];
    
    for (const [key, value] of metricUpdates) {
      try {
        await dbOperations.run(
          `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
          [value, key]
        );
      } catch (error) {
        console.log(`Metric ${key} not found, skipping update`);
      }
    }
    
  } catch (error) {
    console.error('Error collecting business metrics:', error.message);
  }
};

// SAFE: updateBusinessMetric with fallback for missing updated_at column
const updateBusinessMetricSafe = async (date, type, value) => {
  try {
    // Try with updated_at first
    try {
      await dbOperations.run(`
        INSERT OR REPLACE INTO business_metrics (metric_date, metric_type, metric_value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `, [date, type, value]);
    } catch (error) {
      // If updated_at column doesn't exist, try without it
      if (error.message.includes('no such column: updated_at')) {
        await dbOperations.run(`
          INSERT OR REPLACE INTO business_metrics (metric_date, metric_type, metric_value)
          VALUES (?, ?, ?)
        `, [date, type, value]);
      } else {
        // If it's a UNIQUE constraint error, try UPDATE instead
        if (error.message.includes('UNIQUE constraint failed')) {
          await dbOperations.run(`
            UPDATE business_metrics SET metric_value = ? 
            WHERE metric_date = ? AND metric_type = ?
          `, [value, date, type]);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    // Silent fail for business metrics - don't crash the whole metrics collection
    console.log(`Note: Could not update business metric ${type}:`, error.message);
  }
};

// Collect API performance metrics
const collectAPIPerformanceMetrics = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Get API error rate
    const apiStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests,
        SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as server_errors,
        SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) as client_errors
      FROM api_endpoint_metrics 
      WHERE created_at >= ?
    `, [oneHourAgo]);
    
    if (apiStats && apiStats.total_requests > 0) {
      const errorRate = ((apiStats.error_requests / apiStats.total_requests) * 100).toFixed(2);
      const serverErrorRate = ((apiStats.server_errors / apiStats.total_requests) * 100).toFixed(2);
      const clientErrorRate = ((apiStats.client_errors / apiStats.total_requests) * 100).toFixed(2);
      
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [errorRate, 'api_error_rate']
      );
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [serverErrorRate, 'error_rate_5xx']
      );
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [clientErrorRate, 'error_rate_4xx']
      );
    }
    
    // Get average API response time
    const avgResponseTime = await dbOperations.get(`
      SELECT AVG(response_time_ms) as avg_time 
      FROM api_endpoint_metrics 
      WHERE created_at >= ? AND response_time_ms > 0
    `, [oneHourAgo]);
    
    if (avgResponseTime && avgResponseTime.avg_time) {
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [avgResponseTime.avg_time.toFixed(2), 'avg_api_response_time']
      );
    }
    
    // Get API requests per minute
    const requestsPerMinute = await dbOperations.get(`
      SELECT COUNT(*) as count 
      FROM api_endpoint_metrics 
      WHERE created_at >= datetime('now', '-1 minute')
    `);
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(requestsPerMinute?.count || 0).toString(), 'api_requests_per_minute']
    );
    
  } catch (error) {
    console.error('Error collecting API performance metrics:', error);
  }
};

// Collect user session metrics
const collectUserSessionMetrics = async () => {
  try {
    // Get active sessions (sessions that started in last 30 minutes and haven't ended)
    const activeSessions = await dbOperations.get(`
      SELECT COUNT(*) as count FROM user_session_metrics 
      WHERE end_time IS NULL 
      AND datetime(start_time) > datetime('now', '-30 minutes')
    `);
    
    // Get peak concurrent users today
    const peakConcurrent = await dbOperations.get(`
      SELECT MAX(concurrent_count) as peak FROM (
        SELECT COUNT(*) as concurrent_count 
        FROM user_session_metrics 
        WHERE date(start_time) = date('now')
        AND datetime(start_time) > datetime('now', '-1 day')
        GROUP BY strftime('%H', start_time)
      )
    `);
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(activeSessions?.count || 0).toString(), 'active_sessions']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(peakConcurrent?.peak || activeSessions?.count || 0).toString(), 'peak_concurrent_users']
    );
    
    // Calculate average session duration for last hour
    const sessionStats = await dbOperations.get(`
      SELECT AVG(duration_seconds) as avg_duration 
      FROM user_session_metrics 
      WHERE end_time IS NOT NULL 
      AND datetime(start_time) > datetime('now', '-1 hour')
    `);
    
    if (sessionStats && sessionStats.avg_duration) {
      const avgMinutes = (sessionStats.avg_duration / 60).toFixed(1);
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [avgMinutes, 'avg_session_duration']
      );
    }
    
  } catch (error) {
    console.error('Error collecting user session metrics:', error);
  }
};

// Collect database performance metrics
const collectDatabasePerformanceMetrics = async () => {
  try {
    // Get slow queries count (queries > 100ms in last hour)
    const slowQueries = await dbOperations.get(`
      SELECT COUNT(*) as count FROM query_performance_metrics 
      WHERE execution_time_ms > 100 
      AND created_at >= datetime('now', '-1 hour')
    `);
    
    // Get database query rate (queries per second)
    const queryRate = await dbOperations.get(`
      SELECT COUNT(*) as count FROM query_performance_metrics 
      WHERE created_at >= datetime('now', '-1 minute')
    `);
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(slowQueries?.count || 0).toString(), 'slow_queries_count']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(queryRate?.count || 0).toString(), 'database_query_rate']
    );
    
  } catch (error) {
    console.error('Error collecting database performance metrics:', error);
  }
};

// Calculate growth rates
const calculateGrowthRates = async () => {
  try {
    // Calculate user growth rate (last 7 days vs previous 7 days)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const recentUsers = await dbOperations.get(`
      SELECT COUNT(*) as count FROM (
        SELECT customer_id FROM customers WHERE created_at >= ?
        UNION ALL
        SELECT manager_id FROM event_managers WHERE created_at >= ?
        UNION ALL
        SELECT admin_id FROM admins WHERE created_at >= ?
      )
    `, [oneWeekAgo, oneWeekAgo, oneWeekAgo]);
    
    const previousUsers = await dbOperations.get(`
      SELECT COUNT(*) as count FROM (
        SELECT customer_id FROM customers WHERE created_at >= ? AND created_at < ?
        UNION ALL
        SELECT manager_id FROM event_managers WHERE created_at >= ? AND created_at < ?
        UNION ALL
        SELECT admin_id FROM admins WHERE created_at >= ? AND created_at < ?
      )
    `, [twoWeeksAgo, oneWeekAgo, twoWeeksAgo, oneWeekAgo, twoWeeksAgo, oneWeekAgo]);
    
    let userGrowthRate = 0;
    if (previousUsers && previousUsers.count > 0) {
      userGrowthRate = ((recentUsers.count - previousUsers.count) / previousUsers.count) * 100;
    } else if (recentUsers && recentUsers.count > 0) {
      userGrowthRate = 100;
    }
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [userGrowthRate.toFixed(2), 'user_growth_rate']
    );
    
    // Calculate event growth rate
    const recentEvents = await dbOperations.get(`
      SELECT COUNT(*) as count FROM events WHERE created_at >= ?
    `, [oneWeekAgo]);
    
    const previousEvents = await dbOperations.get(`
      SELECT COUNT(*) as count FROM events WHERE created_at >= ? AND created_at < ?
    `, [twoWeeksAgo, oneWeekAgo]);
    
    let eventGrowthRate = 0;
    if (previousEvents && previousEvents.count > 0) {
      eventGrowthRate = ((recentEvents.count - previousEvents.count) / previousEvents.count) * 100;
    } else if (recentEvents && recentEvents.count > 0) {
      eventGrowthRate = 100;
    }
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [eventGrowthRate.toFixed(2), 'event_growth_rate']
    );
    
  } catch (error) {
    console.error('Error calculating growth rates:', error);
  }
};

// Main update system metrics function
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

    // Run extended metrics collection
    await collectSystemResourceMetrics();
    await collectBusinessMetrics();
    await collectAPIPerformanceMetrics();
    await collectUserSessionMetrics();
    await collectDatabasePerformanceMetrics();
    await calculateGrowthRates();

    console.log('All system metrics updated successfully');
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

// Add this function to database.js (somewhere near other initialization functions):
const ensureMetricsTables = async () => {
  console.log('Ensuring metrics tables exist...');
  
  const tables = [
    // Core metrics tables
    `CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE NOT NULL,
      metric_value TEXT NOT NULL,
      metric_type TEXT DEFAULT 'gauge',
      unit TEXT,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER,
      request_size INTEGER,
      response_size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      user_id TEXT,
      user_email TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE IF NOT EXISTS system_alerts (
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
    )`,
    
    `CREATE TABLE IF NOT EXISTS user_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_email TEXT,
      activity_type TEXT NOT NULL,
      activity_details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    
    `CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by TEXT DEFAULT 'system',
      attempts INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`
  ];
  
  for (const tableSql of tables) {
    try {
      await dbOperations.run(tableSql);
    } catch (error) {
      console.error(`Error creating table: ${error.message}`);
    }
  }
  
  console.log('Metrics tables verified');
};

const createAllMetricsTables = async () => {
  console.log('Creating comprehensive metrics tables...');
  
  // 1. System Resource Metrics Table
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_resource_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpu_usage_percent REAL DEFAULT 0,
      memory_usage_percent REAL DEFAULT 0,
      memory_used_mb REAL DEFAULT 0,
      memory_total_mb REAL DEFAULT 0,
      disk_usage_percent REAL DEFAULT 0,
      disk_used_gb REAL DEFAULT 0,
      disk_total_gb REAL DEFAULT 0,
      network_rx_mb REAL DEFAULT 0,
      network_tx_mb REAL DEFAULT 0,
      process_count INTEGER DEFAULT 0,
      load_average REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 2. API Performance Metrics
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS api_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      user_agent TEXT,
      user_id TEXT,
      ip_address TEXT,
      request_size INTEGER DEFAULT 0,
      response_size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 3. Database Query Performance
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS database_query_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_hash TEXT NOT NULL,
      query_text TEXT,
      execution_time_ms INTEGER NOT NULL,
      table_name TEXT,
      rows_affected INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 4. User Session Metrics
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS user_session_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      user_agent TEXT,
      ip_address TEXT,
      country TEXT,
      device_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 5. Event Performance Metrics
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS event_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      event_name TEXT NOT NULL,
      total_views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      tickets_sold INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(event_id),
      UNIQUE(event_id, date)
    )
  `);
  
  // 6. Cache Performance Metrics
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS cache_performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT NOT NULL,
      hit_count INTEGER DEFAULT 0,
      miss_count INTEGER DEFAULT 0,
      size_bytes INTEGER DEFAULT 0,
      ttl_seconds INTEGER DEFAULT 0,
      last_accessed TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 7. Business Metrics (Enhanced)
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS business_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metric_unit TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(metric_date, metric_type)
    )
  `);
  
  // 8. System Configuration Logs
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS system_config_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT NOT NULL,
      changed_by TEXT,
      change_type TEXT DEFAULT 'update',
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 9. Email/SMS Notification Logs
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // 10. Backup Logs (Enhanced)
  await dbOperations.run(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_type TEXT NOT NULL,
      filename TEXT,
      size_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      details TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  console.log('✓ All comprehensive metrics tables created');
};

// ========================
// RUN INITIALIZATION
// ========================
// Update the initialization section
(async () => {
  try {
    await initializeTables();
    //await ensureAllTables(); // Add this line
    await addStatusToUserTables();
    await addLastLoginToUserTables();
    await addPhoneToAdmins();
    await updateEventsTable();
    await ensureMetricsTables(); 
    await createAllMetricsTables();
    
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
  fixBusinessMetricsTable,
  collectSystemResourceMetrics,
  collectBusinessMetrics,
  collectAPIPerformanceMetrics,
  collectUserSessionMetrics,
  collectDatabasePerformanceMetrics,
  calculateGrowthRates
};