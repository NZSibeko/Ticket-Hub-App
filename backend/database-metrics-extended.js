// backend/database-metrics-extended.js - Extended Metrics Schema
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const createExtendedMetricsTables = async (dbOperations) => {
  try {
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

    // Business Metrics Table
    await dbOperations.run(`
      CREATE TABLE IF NOT EXISTS business_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_date TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now')),
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

    // Initialize additional system metrics
    await initializeExtendedSystemMetrics(dbOperations);

    console.log('Extended metrics tables created successfully');
  } catch (error) {
    console.error('Error creating extended metrics tables:', error);
    throw error;
  }
};

const initializeExtendedSystemMetrics = async (dbOperations) => {
  const extendedMetrics = [
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
  ];

  for (const metric of extendedMetrics) {
    try {
      await dbOperations.run(
        `INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [metric.key, metric.value, metric.type, metric.unit, metric.description]
      );
    } catch (error) {
      console.error(`Error inserting extended metric ${metric.key}:`, error);
    }
  }
};

// Collect system resource metrics
const collectSystemResourceMetrics = async (dbOperations) => {
  try {
    const cpuUsage = os.loadavg()[0]; // 1-minute load average
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    // Get disk usage
    const diskStats = await getDiskUsage();
    
    await dbOperations.run(`
      INSERT INTO system_resource_metrics 
      (cpu_usage_percent, memory_usage_percent, memory_used_mb, memory_total_mb, 
       disk_usage_percent, disk_used_gb, disk_total_gb, process_count, load_average)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cpuUsage,
      memoryUsagePercent,
      (usedMem / 1024 / 1024).toFixed(2),
      (totalMem / 1024 / 1024).toFixed(2),
      diskStats.usagePercent,
      diskStats.usedGB,
      diskStats.totalGB,
      os.cpus().length,
      cpuUsage
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
      [diskStats.usagePercent.toFixed(2), 'disk_usage_percent']
    );

  } catch (error) {
    console.error('Error collecting system resource metrics:', error);
  }
};

// Helper function to get disk usage
const getDiskUsage = async () => {
  try {
    const stats = fs.statfs ? await fs.statfs('/') : { bsize: 1, blocks: 1, bfree: 1 };
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bfree;
    const used = total - free;
    const usagePercent = (used / total) * 100;
    
    return {
      usagePercent: usagePercent.toFixed(2),
      usedGB: (used / 1024 / 1024 / 1024).toFixed(2),
      totalGB: (total / 1024 / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    return { usagePercent: '0', usedGB: '0', totalGB: '0' };
  }
};

// Collect business metrics
const collectBusinessMetrics = async (dbOperations) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get tickets sold today
    const ticketsSold = await dbOperations.get(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE DATE(created_at) = DATE('now')
    `);
    
    // Get revenue today
    const revenueToday = await dbOperations.get(`
      SELECT SUM(total_amount) as total FROM payments 
      WHERE DATE(created_at) = DATE('now') AND status = 'completed'
    `);
    
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
    
    // Update business metrics
    await updateBusinessMetric(dbOperations, today, 'tickets_sold', ticketsSold?.count || 0);
    await updateBusinessMetric(dbOperations, today, 'revenue', revenueToday?.total || 0);
    await updateBusinessMetric(dbOperations, today, 'new_users', newUsers?.count || 0);
    await updateBusinessMetric(dbOperations, today, 'events_created', eventsCreated?.count || 0);
    
    // Update system metrics
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(ticketsSold?.count || 0).toString(), 'tickets_sold_today']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(revenueToday?.total || 0).toString(), 'revenue_today']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(newUsers?.count || 0).toString(), 'new_users_today']
    );
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(eventsCreated?.count || 0).toString(), 'events_created_today']
    );
    
  } catch (error) {
    console.error('Error collecting business metrics:', error);
  }
};

const updateBusinessMetric = async (dbOperations, date, type, value) => {
  try {
    await dbOperations.run(`
      INSERT OR REPLACE INTO business_metrics (metric_date, metric_type, metric_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [date, type, value]);
  } catch (error) {
    console.error(`Error updating business metric ${type}:`, error);
  }
};

// Collect API performance metrics
const collectAPIPerformanceMetrics = async (dbOperations) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Get API error rate
    const apiStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests
      FROM api_endpoint_metrics 
      WHERE created_at >= ?
    `, [oneHourAgo]);
    
    if (apiStats.total_requests > 0) {
      const errorRate = ((apiStats.error_requests / apiStats.total_requests) * 100).toFixed(2);
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [errorRate, 'api_error_rate']
      );
    }
    
    // Get average API response time
    const avgResponseTime = await dbOperations.get(`
      SELECT AVG(response_time_ms) as avg_time 
      FROM api_endpoint_metrics 
      WHERE created_at >= ? AND response_time_ms > 0
    `, [oneHourAgo]);
    
    if (avgResponseTime.avg_time) {
      await dbOperations.run(
        `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
        [avgResponseTime.avg_time.toFixed(2), 'avg_api_response_time']
      );
    }
    
  } catch (error) {
    console.error('Error collecting API performance metrics:', error);
  }
};

// Collect user session metrics
const collectUserSessionMetrics = async (dbOperations) => {
  try {
    const activeSessions = await dbOperations.get(`
      SELECT COUNT(*) as count FROM user_session_metrics 
      WHERE end_time IS NULL 
      AND datetime(start_time) > datetime('now', '-30 minutes')
    `);
    
    await dbOperations.run(
      `UPDATE system_metrics SET metric_value = ?, updated_at = datetime('now') WHERE metric_key = ?`,
      [(activeSessions?.count || 0).toString(), 'active_sessions']
    );
    
    // Calculate average session duration for last hour
    const sessionStats = await dbOperations.get(`
      SELECT AVG(duration_seconds) as avg_duration 
      FROM user_session_metrics 
      WHERE end_time IS NOT NULL 
      AND datetime(start_time) > datetime('now', '-1 hour')
    `);
    
    if (sessionStats.avg_duration) {
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

// Start extended metrics collection
const startExtendedMetricsCollection = async (dbOperations) => {
  console.log('Starting extended metrics collection...');
  
  // Run initial collection
  await collectSystemResourceMetrics(dbOperations);
  await collectBusinessMetrics(dbOperations);
  await collectAPIPerformanceMetrics(dbOperations);
  await collectUserSessionMetrics(dbOperations);
  
  // Set up periodic collection
  setInterval(() => collectSystemResourceMetrics(dbOperations), 60000); // Every minute
  setInterval(() => collectBusinessMetrics(dbOperations), 300000); // Every 5 minutes
  setInterval(() => collectAPIPerformanceMetrics(dbOperations), 300000); // Every 5 minutes
  setInterval(() => collectUserSessionMetrics(dbOperations), 300000); // Every 5 minutes
  
  console.log('Extended metrics collection started');
};

module.exports = {
  createExtendedMetricsTables,
  initializeExtendedSystemMetrics,
  collectSystemResourceMetrics,
  collectBusinessMetrics,
  collectAPIPerformanceMetrics,
  collectUserSessionMetrics,
  startExtendedMetricsCollection
};