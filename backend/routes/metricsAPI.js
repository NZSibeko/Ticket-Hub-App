// backend/routes/metricsAPI.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const MetricsService = require('../services/MetricsService');

const metricsService = new MetricsService();

// Start metrics collection
metricsService.startMetricsCollection();

// Get all real-time metrics
router.get('/dashboard-metrics', async (req, res) => {
  try {
    const metricsData = await metricsService.getDashboardData();
    
    // Get user statistics
    const [customers, managers, admins] = await Promise.all([
      dbOperations.all(`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`),
      dbOperations.all(`SELECT COUNT(*) as count FROM event_managers WHERE status = 'active'`),
      dbOperations.all(`SELECT COUNT(*) as count FROM admins WHERE status = 'active'`)
    ]);
    
    const totalUsers = (customers[0]?.count || 0) + 
                      (managers[0]?.count || 0) + 
                      (admins[0]?.count || 0);
    
    // Get suspended users
    const [suspendedCustomers, suspendedManagers, suspendedAdmins] = await Promise.all([
      dbOperations.all(`SELECT COUNT(*) as count FROM customers WHERE status = 'suspended'`),
      dbOperations.all(`SELECT COUNT(*) as count FROM event_managers WHERE status = 'suspended'`),
      dbOperations.all(`SELECT COUNT(*) as count FROM admins WHERE status = 'suspended'`)
    ]);
    
    const suspendedUsers = (suspendedCustomers[0]?.count || 0) + 
                          (suspendedManagers[0]?.count || 0) + 
                          (suspendedAdmins[0]?.count || 0);
    
    // Get new users this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [newCustomers, newManagers, newAdmins] = await Promise.all([
      dbOperations.all(`SELECT COUNT(*) as count FROM customers WHERE created_at >= ?`, [oneWeekAgo]),
      dbOperations.all(`SELECT COUNT(*) as count FROM event_managers WHERE created_at >= ?`, [oneWeekAgo]),
      dbOperations.all(`SELECT COUNT(*) as count FROM admins WHERE created_at >= ?`, [oneWeekAgo])
    ]);
    
    const newThisWeek = (newCustomers[0]?.count || 0) + 
                       (newManagers[0]?.count || 0) + 
                       (newAdmins[0]?.count || 0);
    
    // Get recent users for list
    const recentUsers = await getRecentUsers();
    
    // Calculate growth rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [oldCustomers, oldManagers, oldAdmins] = await Promise.all([
      dbOperations.all(`SELECT COUNT(*) as count FROM customers WHERE created_at < ?`, [thirtyDaysAgo]),
      dbOperations.all(`SELECT COUNT(*) as count FROM event_managers WHERE created_at < ?`, [thirtyDaysAgo]),
      dbOperations.all(`SELECT COUNT(*) as count FROM admins WHERE created_at < ?`, [thirtyDaysAgo])
    ]);
    
    const oldTotal = (oldCustomers[0]?.count || 0) + 
                    (oldManagers[0]?.count || 0) + 
                    (oldAdmins[0]?.count || 0);
    
    const growthRate = oldTotal > 0 ? Math.round(((totalUsers - oldTotal) / oldTotal) * 100) : 100;
    
    // Get platform statistics
    const [totalEvents, activeEvents, pendingEvents] = await Promise.all([
      dbOperations.all(`SELECT COUNT(*) as count FROM events`),
      dbOperations.all(`SELECT COUNT(*) as count FROM events WHERE status = 'ACTIVE'`),
      dbOperations.all(`SELECT COUNT(*) as count FROM events WHERE status = 'PENDING'`)
    ]);
    
    // Format dashboard data
    const dashboardData = {
      systemHealth: {
        status: metricsData.alerts.length > 0 ? 'warning' : 'healthy',
        uptime: `${metricsData.metrics.system_uptime_days?.value || 0} days`,
        lastIncident: metricsData.alerts.length > 0 ? metricsData.alerts[0].time : 'No incidents',
        responseTime: `${metricsData.metrics.avg_response_time?.value || 0} ms`
      },
      security: {
        failedLogins: parseInt(metricsData.metrics.failed_login_attempts_24h?.value || 0),
        suspiciousActivity: metricsData.securityLogs.filter(log => 
          log.severity === 'high' || log.severity === 'medium'
        ).length,
        blockedIPs: parseInt(metricsData.metrics.active_blocked_ips?.value || 0),
        twoFactorEnabled: 0, // Track this in user table if implemented
        passwordResets: parseInt(metricsData.metrics.password_resets_24h?.value || 0),
        securityLogs: metricsData.securityLogs.slice(0, 10),
        blockedIPsList: metricsData.blockedIPs
      },
      database: {
        size: `${metricsData.metrics.database_size_mb?.value || 0} MB`,
        backupStatus: metricsData.metrics.last_backup_status?.value || 'pending',
        lastBackup: metricsData.metrics.last_backup_time?.value || 'Never',
        queries: 0, // Would need query logging
        slowQueries: 0, // Would need query analysis
        backupHistory: metricsData.backupHistory.slice(0, 5)
      },
      platform: {
        totalEvents: totalEvents[0]?.count || 0,
        activeEvents: activeEvents[0]?.count || 0,
        pendingApprovals: pendingEvents[0]?.count || 0,
        reportedIssues: 0,
        resolvedIssues: 0,
        averageResolutionTime: '0 hours',
        pendingEvents: await getPendingEvents()
      },
      users: {
        total: totalUsers,
        active: totalUsers - suspendedUsers,
        inactive: 0,
        newThisWeek: newThisWeek,
        suspended: suspendedUsers,
        growthRate: growthRate,
        admins: admins[0]?.count || 0,
        eventManagers: managers[0]?.count || 0,
        customers: customers[0]?.count || 0,
        userList: recentUsers.slice(0, 8)
      },
      alerts: metricsData.alerts,
      recentActivity: metricsData.recentActivity.slice(0, 10),
      logs: await getSystemLogs()
    };
    
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to load metrics' });
  }
});

// Get system logs
async function getSystemLogs() {
  try {
    const logs = await dbOperations.all(`
      SELECT * FROM (
        SELECT 
          created_at as timestamp,
          'SECURITY' as level,
          'Security' as module,
          details as message,
          user_email as user
        FROM security_logs
        WHERE severity IN ('high', 'critical')
        
        UNION ALL
        
        SELECT 
          created_at as timestamp,
          'INFO' as level,
          'Activity' as module,
          activity_details as message,
          user_email as user
        FROM user_activity_logs
        WHERE activity_type IN ('login', 'logout', 'password_reset')
        
        UNION ALL
        
        SELECT 
          created_at as timestamp,
          'WARNING' as level,
          'System' as module,
          message,
          'system' as user
        FROM system_alerts
        WHERE acknowledged = 0
      )
      ORDER BY timestamp DESC
      LIMIT 20
    `);
    
    return logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      module: log.module,
      message: log.message,
      user: log.user
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
        phone as phone_number
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
        phone as phone_number
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
        phone as phone_number
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

module.exports = router;