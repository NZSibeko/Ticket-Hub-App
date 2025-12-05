// backend/database-metrics.js - Metrics Database Schema
const path = require('path');
const fs = require('fs').promises;

const createMetricsTables = async (dbOperations) => {
  try {
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

    // Initialize default metrics
    await initializeDefaultMetrics(dbOperations);

    console.log('Metrics tables created successfully');
  } catch (error) {
    console.error('Error creating metrics tables:', error);
    throw error;
  }
};

const initializeDefaultMetrics = async (dbOperations) => {
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
      await dbOperations.run(
        `INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [metric.key, metric.value, metric.type, metric.unit, metric.description]
      );
    } catch (error) {
      console.error(`Error inserting metric ${metric.key}:`, error);
    }
  }
};

const getDatabaseSize = async () => {
  try {
    const dbPath = path.resolve(__dirname, 'ticket_hub.db');
    const stats = await fs.stat(dbPath);
    return (stats.size / (1024 * 1024)).toFixed(2); // Size in MB
  } catch (error) {
    console.error('Error getting database size:', error);
    return '0';
  }
};

const getTableCounts = async (dbOperations) => {
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

const getTotalRowsCount = async (dbOperations) => {
  try {
    const keyTables = ['customers', 'event_managers', 'admins', 'events', 'tickets'];
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

module.exports = {
  createMetricsTables,
  initializeDefaultMetrics,
  getDatabaseSize,
  getTableCounts,
  getTotalRowsCount
};