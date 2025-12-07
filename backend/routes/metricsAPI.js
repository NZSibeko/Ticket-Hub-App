// backend/routes/metricsAPI.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Helper function to ensure metrics service is available
const ensureMetricsService = (req) => {
  if (!req.app.locals.metricsService) {
    console.log('Creating new MetricsService instance for request...');
    try {
      const MetricsService = require('../services/MetricsService');
      const metricsService = new MetricsService();
      req.app.locals.metricsService = metricsService;
      
      // Start it if not running
      if (!metricsService.isRunning) {
        metricsService.startMetricsCollection().catch(err => {
          console.error('Failed to start metrics service:', err.message);
        });
      }
      
      return metricsService;
    } catch (error) {
      console.error('Failed to create MetricsService:', error);
      return null;
    }
  }
  return req.app.locals.metricsService;
};

// Get all real-time metrics
router.get('/dashboard-metrics', async (req, res) => {
  try {
    console.log('Fetching real metrics data...');
    
    // Ensure metrics service is available
    const metricsService = ensureMetricsService(req);
    let metricsData = {
      metrics: {},
      alerts: [],
      securityLogs: [],
      blockedIPs: [],
      backupHistory: [],
      recentActivity: []
    };
    
    if (metricsService) {
      try {
        metricsData = await metricsService.getDashboardData();
        console.log('Got metrics data:', {
          metricsCount: Object.keys(metricsData.metrics).length,
          alertsCount: metricsData.alerts.length
        });
      } catch (metricsError) {
        console.error('Error getting dashboard data:', metricsError.message);
      }
    } else {
      console.log('⚠ Metrics service not available, using fallback data');
    }
    
    // Get user statistics - with better error handling
    let customersCount = 0, managersCount = 0, adminsCount = 0;
    try {
      const [customers, managers, admins] = await Promise.all([
        dbOperations.get(`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`).catch(() => ({ count: 0 })),
        dbOperations.get(`SELECT COUNT(*) as count FROM event_managers WHERE status = 'active'`).catch(() => ({ count: 0 })),
        dbOperations.get(`SELECT COUNT(*) as count FROM admins WHERE status = 'active'`).catch(() => ({ count: 0 }))
      ]);
      
      customersCount = customers?.count || 0;
      managersCount = managers?.count || 0;
      adminsCount = admins?.count || 0;
    } catch (userError) {
      console.error('Error getting user counts:', userError.message);
    }
    
    const totalUsers = customersCount + managersCount + adminsCount;
    
    // Get system uptime from metrics or calculate
    let systemUptime = '0 days';
    if (metricsData.metrics.system_uptime_days?.value) {
      systemUptime = `${parseFloat(metricsData.metrics.system_uptime_days.value).toFixed(2)} days`;
    } else if (metricsService?.startTime) {
      const uptimeMs = new Date() - metricsService.startTime;
      systemUptime = `${(uptimeMs / (1000 * 60 * 60 * 24)).toFixed(2)} days`;
    }
    
    // Get response time
    let responseTime = '0 ms';
    if (metricsData.metrics.avg_response_time?.value) {
      responseTime = `${metricsData.metrics.avg_response_time.value} ms`;
    }
    
    // Get database size
    let dbSize = '0 MB';
    if (metricsData.metrics.database_size_mb?.value) {
      dbSize = `${metricsData.metrics.database_size_mb.value} MB`;
    }
    
    // Get failed logins
    let failedLogins = 0;
    if (metricsData.metrics.failed_login_attempts_24h?.value) {
      failedLogins = parseInt(metricsData.metrics.failed_login_attempts_24h.value) || 0;
    }
    
    // Get blocked IPs
    let blockedIPs = 0;
    if (metricsData.metrics.active_blocked_ips?.value) {
      blockedIPs = parseInt(metricsData.metrics.active_blocked_ips.value) || 0;
    }
    
    // Get event counts
    let totalEvents = 0, activeEvents = 0, pendingEvents = 0;
    try {
      const [totalRes, activeRes, pendingRes] = await Promise.all([
        dbOperations.get(`SELECT COUNT(*) as count FROM events`).catch(() => ({ count: 0 })),
        dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE status = 'ACTIVE'`).catch(() => ({ count: 0 })),
        dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE status = 'PENDING'`).catch(() => ({ count: 0 }))
      ]);
      
      totalEvents = totalRes?.count || 0;
      activeEvents = activeRes?.count || 0;
      pendingEvents = pendingRes?.count || 0;
    } catch (eventError) {
      console.error('Error getting event counts:', eventError.message);
    }
    
    // Format dashboard data
    const dashboardData = {
      systemHealth: {
        status: metricsData.alerts.length > 0 ? 'warning' : 'healthy',
        uptime: systemUptime,
        lastIncident: metricsData.alerts.length > 0 ? metricsData.alerts[0].time : 'No incidents',
        responseTime: responseTime
      },
      security: {
        failedLogins: failedLogins,
        suspiciousActivity: metricsData.securityLogs.filter(log => 
          log.severity === 'high' || log.severity === 'medium'
        ).length,
        blockedIPs: blockedIPs,
        twoFactorEnabled: 0,
        passwordResets: parseInt(metricsData.metrics.password_resets_24h?.value || 0),
        securityLogs: metricsData.securityLogs.slice(0, 10),
        blockedIPsList: metricsData.blockedIPs.slice(0, 10)
      },
      database: {
        size: dbSize,
        backupStatus: metricsData.metrics.last_backup_status?.value || 'pending',
        lastBackup: metricsData.metrics.last_backup_time?.value || 'Never',
        queries: 0,
        slowQueries: 0,
        backupHistory: metricsData.backupHistory.slice(0, 5)
      },
      platform: {
        totalEvents: totalEvents,
        activeEvents: activeEvents,
        pendingApprovals: pendingEvents,
        reportedIssues: 0,
        resolvedIssues: 0,
        averageResolutionTime: '0 hours',
        pendingEvents: await getPendingEvents()
      },
      users: {
        total: totalUsers,
        active: totalUsers, // Assuming all are active for now
        inactive: 0,
        newThisWeek: parseInt(metricsData.metrics.new_users_today?.value || 0),
        suspended: 0, // Would need to query suspended users
        growthRate: parseFloat(metricsData.metrics.user_growth_rate?.value || 0),
        admins: adminsCount,
        eventManagers: managersCount,
        customers: customersCount,
        userList: await getRecentUsers()
      },
      alerts: metricsData.alerts.slice(0, 10),
      recentActivity: metricsData.recentActivity.slice(0, 10),
      logs: await getSystemLogs()
    };
    
    console.log('Dashboard metrics prepared:', {
      totalUsers,
      totalEvents,
      alertsCount: dashboardData.alerts.length,
      metricsAvailable: Object.keys(metricsData.metrics).length > 0
    });
    
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load metrics', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get comprehensive database metrics
router.get('/database-comprehensive', async (req, res) => {
  try {
    const DatabaseManagementService = require('../services/DatabaseManagementService');
    const dbService = new DatabaseManagementService();
    
    // Get all statistics
    const [stats, backups, integrity] = await Promise.all([
      dbService.getDatabaseStatistics(),
      dbService.listBackups(10),
      dbService.checkDatabaseIntegrity()
    ]);
    
    res.json({
      success: true,
      data: {
        statistics: stats.success ? stats.statistics : null,
        recentBackups: backups.success ? backups.backups : [],
        integrity: integrity.success ? integrity : null,
        lastOptimization: await getLastOptimizationDate()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function getLastOptimizationDate() {
  try {
    const result = await dbOperations.get(`
      SELECT MAX(created_at) as last_optimization 
      FROM system_config_logs 
      WHERE config_key LIKE 'database.optimization%' 
      AND new_value = 'success'
    `);
    return result?.last_optimization || 'Never';
  } catch (error) {
    return 'Unknown';
  }
}

// Get system logs
async function getSystemLogs() {
  try {
    // Try to get logs from multiple tables
    let logs = [];
    
    // Try security logs
    try {
      const securityLogs = await dbOperations.all(`
        SELECT 
          created_at as timestamp,
          'SECURITY' as level,
          'Security' as module,
          details as message,
          user_email as user
        FROM security_logs
        WHERE severity IN ('high', 'critical')
        ORDER BY created_at DESC
        LIMIT 10
      `);
      logs = logs.concat(securityLogs);
    } catch (e) {
      console.log('Security logs table not available');
    }
    
    // Try user activity logs
    try {
      const activityLogs = await dbOperations.all(`
        SELECT 
          created_at as timestamp,
          'INFO' as level,
          'Activity' as module,
          activity_details as message,
          user_email as user
        FROM user_activity_logs
        WHERE activity_type IN ('login', 'logout', 'password_reset')
        ORDER BY created_at DESC
        LIMIT 10
      `);
      logs = logs.concat(activityLogs);
    } catch (e) {
      console.log('User activity logs table not available');
    }
    
    // Try system alerts
    try {
      const alertLogs = await dbOperations.all(`
        SELECT 
          created_at as timestamp,
          'WARNING' as level,
          'System' as module,
          message,
          'system' as user
        FROM system_alerts
        WHERE acknowledged = 0
        ORDER BY created_at DESC
        LIMIT 10
      `);
      logs = logs.concat(alertLogs);
    } catch (e) {
      console.log('System alerts table not available');
    }
    
    // Sort all logs by timestamp and limit
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs.slice(0, 20).map(log => ({
      timestamp: log.timestamp,
      level: log.level || 'INFO',
      module: log.module || 'System',
      message: log.message || 'No message',
      user: log.user || 'system'
    }));
  } catch (error) {
    console.error('Error getting system logs:', error);
    return [];
  }
}

// Get recent users
async function getRecentUsers() {
  try {
    const query = `
      SELECT 
        'Customer' as role,
        customer_id as id,
        first_name || ' ' || last_name as name,
        email,
        status,
        created_at as joined,
        last_login,
        phone as phone_number,
        'South Africa' as country
      FROM customers
      
      UNION ALL
      
      SELECT 
        'Event Manager' as role,
        manager_id as id,
        name,
        email,
        status,
        created_at as joined,
        last_login,
        phone as phone_number,
        'South Africa' as country
      FROM event_managers
      
      UNION ALL
      
      SELECT 
        'Admin' as role,
        admin_id as id,
        name,
        email,
        status,
        created_at as joined,
        last_login,
        phone as phone_number,
        'South Africa' as country
      FROM admins
      
      ORDER BY joined DESC
      LIMIT 20
    `;
    
    const users = await dbOperations.all(query);
    
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || 'active',
      joined: user.joined ? user.joined.split('T')[0] : 'Unknown',
      lastActive: user.last_login ? formatTimeAgo(user.last_login) : 'Never',
      phone: user.phone_number || 'Not provided',
      avatar: (user.name || 'AA').substring(0, 2).toUpperCase(),
      country: 'South Africa'
    }));
  } catch (error) {
    console.error('Error getting recent users:', error);
    return [];
  }
}

// Get pending events
async function getPendingEvents() {
  try {
    const events = await dbOperations.all(`
      SELECT 
        event_id as id,
        event_name as name,
        organizer_name as organizer,
        created_at as submitted,
        category,
        'pending' as status
      FROM events
      WHERE status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    return events.map(event => ({
      id: event.id,
      name: event.name,
      organizer: event.organizer || 'Unknown',
      submitted: formatTimeAgo(event.submitted),
      category: event.category || 'General',
      status: event.status
    }));
  } catch (error) {
    console.error('Error getting pending events:', error);
    return [];
  }
}

// Format time ago
function formatTimeAgo(dateString) {
  if (!dateString) return 'Unknown';
  
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
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  } catch (e) {
    return 'Unknown';
  }
}

// Get specific metric
router.get('/metric/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const metric = await dbOperations.get(
      `SELECT * FROM system_metrics WHERE metric_key = ?`,
      [key]
    );
    
    if (!metric) {
      return res.status(404).json({ success: false, error: 'Metric not found' });
    }
    
    res.json({ success: true, data: metric });
  } catch (error) {
    console.error('Error getting metric:', error);
    res.status(500).json({ success: false, error: 'Failed to get metric' });
  }
});

// Update metric
router.put('/metric/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ success: false, error: 'Value required' });
    }
    
    await dbOperations.run(
      `UPDATE system_metrics 
       SET metric_value = ?, updated_at = datetime('now') 
       WHERE metric_key = ?`,
      [value, key]
    );
    
    res.json({ success: true, message: 'Metric updated' });
  } catch (error) {
    console.error('Error updating metric:', error);
    res.status(500).json({ success: false, error: 'Failed to update metric' });
  }
});

// Acknowledge alert
router.put('/alert/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email || 'admin';
    
    await dbOperations.run(
      `UPDATE system_alerts 
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now') 
       WHERE id = ?`,
      [userEmail, id]
    );
    
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const metrics = await dbOperations.all(`
      SELECT 
        endpoint,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time,
        COUNT(*) as request_count
      FROM performance_metrics
      WHERE created_at >= ?
      GROUP BY endpoint
      ORDER BY avg_response_time DESC
      LIMIT 20
    `, [hoursAgo]);
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get performance metrics' });
  }
});

// Get user activity logs
router.get('/user-activity', async (req, res) => {
  try {
    const { limit = 50, user } = req.query;
    let query = `SELECT * FROM user_activity_logs`;
    const params = [];
    
    if (user) {
      query += ` WHERE user_email = ?`;
      params.push(user);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const logs = await dbOperations.all(query, params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ success: false, error: 'Failed to get user activity' });
  }
});

// Get security logs
router.get('/security-logs', async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    let query = `SELECT * FROM security_logs`;
    const params = [];
    
    if (severity) {
      query += ` WHERE severity = ?`;
      params.push(severity);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const logs = await dbOperations.all(query, params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting security logs:', error);
    res.status(500).json({ success: false, error: 'Failed to get security logs' });
  }
});

// Get blocked IPs
router.get('/blocked-ips', async (req, res) => {
  try {
    const ips = await dbOperations.all(`
      SELECT * FROM blocked_ips 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, data: ips });
  } catch (error) {
    console.error('Error getting blocked IPs:', error);
    res.status(500).json({ success: false, error: 'Failed to get blocked IPs' });
  }
});

// Unblock IP
router.delete('/blocked-ip/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    await dbOperations.run(
      `UPDATE blocked_ips SET is_active = 0 WHERE ip_address = ?`,
      [ip]
    );
    
    res.json({ success: true, message: 'IP unblocked' });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ success: false, error: 'Failed to unblock IP' });
  }
});

// Get database statistics
router.get('/database-stats', async (req, res) => {
  try {
    // Get all table names
    const tables = await dbOperations.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    const tableStats = [];
    
    // Get row count for each table
    for (const table of tables) {
      try {
        const countResult = await dbOperations.get(
          `SELECT COUNT(*) as count FROM ${table.name}`
        );
        
        // Try to get size estimate (SQLite doesn't have direct size per table)
        const sizeResult = await dbOperations.get(
          `SELECT SUM(length(CAST(rowid AS TEXT)) + 100) as estimated_size FROM ${table.name}`
        );
        
        tableStats.push({
          table: table.name,
          rowCount: countResult?.count || 0,
          estimatedSizeKB: Math.round((sizeResult?.estimated_size || 0) / 1024)
        });
      } catch (e) {
        tableStats.push({
          table: table.name,
          rowCount: 0,
          estimatedSizeKB: 0,
          error: e.message
        });
      }
    }
    
    // Get total database size
    let totalSize = 'Unknown';
    try {
      const dbPath = require('path').resolve(__dirname, '..', 'ticket_hub.db');
      const fs = require('fs').promises;
      const stats = await fs.stat(dbPath);
      totalSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
    } catch (e) {
      totalSize = 'Unknown';
    }
    
    res.json({
      success: true,
      data: {
        totalTables: tables.length,
        totalSize,
        tables: tableStats
      }
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get database stats' });
  }
});

// Get user statistics
router.get('/user-stats', async (req, res) => {
  try {
    const [customers, managers, admins] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM customers`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM event_managers`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM admins`).catch(() => ({ count: 0 }))
    ]);
    
    const [activeCustomers, activeManagers, activeAdmins] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM event_managers WHERE status = 'active'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM admins WHERE status = 'active'`).catch(() => ({ count: 0 }))
    ]);
    
    const [suspendedCustomers, suspendedManagers, suspendedAdmins] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM customers WHERE status = 'suspended'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM event_managers WHERE status = 'suspended'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM admins WHERE status = 'suspended'`).catch(() => ({ count: 0 }))
    ]);
    
    // Get today's date for new users calculation
    const today = new Date().toISOString().split('T')[0];
    const [newTodayCustomers, newTodayManagers, newTodayAdmins] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM customers WHERE DATE(created_at) = ?`, [today]).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM event_managers WHERE DATE(created_at) = ?`, [today]).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM admins WHERE DATE(created_at) = ?`, [today]).catch(() => ({ count: 0 }))
    ]);
    
    res.json({
      success: true,
      data: {
        totals: {
          customers: customers?.count || 0,
          eventManagers: managers?.count || 0,
          admins: admins?.count || 0,
          total: (customers?.count || 0) + (managers?.count || 0) + (admins?.count || 0)
        },
        active: {
          customers: activeCustomers?.count || 0,
          eventManagers: activeManagers?.count || 0,
          admins: activeAdmins?.count || 0,
          total: (activeCustomers?.count || 0) + (activeManagers?.count || 0) + (activeAdmins?.count || 0)
        },
        suspended: {
          customers: suspendedCustomers?.count || 0,
          eventManagers: suspendedManagers?.count || 0,
          admins: suspendedAdmins?.count || 0,
          total: (suspendedCustomers?.count || 0) + (suspendedManagers?.count || 0) + (suspendedAdmins?.count || 0)
        },
        newToday: {
          customers: newTodayCustomers?.count || 0,
          eventManagers: newTodayManagers?.count || 0,
          admins: newTodayAdmins?.count || 0,
          total: (newTodayCustomers?.count || 0) + (newTodayManagers?.count || 0) + (newTodayAdmins?.count || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get user stats' });
  }
});

// Get event statistics
router.get('/event-stats', async (req, res) => {
  try {
    const [totalEvents, activeEvents, pendingEvents, draftEvents] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM events`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE status = 'ACTIVE'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE status = 'PENDING'`).catch(() => ({ count: 0 })),
      dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE status = 'DRAFT'`).catch(() => ({ count: 0 }))
    ]);
    
    // Get events created today
    const today = new Date().toISOString().split('T')[0];
    const [eventsToday] = await Promise.all([
      dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE DATE(created_at) = ?`, [today]).catch(() => ({ count: 0 }))
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalEvents?.count || 0,
        active: activeEvents?.count || 0,
        pending: pendingEvents?.count || 0,
        draft: draftEvents?.count || 0,
        today: eventsToday?.count || 0
      }
    });
  } catch (error) {
    console.error('Error getting event stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get event stats' });
  }
});

// Clear old metrics data (maintenance endpoint)
router.delete('/clear-old-data', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Clear old performance metrics
    const perfDeleted = await dbOperations.run(
      `DELETE FROM performance_metrics WHERE created_at < ?`,
      [cutoffDate]
    );
    
    // Clear old security logs (keep high severity)
    const secDeleted = await dbOperations.run(
      `DELETE FROM security_logs WHERE created_at < ? AND severity NOT IN ('high', 'critical')`,
      [cutoffDate]
    );
    
    // Clear old user activity logs
    const activityDeleted = await dbOperations.run(
      `DELETE FROM user_activity_logs WHERE created_at < ?`,
      [cutoffDate]
    );
    
    res.json({
      success: true,
      message: 'Old data cleared successfully',
      deleted: {
        performanceMetrics: perfDeleted.changes || 0,
        securityLogs: secDeleted.changes || 0,
        userActivityLogs: activityDeleted.changes || 0
      }
    });
  } catch (error) {
    console.error('Error clearing old data:', error);
    res.status(500).json({ success: false, error: 'Failed to clear old data' });
  }
});

// Initialize metrics (admin endpoint)
router.post('/initialize-metrics', async (req, res) => {
  try {
    console.log('Manually initializing metrics system...');
    
    // Get or create metrics service
    let metricsService = req.app.locals.metricsService;
    if (!metricsService) {
      try {
        const MetricsService = require('../services/MetricsService');
        metricsService = new MetricsService();
        req.app.locals.metricsService = metricsService;
      } catch (error) {
        console.error('Failed to create MetricsService:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create metrics service',
          details: error.message 
        });
      }
    }
    
    // Start metrics collection
    await metricsService.startMetricsCollection();
    
    // Force update all metrics
    await metricsService.updateAllMetrics();
    
    res.json({
      success: true,
      message: 'Metrics system initialized and updated',
      metricsService: {
        isRunning: metricsService.isRunning,
        initialized: metricsService.initialized
      }
    });
  } catch (error) {
    console.error('Error initializing metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize metrics' });
  }
});

// Add this route before the module.exports line

// Get all system metrics in one endpoint
router.get('/system-metrics', async (req, res) => {
  try {
    // Get all metrics from system_metrics table
    const metrics = await dbOperations.all('SELECT * FROM system_metrics');
    
    // Format the response
    const formattedMetrics = {};
    metrics.forEach(metric => {
      formattedMetrics[metric.metric_key] = {
        metric_value: metric.metric_value,
        metric_type: metric.metric_type,
        unit: metric.unit,
        description: metric.description,
        updated_at: metric.updated_at
      };
    });
    
    // Add simulated metrics if the database is empty
    if (metrics.length === 0) {
      formattedMetrics['cpu_usage_percent'] = {
        metric_value: '25',
        metric_type: 'gauge',
        unit: '%',
        description: 'CPU Usage',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['memory_usage_percent'] = {
        metric_value: '45',
        metric_type: 'gauge',
        unit: '%',
        description: 'Memory Usage',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['disk_usage_percent'] = {
        metric_value: '52',
        metric_type: 'gauge',
        unit: '%',
        description: 'Disk Usage',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['database_size_mb'] = {
        metric_value: '125',
        metric_type: 'gauge',
        unit: 'MB',
        description: 'Database Size',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['avg_response_time'] = {
        metric_value: '125',
        metric_type: 'gauge',
        unit: 'ms',
        description: 'Average Response Time',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['active_sessions'] = {
        metric_value: '15',
        metric_type: 'gauge',
        unit: '',
        description: 'Active Sessions',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['api_requests_per_minute'] = {
        metric_value: '45',
        metric_type: 'gauge',
        unit: '/min',
        description: 'API Requests per Minute',
        updated_at: new Date().toISOString()
      };
      formattedMetrics['database_query_rate'] = {
        metric_value: '12',
        metric_type: 'gauge',
        unit: '/sec',
        description: 'Database Query Rate',
        updated_at: new Date().toISOString()
      };
    }
    
    res.json({
      success: true,
      data: formattedMetrics
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get system metrics',
      details: error.message 
    });
  }
});

module.exports = router;

module.exports = router;