const { dbOperations } = require('../database');
const fs = require('fs').promises;
const path = require('path');

class MetricsService {
  constructor() {
    this.startTime = new Date();
    this.metricsUpdateInterval = null;
    this.isRunning = false;
    this.initialized = false;
    console.log('MetricsService constructor called');
  }

  async startMetricsCollection() {
    if (this.initialized) {
      console.log('Metrics service already initialized');
      return;
    }

    if (this.isRunning) {
      console.log('Metrics service already running');
      return;
    }
    
    console.log('Starting metrics collection service...');
    this.isRunning = true;
    
    try {
      // Try to initialize with a timeout
      await this.safeInitialize();
      
      this.initialized = true;
      console.log('✅ Metrics collection service started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start metrics collection:', error.message);
      this.isRunning = false;
      this.initialized = false;
      
      // Start in degraded mode - still run but with minimal functionality
      console.log('⚠ Metrics service running in degraded mode');
      this.startDegradedMode();
    }
  }

  async safeInitialize() {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Metrics initialization timeout after 8 seconds'));
      }, 8000);
      
      try {
        // Quick initialization - skip heavy calculations initially
        console.log('Performing quick initialization...');
        
        // Just set basic metrics without heavy DB queries
        const uptimeMs = new Date() - this.startTime;
        const uptimeDays = (uptimeMs / (1000 * 60 * 60 * 24)).toFixed(2);
        
        // Set basic metrics
        await this.updateMetricSafe('system_uptime_days', uptimeDays);
        await this.updateMetricSafe('last_system_restart', this.startTime.toISOString());
        
        clearTimeout(timeout);
        
        // Start background tasks
        this.startBackgroundTasks();
        
        resolve();
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  startBackgroundTasks() {
    // Start the update interval
    this.metricsUpdateInterval = setInterval(async () => {
      try {
        await this.updateAllMetricsSafe();
      } catch (error) {
        console.error('Background metrics update failed:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Do initial background update after 2 seconds
    setTimeout(async () => {
      try {
        console.log('Running background metrics initialization...');
        await this.calculateInitialMetricsSafe();
        await this.updateAllMetricsSafe();
        console.log('Background metrics initialization complete');
      } catch (error) {
        console.log('Background initialization failed (non-critical):', error.message);
      }
    }, 2000);
  }

  startDegradedMode() {
    // Still mark as running but with minimal functionality
    this.isRunning = true;
    
    // Set basic metrics
    const uptimeMs = new Date() - this.startTime;
    const uptimeDays = (uptimeMs / (1000 * 60 * 60 * 24)).toFixed(2);
    
    // Don't try to update database, just set in memory
    console.log('Degraded mode: Basic metrics only');
    
    // Still run periodic updates but with error handling
    this.metricsUpdateInterval = setInterval(() => {
      console.log('Degraded mode: Skipping metrics update');
    }, 5 * 60 * 1000);
  }

  async calculateInitialMetricsSafe() {
    try {
      // Calculate initial database size
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      if (await this.fileExists(dbPath)) {
        try {
          const stats = await fs.stat(dbPath);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          await this.updateMetricSafe('database_size_mb', sizeMB);
        } catch (error) {
          console.log('Could not get database size:', error.message);
        }
      }
      
    } catch (error) {
      console.log('Initial metrics calculation skipped:', error.message);
    }
  }

  async updateAllMetricsSafe() {
    try {
      if (!this.isRunning) return;
      
      // Run each metric update separately with error handling
      const updates = [
        this.updateUptimeMetrics(),
        this.updateDatabaseMetrics(),
        this.updateResponseTimeMetrics(),
        this.updateSecurityMetrics(),
        this.updateBackupMetrics(),
        this.updateBusinessMetrics()
      ];
      
      // Run all updates, don't fail if some fail
      for (const update of updates) {
        try {
          await update;
        } catch (error) {
          console.log('Metric update failed (continuing):', error.message);
        }
      }
      
      await this.checkAndGenerateAlerts();
      
    } catch (error) {
      console.error('Error in safe metrics update:', error.message);
    }
  }

  // NEW METHOD: Alias for updateAllMetricsSafe for compatibility
  async updateAllMetrics() {
    return this.updateAllMetricsSafe();
  }

  async updateMetricSafe(key, value) {
    try {
      await dbOperations.run(
        `INSERT OR REPLACE INTO system_metrics (metric_key, metric_value, updated_at) 
         VALUES (?, ?, datetime('now'))`,
        [key, value]
      );
    } catch (error) {
      console.error(`Safe update metric ${key} failed:`, error.message);
    }
  }

  // Keep all your existing methods but rename the updateAllMetrics to updateAllMetricsSafe in the interval
  async updateUptimeMetrics() {
    try {
      const uptimeMs = new Date() - this.startTime;
      const uptimeDays = (uptimeMs / (1000 * 60 * 60 * 24)).toFixed(2);
      
      await this.updateMetricSafe('system_uptime_days', uptimeDays);
      await this.updateMetricSafe('database_uptime_days', uptimeDays);
      await this.updateMetricSafe('last_system_restart', this.startTime.toISOString());
    } catch (error) {
      console.error('Error updating uptime metrics:', error.message);
    }
  }

  async updateDatabaseMetrics() {
    try {
      // Get database size
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      if (await this.fileExists(dbPath)) {
        try {
          const stats = await fs.stat(dbPath);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          await this.updateMetricSafe('database_size_mb', sizeMB);
        } catch (error) {
          console.log('Could not update database size:', error.message);
        }
      }
    } catch (error) {
      console.error('Error updating database metrics:', error.message);
    }
  }

  async updateResponseTimeMetrics() {
    try {
      // Calculate average response time from performance metrics (last 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const perfMetrics = await dbOperations.all(`
        SELECT response_time_ms 
        FROM performance_metrics 
        WHERE created_at >= ? AND response_time_ms > 0
        ORDER BY created_at DESC
        LIMIT 100
      `, [oneHourAgo]);
      
      if (perfMetrics && perfMetrics.length > 0) {
        const total = perfMetrics.reduce((sum, m) => sum + (m.response_time_ms || 0), 0);
        const avg = Math.round(total / perfMetrics.length);
        
        // Calculate percentiles
        const times = perfMetrics.map(m => m.response_time_ms || 0).sort((a, b) => a - b);
        const p95 = times[Math.floor(times.length * 0.95)] || avg;
        const p99 = times[Math.floor(times.length * 0.99)] || avg;
        
        await this.updateMetricSafe('avg_response_time', avg.toString());
        await this.updateMetricSafe('p95_response_time', p95.toString());
        await this.updateMetricSafe('p99_response_time', p99.toString());
      }
    } catch (error) {
      console.error('Error updating response time metrics:', error.message);
    }
  }

  async updateSecurityMetrics() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Failed login attempts
      let failedLogins = 0;
      try {
        const result = await dbOperations.get(
          `SELECT COUNT(*) as count FROM security_logs 
           WHERE event_type = 'failed_login' 
           AND created_at >= ?`,
          [twentyFourHoursAgo]
        );
        failedLogins = result?.count || 0;
      } catch (e) {
        // Table might not exist
      }
      
      // Password resets
      let passwordResets = 0;
      try {
        const result = await dbOperations.get(
          `SELECT COUNT(*) as count FROM user_activity_logs 
           WHERE activity_type = 'password_reset' 
           AND created_at >= ?`,
          [twentyFourHoursAgo]
        );
        passwordResets = result?.count || 0;
      } catch (e) {
        // Table might not exist
      }
      
      // Active blocked IPs
      let blockedIPs = 0;
      try {
        const result = await dbOperations.get(
          `SELECT COUNT(*) as count FROM blocked_ips 
           WHERE is_active = 1 
           AND (expires_at IS NULL OR expires_at > datetime('now'))`
        );
        blockedIPs = result?.count || 0;
      } catch (e) {
        // Table might not exist
      }
      
      await this.updateMetricSafe('failed_login_attempts_24h', failedLogins.toString());
      await this.updateMetricSafe('password_resets_24h', passwordResets.toString());
      await this.updateMetricSafe('active_blocked_ips', blockedIPs.toString());
    } catch (error) {
      console.error('Error updating security metrics:', error.message);
    }
  }

  async updateBackupMetrics() {
    try {
      const latestBackup = await dbOperations.get(
        `SELECT status, created_at FROM backup_history 
         ORDER BY created_at DESC LIMIT 1`
      );
      
      if (latestBackup) {
        await this.updateMetricSafe('last_backup_status', latestBackup.status || 'unknown');
        await this.updateMetricSafe('last_backup_time', latestBackup.created_at || 'Never');
      } else {
        await this.updateMetricSafe('last_backup_status', 'none');
        await this.updateMetricSafe('last_backup_time', 'Never');
      }
      
    } catch (error) {
      console.error('Error updating backup metrics:', error.message);
    }
  }

  async updateBusinessMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get new users today
      let newUsers = 0;
      try {
        const result = await dbOperations.get(`
          SELECT COUNT(*) as count FROM (
            SELECT customer_id FROM customers WHERE DATE(created_at) = DATE('now')
            UNION ALL
            SELECT manager_id FROM event_managers WHERE DATE(created_at) = DATE('now')
            UNION ALL
            SELECT admin_id FROM admins WHERE DATE(created_at) = DATE('now')
          )
        `);
        newUsers = result?.count || 0;
      } catch (e) {
        // Tables might not exist
      }
      
      // Get events created today
      let eventsCreated = 0;
      try {
        const result = await dbOperations.get(`
          SELECT COUNT(*) as count FROM events 
          WHERE DATE(created_at) = DATE('now')
        `);
        eventsCreated = result?.count || 0;
      } catch (e) {
        // Events table might not exist
      }
      
      // Get total events
      let totalEvents = 0;
      let activeEvents = 0;
      let pendingEvents = 0;
      try {
        totalEvents = (await dbOperations.get(`SELECT COUNT(*) as count FROM events`))?.count || 0;
        activeEvents = (await dbOperations.get(`
          SELECT COUNT(*) as count FROM events 
          WHERE status = 'ACTIVE' OR status = 'active'
        `))?.count || 0;
        pendingEvents = (await dbOperations.get(`
          SELECT COUNT(*) as count FROM events 
          WHERE status = 'PENDING' OR status = 'pending'
        `))?.count || 0;
      } catch (e) {
        // Events table might not exist
      }
      
      // Update system metrics
      const metricUpdates = [
        ['new_users_today', newUsers.toString()],
        ['events_created_today', eventsCreated.toString()],
        ['total_events', totalEvents.toString()],
        ['active_events', activeEvents.toString()],
        ['pending_events', pendingEvents.toString()]
      ];
      
      for (const [key, value] of metricUpdates) {
        try {
          await this.updateMetricSafe(key, value);
        } catch (error) {
          // Skip if metric doesn't exist
        }
      }
      
    } catch (error) {
      console.error('Error updating business metrics:', error.message);
    }
  }

  async checkAndGenerateAlerts() {
    try {
      // Simple alert check - can be expanded later
      const failedLoginsMetric = await this.getMetricValue('failed_login_attempts_24h');
      const failedLogins = parseInt(failedLoginsMetric) || 0;
      
      if (failedLogins > 20) {
        await this.createAlert({
          alert_type: 'security',
          title: 'High Failed Login Attempts',
          message: `${failedLogins} failed login attempts detected in the last 24 hours`,
          severity: 'high',
          source_module: 'security',
          affected_items: JSON.stringify(['auth_endpoint']),
          recommendations: JSON.stringify(['Review security logs', 'Enable rate limiting'])
        });
      }
      
      // Add more alert checks
      const responseTime = parseInt(await this.getMetricValue('avg_response_time') || '0');
      if (responseTime > 1000) { // > 1 second
        await this.createAlert({
          alert_type: 'performance',
          title: 'High Response Time',
          message: `Average response time is ${responseTime}ms (above threshold)`,
          severity: 'medium',
          source_module: 'performance',
          affected_items: JSON.stringify(['api_endpoints']),
          recommendations: JSON.stringify(['Check server load', 'Optimize database queries'])
        });
      }
      
      // Check database size
      const dbSize = parseFloat(await this.getMetricValue('database_size_mb') || '0');
      if (dbSize > 100) { // > 100MB
        await this.createAlert({
          alert_type: 'system',
          title: 'Large Database Size',
          message: `Database size is ${dbSize}MB`,
          severity: 'medium',
          source_module: 'database',
          affected_items: JSON.stringify(['database']),
          recommendations: JSON.stringify(['Consider database cleanup', 'Archive old data'])
        });
      }
      
    } catch (error) {
      console.error('Error checking alerts:', error.message);
    }
  }

  async createAlert(alertData) {
    try {
      const existingAlert = await dbOperations.get(
        `SELECT id FROM system_alerts 
         WHERE alert_type = ? AND title = ? AND acknowledged = 0`,
        [alertData.alert_type, alertData.title]
      );
      
      if (!existingAlert) {
        await dbOperations.run(
          `INSERT INTO system_alerts 
           (alert_type, title, message, severity, source_module, affected_items, recommendations) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            alertData.alert_type,
            alertData.title,
            alertData.message,
            alertData.severity,
            alertData.source_module,
            alertData.affected_items,
            alertData.recommendations
          ]
        );
      }
    } catch (error) {
      console.error('Error creating alert:', error.message);
    }
  }

  async getMetricValue(key) {
    try {
      const metric = await dbOperations.get(
        `SELECT metric_value FROM system_metrics WHERE metric_key = ?`,
        [key]
      );
      return metric ? metric.metric_value : '0';
    } catch (error) {
      console.error(`Error getting metric ${key}:`, error.message);
      return '0';
    }
  }

  async logSecurityEvent(eventData) {
    try {
      await dbOperations.run(
        `INSERT INTO security_logs 
         (event_type, severity, user_id, user_email, ip_address, user_agent, details) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          eventData.event_type,
          eventData.severity || 'info',
          eventData.user_id,
          eventData.user_email,
          eventData.ip_address,
          eventData.user_agent,
          eventData.details
        ]
      );
    } catch (error) {
      console.error('Error logging security event:', error.message);
    }
  }

  async logUserActivity(activityData) {
    try {
      await dbOperations.run(
        `INSERT INTO user_activity_logs 
         (user_id, user_email, activity_type, activity_details, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          activityData.user_id,
          activityData.user_email,
          activityData.activity_type,
          activityData.activity_details,
          activityData.ip_address,
          activityData.user_agent
        ]
      );
    } catch (error) {
      console.error('Error logging user activity:', error.message);
    }
  }

  async blockIP(ip, reason, blockedBy = 'system') {
    try {
      const existing = await dbOperations.get(
        `SELECT id, attempts FROM blocked_ips WHERE ip_address = ? AND is_active = 1`,
        [ip]
      );
      
      if (existing) {
        await dbOperations.run(
          `UPDATE blocked_ips SET attempts = attempts + 1 WHERE id = ?`,
          [existing.id]
        );
      } else {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        await dbOperations.run(
          `INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at) 
           VALUES (?, ?, ?, ?)`,
          [ip, reason, blockedBy, expiresAt]
        );
      }
    } catch (error) {
      console.error('Error blocking IP:', error.message);
    }
  }

  async logPerformance(endpoint, responseTime, statusCode, requestSize, responseSize) {
    try {
      await dbOperations.run(
        `INSERT INTO performance_metrics 
         (endpoint, response_time_ms, status_code, request_size, response_size) 
         VALUES (?, ?, ?, ?, ?)`,
        [endpoint, responseTime, statusCode, requestSize, responseSize]
      );
    } catch (error) {
      console.error('Error logging performance:', error.message);
    }
  }

  async getDashboardData() {
    try {
      const metrics = await dbOperations.all(`SELECT * FROM system_metrics`) || [];
      const alerts = await dbOperations.all(
        `SELECT * FROM system_alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10`
      ) || [];
      const securityLogs = await dbOperations.all(
        `SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 20`
      ) || [];
      const blockedIPs = await dbOperations.all(
        `SELECT * FROM blocked_ips WHERE is_active = 1 
         AND (expires_at IS NULL OR expires_at > datetime('now')) 
         ORDER BY created_at DESC`
      ) || [];
      const backupHistory = await dbOperations.all(
        `SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 10`
      ) || [];
      const recentActivity = await dbOperations.all(
        `SELECT * FROM user_activity_logs ORDER BY created_at DESC LIMIT 20`
      ) || [];
      
      const formattedMetrics = {};
      metrics.forEach(metric => {
        formattedMetrics[metric.metric_key] = {
          value: metric.metric_value,
          type: metric.metric_type,
          unit: metric.unit,
          updated_at: metric.updated_at
        };
      });
      
      return {
        metrics: formattedMetrics,
        alerts: this.formatAlerts(alerts),
        securityLogs: this.formatSecurityLogs(securityLogs),
        blockedIPs: this.formatBlockedIPs(blockedIPs),
        backupHistory: this.formatBackupHistory(backupHistory),
        recentActivity: this.formatRecentActivity(recentActivity)
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error.message);
      // Return empty structure instead of throwing
      return {
        metrics: {},
        alerts: [],
        securityLogs: [],
        blockedIPs: [],
        backupHistory: [],
        recentActivity: []
      };
    }
  }

// Database Management Metrics
async updateDatabaseManagementMetrics() {
  try {
    console.log('Updating database management metrics...');
    
    // Get total table count
    const tables = await dbOperations.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    // Get total row count across all tables
    let totalRows = 0;
    for (const table of tables) {
      try {
        const result = await dbOperations.get(
          `SELECT COUNT(*) as count FROM ${table.name}`
        );
        totalRows += result?.count || 0;
      } catch (error) {
        // Skip tables we can't count
      }
    }
    
    // Get database size
    const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
    let dbSizeMB = '0';
    if (await this.fileExists(dbPath)) {
      try {
        const stats = await fs.stat(dbPath);
        dbSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      } catch (error) {
        console.log('Could not get database size:', error.message);
      }
    }
    
    // Get index count
    const indexes = await dbOperations.all(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    );
    
    // Get query performance metrics
    const slowQueries = await dbOperations.get(`
      SELECT COUNT(*) as count FROM database_query_metrics 
      WHERE execution_time_ms > 100 
      AND created_at >= datetime('now', '-1 hour')
    `);
    
    // Update metrics
    await this.updateMetricSafe('database_total_tables', tables.length.toString());
    await this.updateMetricSafe('database_total_rows', totalRows.toString());
    await this.updateMetricSafe('database_size_mb', dbSizeMB);
    await this.updateMetricSafe('database_index_count', indexes.length.toString());
    await this.updateMetricSafe('database_slow_queries_last_hour', (slowQueries?.count || 0).toString());
    await this.updateMetricSafe('database_last_optimization', new Date().toISOString());
    
    console.log('Database management metrics updated');
    
  } catch (error) {
    console.error('Error updating database management metrics:', error.message);
  }
}

// System Logs Collection
async updateSystemLogsMetrics() {
  try {
    console.log('Updating system logs metrics...');
    
    // Get log counts by level
    const logCounts = await dbOperations.get(`
      SELECT 
        SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN level = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) as info_count,
        COUNT(*) as total_count
      FROM (
        SELECT 'ERROR' as level, created_at FROM security_logs WHERE severity = 'high'
        UNION ALL
        SELECT 'WARNING' as level, created_at FROM system_alerts WHERE acknowledged = 0
        UNION ALL
        SELECT 'INFO' as level, created_at FROM user_activity_logs
      ) logs
      WHERE created_at >= datetime('now', '-24 hours')
    `);
    
    // Get module-wise error distribution
    const moduleErrors = await dbOperations.all(`
      SELECT 
        'security' as module, COUNT(*) as count FROM security_logs 
        WHERE severity IN ('high', 'critical') AND created_at >= datetime('now', '-24 hours')
        GROUP BY module
      UNION ALL
      SELECT 
        'authentication' as module, COUNT(*) as count FROM user_activity_logs 
        WHERE activity_type IN ('failed_login', 'password_reset_failed') 
        AND created_at >= datetime('now', '-24 hours')
        GROUP BY module
      UNION ALL
      SELECT 
        'database' as module, COUNT(*) as count FROM database_query_metrics 
        WHERE error_message IS NOT NULL AND created_at >= datetime('now', '-24 hours')
        GROUP BY module
    `);
    
    // Update metrics
    await this.updateMetricSafe('system_logs_errors_24h', (logCounts?.error_count || 0).toString());
    await this.updateMetricSafe('system_logs_warnings_24h', (logCounts?.warning_count || 0).toString());
    await this.updateMetricSafe('system_logs_total_24h', (logCounts?.total_count || 0).toString());
    
    // Update module-specific metrics
    for (const module of moduleErrors) {
      await this.updateMetricSafe(`system_logs_${module.module}_24h`, module.count.toString());
    }
    
    // Log retention information
    const totalLogs = await dbOperations.get(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM security_logs
        UNION ALL
        SELECT id FROM user_activity_logs
        UNION ALL
        SELECT id FROM performance_metrics
      )
    `);
    
    await this.updateMetricSafe('system_logs_total_stored', (totalLogs?.count || 0).toString());
    
    console.log('System logs metrics updated');
    
  } catch (error) {
    console.error('Error updating system logs metrics:', error.message);
  }
}

// System Resource Metrics (CPU, Memory, Disk)
async updateSystemResourceMetrics() {
  try {
    console.log('Updating system resource metrics...');
    
    const os = require('os');
    const fs = require('fs').promises;
    
    // CPU Usage (load average)
    const loadAvg = os.loadavg();
    const cpuUsage = loadAvg[0]; // 1-minute load average
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    // Disk Usage
    let diskUsagePercent = 0;
    let diskUsedGB = 0;
    let diskTotalGB = 0;
    
    try {
      const diskInfo = await this.getDiskUsage();
      diskUsagePercent = diskInfo.usagePercent;
      diskUsedGB = diskInfo.usedGB;
      diskTotalGB = diskInfo.totalGB;
    } catch (diskError) {
      console.log('Disk stats not available:', diskError.message);
    }
    
    // Process Count
    const processCount = os.cpus().length;
    
    // Network Stats (simplified)
    const networkInterfaces = os.networkInterfaces();
    let networkRx = 0;
    let networkTx = 0;
    
    // Save to database
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
      diskUsagePercent.toFixed(2),
      diskUsedGB.toFixed(2),
      diskTotalGB.toFixed(2),
      processCount,
      cpuUsage.toFixed(2)
    ]);
    
    // Update system metrics
    await this.updateMetricSafe('system_cpu_usage_percent', cpuUsage.toFixed(2));
    await this.updateMetricSafe('system_memory_usage_percent', memoryUsagePercent.toFixed(2));
    await this.updateMetricSafe('system_memory_used_mb', (usedMem / 1024 / 1024).toFixed(2));
    await this.updateMetricSafe('system_disk_usage_percent', diskUsagePercent.toFixed(2));
    await this.updateMetricSafe('system_disk_used_gb', diskUsedGB);
    await this.updateMetricSafe('system_process_count', processCount.toString());
    await this.updateMetricSafe('system_load_average', cpuUsage.toFixed(2));
    
    console.log('System resource metrics updated');
    
  } catch (error) {
    console.error('Error updating system resource metrics:', error.message);
  }
}

// Helper method for disk usage
async getDiskUsage() {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Try different commands for different OS
    let command;
    if (process.platform === 'win32') {
      command = 'wmic logicaldisk get size,freespace,caption';
    } else {
      command = 'df -k /';
    }
    
    const { stdout } = await execPromise(command);
    
    if (process.platform === 'win32') {
      // Parse Windows output
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        if (parts.length >= 3) {
          const total = parseInt(parts[1]) / (1024 * 1024 * 1024); // Convert to GB
          const free = parseInt(parts[2]) / (1024 * 1024 * 1024); // Convert to GB
          const used = total - free;
          const usagePercent = (used / total) * 100;
          
          return {
            usagePercent: usagePercent.toFixed(2),
            usedGB: used.toFixed(2),
            totalGB: total.toFixed(2)
          };
        }
      }
    } else {
      // Parse Linux/Mac output
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        if (parts.length >= 5) {
          const total = parseInt(parts[1]) / (1024 * 1024); // Convert to GB
          const used = parseInt(parts[2]) / (1024 * 1024); // Convert to GB
          const usagePercent = parseInt(parts[4]);
          
          return {
            usagePercent: usagePercent.toFixed(2),
            usedGB: used.toFixed(2),
            totalGB: total.toFixed(2)
          };
        }
      }
    }
    
    throw new Error('Could not parse disk usage output');
    
  } catch (error) {
    // Return default values if we can't get disk info
    return {
      usagePercent: '0',
      usedGB: '0',
      totalGB: '0'
    };
  }
}

// Email/SMS Notification Metrics
async updateNotificationMetrics() {
  try {
    console.log('Updating notification metrics...');
    
    // Get notification stats
    const notificationStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM notification_logs 
      WHERE created_at >= datetime('now', '-24 hours')
    `);
    
    // Get notification types
    const typeStats = await dbOperations.all(`
      SELECT notification_type, COUNT(*) as count 
      FROM notification_logs 
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY notification_type
    `);
    
    // Update metrics
    await this.updateMetricSafe('notifications_total_24h', (notificationStats?.total || 0).toString());
    await this.updateMetricSafe('notifications_sent_24h', (notificationStats?.sent || 0).toString());
    await this.updateMetricSafe('notifications_failed_24h', (notificationStats?.failed || 0).toString());
    await this.updateMetricSafe('notifications_pending', (notificationStats?.pending || 0).toString());
    
    // Calculate success rate
    const total = notificationStats?.total || 0;
    const sent = notificationStats?.sent || 0;
    const successRate = total > 0 ? (sent / total) * 100 : 100;
    
    await this.updateMetricSafe('notifications_success_rate', successRate.toFixed(2));
    
    // Update type-specific metrics
    for (const typeStat of typeStats) {
      await this.updateMetricSafe(
        `notifications_${typeStat.notification_type}_24h`, 
        typeStat.count.toString()
      );
    }
    
    console.log('Notification metrics updated');
    
  } catch (error) {
    console.error('Error updating notification metrics:', error.message);
  }
}

// Backup Metrics
async updateBackupMetrics() {
  try {
    console.log('Updating backup metrics...');
    
    // Get backup stats
    const backupStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration_seconds) as avg_duration,
        MAX(created_at) as last_backup
      FROM backup_logs 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    
    // Get backup sizes
    const sizeStats = await dbOperations.get(`
      SELECT 
        SUM(size_bytes) as total_size_bytes,
        AVG(size_bytes) as avg_size_bytes
      FROM backup_logs 
      WHERE status = 'success' 
      AND created_at >= datetime('now', '-30 days')
    `);
    
    // Update metrics
    await this.updateMetricSafe('backups_total_7d', (backupStats?.total || 0).toString());
    await this.updateMetricSafe('backups_success_7d', (backupStats?.success || 0).toString());
    await this.updateMetricSafe('backups_failed_7d', (backupStats?.failed || 0).toString());
    
    // Calculate success rate
    const total = backupStats?.total || 0;
    const success = backupStats?.success || 0;
    const successRate = total > 0 ? (success / total) * 100 : 100;
    
    await this.updateMetricSafe('backups_success_rate', successRate.toFixed(2));
    await this.updateMetricSafe('backups_avg_duration_seconds', (backupStats?.avg_duration || 0).toFixed(2));
    await this.updateMetricSafe('backups_last_completed', backupStats?.last_backup || 'Never');
    
    // Size metrics
    const totalSizeMB = (sizeStats?.total_size_bytes || 0) / (1024 * 1024);
    const avgSizeMB = (sizeStats?.avg_size_bytes || 0) / (1024 * 1024);
    
    await this.updateMetricSafe('backups_total_size_mb', totalSizeMB.toFixed(2));
    await this.updateMetricSafe('backups_avg_size_mb', avgSizeMB.toFixed(2));
    
    console.log('Backup metrics updated');
    
  } catch (error) {
    console.error('Error updating backup metrics:', error.message);
  }
}

// Performance Metrics (API Response Times, etc.)
async updatePerformanceMetrics() {
  try {
    console.log('Updating performance metrics...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // API Performance
    const apiStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests,
        SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as server_errors
      FROM api_performance_metrics 
      WHERE created_at >= ?
    `, [oneHourAgo]);
    
    // Database Performance
    const dbStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_queries,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        SUM(CASE WHEN execution_time_ms > 100 THEN 1 ELSE 0 END) as slow_queries
      FROM database_query_metrics 
      WHERE created_at >= ?
    `, [oneHourAgo]);
    
    // Update metrics
    if (apiStats && apiStats.total_requests > 0) {
      await this.updateMetricSafe('api_requests_total_1h', apiStats.total_requests.toString());
      await this.updateMetricSafe('api_avg_response_time_ms', apiStats.avg_response_time.toFixed(2));
      await this.updateMetricSafe('api_max_response_time_ms', apiStats.max_response_time.toString());
      
      const errorRate = (apiStats.error_requests / apiStats.total_requests) * 100;
      await this.updateMetricSafe('api_error_rate_percent', errorRate.toFixed(2));
      
      const serverErrorRate = (apiStats.server_errors / apiStats.total_requests) * 100;
      await this.updateMetricSafe('api_server_error_rate_percent', serverErrorRate.toFixed(2));
    }
    
    if (dbStats && dbStats.total_queries > 0) {
      await this.updateMetricSafe('db_queries_total_1h', dbStats.total_queries.toString());
      await this.updateMetricSafe('db_avg_execution_time_ms', dbStats.avg_execution_time.toFixed(2));
      await this.updateMetricSafe('db_slow_queries_1h', dbStats.slow_queries.toString());
    }
    
    // Cache Performance
    const cacheStats = await dbOperations.get(`
      SELECT 
        SUM(hit_count) as total_hits,
        SUM(miss_count) as total_misses
      FROM cache_performance_metrics 
      WHERE last_accessed >= ?
    `, [oneHourAgo]);
    
    if (cacheStats) {
      const totalAccess = (cacheStats.total_hits || 0) + (cacheStats.total_misses || 0);
      if (totalAccess > 0) {
        const hitRate = ((cacheStats.total_hits || 0) / totalAccess) * 100;
        await this.updateMetricSafe('cache_hit_rate_percent', hitRate.toFixed(2));
      }
    }
    
    console.log('Performance metrics updated');
    
  } catch (error) {
    console.error('Error updating performance metrics:', error.message);
  }
}

// Business Metrics (Revenue, Conversion, etc.)
async updateBusinessMetricsEnhanced() {
  try {
    console.log('Updating enhanced business metrics...');
    const today = new Date().toISOString().split('T')[0];
    
    // Revenue Metrics
    const revenueStats = await dbOperations.get(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN total_amount ELSE 0 END) as revenue_today,
        SUM(CASE WHEN DATE(created_at) = DATE('now', '-1 day') THEN total_amount ELSE 0 END) as revenue_yesterday,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM payments 
      WHERE status = 'completed'
    `);
    
    // Ticket Metrics
    const ticketStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN quantity ELSE 0 END) as tickets_today,
        AVG(total_amount / quantity) as avg_ticket_price
      FROM tickets 
      WHERE status = 'confirmed'
    `);
    
    // Event Metrics
    const eventStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_events,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_events,
        AVG(price) as avg_event_price,
        SUM(capacity) as total_capacity,
        SUM(max_attendees) as total_max_attendees
      FROM events 
      WHERE archived = 0
    `);
    
    // User Growth
    const userGrowth = await dbOperations.get(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as new_users_today,
        SUM(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as new_users_week,
        SUM(CASE WHEN DATE(last_login) = DATE('now') THEN 1 ELSE 0 END) as active_users_today
      FROM (
        SELECT customer_id as id, created_at, last_login FROM customers WHERE status = 'active'
        UNION ALL
        SELECT manager_id as id, created_at, last_login FROM event_managers WHERE status = 'active'
        UNION ALL
        SELECT admin_id as id, created_at, last_login FROM admins WHERE status = 'active'
      ) users
    `);
    
    // Update metrics
    await this.updateMetricSafe('revenue_total', (revenueStats?.total_revenue || 0).toFixed(2));
    await this.updateMetricSafe('revenue_today', (revenueStats?.revenue_today || 0).toFixed(2));
    await this.updateMetricSafe('revenue_yesterday', (revenueStats?.revenue_yesterday || 0).toFixed(2));
    await this.updateMetricSafe('unique_customers', (revenueStats?.unique_customers || 0).toString());
    
    await this.updateMetricSafe('tickets_total', (ticketStats?.total_tickets || 0).toString());
    await this.updateMetricSafe('tickets_today', (ticketStats?.tickets_today || 0).toString());
    await this.updateMetricSafe('avg_ticket_price', (ticketStats?.avg_ticket_price || 0).toFixed(2));
    
    await this.updateMetricSafe('events_total', (eventStats?.total_events || 0).toString());
    await this.updateMetricSafe('events_active', (eventStats?.active_events || 0).toString());
    await this.updateMetricSafe('events_pending', (eventStats?.pending_events || 0).toString());
    await this.updateMetricSafe('avg_event_price', (eventStats?.avg_event_price || 0).toFixed(2));
    await this.updateMetricSafe('total_capacity', (eventStats?.total_capacity || 0).toString());
    
    await this.updateMetricSafe('users_total', (userGrowth?.total_users || 0).toString());
    await this.updateMetricSafe('users_new_today', (userGrowth?.new_users_today || 0).toString());
    await this.updateMetricSafe('users_new_week', (userGrowth?.new_users_week || 0).toString());
    await this.updateMetricSafe('users_active_today', (userGrowth?.active_users_today || 0).toString());
    
    // Calculate growth rates
    const revenueToday = revenueStats?.revenue_today || 0;
    const revenueYesterday = revenueStats?.revenue_yesterday || 0;
    const revenueGrowth = revenueYesterday > 0 ? 
      ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : 
      (revenueToday > 0 ? 100 : 0);
    
    await this.updateMetricSafe('revenue_growth_rate', revenueGrowth.toFixed(2));
    
    // Save to business metrics table
    await this.updateBusinessMetricSafe(today, 'revenue', revenueToday);
    await this.updateBusinessMetricSafe(today, 'tickets_sold', ticketStats?.tickets_today || 0);
    await this.updateBusinessMetricSafe(today, 'new_users', userGrowth?.new_users_today || 0);
    await this.updateBusinessMetricSafe(today, 'active_users', userGrowth?.active_users_today || 0);
    
    console.log('Enhanced business metrics updated');
    
  } catch (error) {
    console.error('Error updating enhanced business metrics:', error.message);
  }
}

// Helper method for business metrics
async updateBusinessMetricSafe(date, type, value) {
  try {
    await dbOperations.run(`
      INSERT OR REPLACE INTO business_metrics (metric_date, metric_type, metric_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [date, type, value]);
  } catch (error) {
    console.error(`Error updating business metric ${type}:`, error.message);
  }
}

// Update the updateAllMetricsSafe method to include all new metrics:
async updateAllMetricsSafe() {
  try {
    if (!this.isRunning) return;
    
    console.log('Starting comprehensive metrics update...');
    
    // Run each metric update separately with error handling
    const updates = [
      this.updateUptimeMetrics(),
      this.updateDatabaseMetrics(),
      this.updateResponseTimeMetrics(),
      this.updateSecurityMetrics(),
      this.updateBackupMetrics(),
      this.updateBusinessMetrics(),
      
      // NEW METRICS
      this.updateDatabaseManagementMetrics(),
      this.updateSystemLogsMetrics(),
      this.updateSystemResourceMetrics(),
      this.updateNotificationMetrics(),
      this.updateBackupMetrics(),
      this.updatePerformanceMetrics(),
      this.updateBusinessMetricsEnhanced()
    ];
    
    // Run all updates, don't fail if some fail
    for (const update of updates) {
      try {
        await update;
        console.log(`✓ Completed: ${update.name || 'Unknown update'}`);
      } catch (error) {
        console.log(`✗ Failed ${update.name || 'Unknown update'}:`, error.message);
      }
    }
    
    await this.checkAndGenerateAlerts();
    
    console.log('✅ All metrics updated successfully');
    
  } catch (error) {
    console.error('Error in safe metrics update:', error.message);
  }
}

  formatAlerts(alerts) {
    return alerts.map(alert => ({
      id: alert.id,
      type: alert.alert_type,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      time: this.formatTimeAgo(alert.created_at),
      details: alert.affected_items ? JSON.parse(alert.affected_items) : [],
      recommendations: alert.recommendations ? JSON.parse(alert.recommendations) : []
    }));
  }

  formatSecurityLogs(logs) {
    return logs.map(log => ({
      id: log.id,
      type: log.event_type,
      user: log.user_email || 'Unknown',
      ip: log.ip_address || 'N/A',
      time: this.formatTimeAgo(log.created_at),
      severity: log.severity,
      details: log.details
    }));
  }

  formatBlockedIPs(ips) {
    return ips.map(ip => ({
      ip: ip.ip_address,
      reason: ip.reason,
      blocked: this.formatTimeAgo(ip.created_at),
      attempts: ip.attempts,
      expires: ip.expires_at
    }));
  }

  formatBackupHistory(backups) {
    return backups.map(backup => ({
      date: backup.created_at,
      size: `${backup.size_mb || 0} MB`,
      duration: `${backup.duration_seconds || 0} sec`,
      status: backup.status,
      type: backup.backup_type
    }));
  }

  formatRecentActivity(activities) {
    return activities.map(activity => ({
      type: activity.activity_type,
      user: activity.user_email || 'System',
      time: this.formatTimeAgo(activity.created_at),
      details: activity.activity_details,
      ip: activity.ip_address
    }));
  }

  formatTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Unknown';
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    console.log('Metrics service stopped');
  }
}

module.exports = MetricsService;