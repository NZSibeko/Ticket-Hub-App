const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// --- DEPENDENCY SETUP ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Middleware injection to get database access (assumes app.locals.db is set by server.js)
router.use(async (req, res, next) => {
    const dbOperations = req.app.locals.db;
    if (!dbOperations) {
        return res.status(500).json({ success: false, error: 'Database operations not available via router context' });
    }
    req.dbOperations = dbOperations;
    next();
});

// Re-declare middlewares for file self-sufficiency
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => { 
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const checkUserStatus = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    try {
        const user = req.user;
        let userTable, userIdColumn;
        
        if (user.role === 'customer' || user.userType === 'customer') {
            userTable = 'customers';
            userIdColumn = 'customer_id';
        } else if (['event_manager','manager'].includes(user.role) || ['event_manager','manager'].includes(user.userType)) {
            userTable = 'event_managers';
            userIdColumn = 'manager_id';
        } else if (user.role === 'admin' || user.userType === 'admin' || user.role === 'SUPER_ADMIN') {
            userTable = 'admins';
            userIdColumn = 'admin_id';
        } else if (['support','omni_support_consultant','event_support_consultant','support_staff'].includes(user.role) || ['support','omni_support_consultant','event_support_consultant','support_staff'].includes(user.userType)) {
            userTable = 'support_staff';
            userIdColumn = 'support_id';
        } else if (user.role === 'event_organizer' || user.userType === 'event_organizer') {
            userTable = 'event_organizers';
            userIdColumn = 'organizer_id';
        } else {
            return next();
        }

        const dbUser = await req.dbOperations.get(
            `SELECT status FROM ${userTable} WHERE ${userIdColumn} = ?`,
            [user[userIdColumn] || user.userId]
        );

        if (dbUser && dbUser.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account has been suspended. Please contact administrator.' 
            });
        }

        if (dbUser && dbUser.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account is inactive. Please contact administrator.' 
            });
        }

        next();
    } catch (err) {
        console.error('User status check error:', err);
        next(); 
    }
};

const requireAdminOrManager = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (!['admin', 'SUPER_ADMIN', 'event_manager', 'manager'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Admin or Manager access required' });
  }
  next();
};

// --- METRICS ROUTES ---

// Metrics dashboard endpoint
router.get('/dashboard-metrics', authenticateToken, checkUserStatus, requireAdminOrManager, async (req, res) => {
  try {
    if (!req.dbOperations) {
      return res.status(500).json({ success: false, error: 'Database not ready' });
    }

    // Create missing tables first (This should ideally happen once at startup, but we keep it for safety)
    const createMissingMetricsTables = async () => {
        try {
            await req.dbOperations.run(`
              CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_key TEXT UNIQUE NOT NULL,
                metric_value TEXT NOT NULL,
                metric_type TEXT DEFAULT 'gauge',
                unit TEXT,
                description TEXT,
                updated_at TEXT DEFAULT (datetime('now')),
                created_at TEXT DEFAULT (datetime('now'))
              )`);

            await req.dbOperations.run(`
              CREATE TABLE IF NOT EXISTS platform_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                setting_type TEXT DEFAULT 'string',
                updated_at TEXT DEFAULT (datetime('now')),
                created_at TEXT DEFAULT (datetime('now'))
              )`);

            await req.dbOperations.run(`
              INSERT OR IGNORE INTO platform_settings (setting_key, setting_value, setting_type)
              VALUES
                ('platform_name', 'Ticket Hub', 'string'),
                ('maintenance_mode', 'false', 'boolean'),
                ('registration_enabled', 'true', 'boolean'),
                ('email_notifications', 'true', 'boolean'),
                ('two_factor_required', 'false', 'boolean'),
                ('max_upload_size', '10 MB', 'string'),
                ('session_timeout', '30 minutes', 'string')
            `);
        } catch (error) { console.error('Error during metrics table creation:', error.message); }
    };
    await createMissingMetricsTables();


    const safeGet = async (query: string, fallback: Record<string, any> = {}) => {
      try {
        return (await req.dbOperations.get(query)) || fallback;
      } catch (error) {
        console.log('Metrics safeGet query error:', error.message);
        return fallback;
      }
    };

    const safeAll = async (query: string, fallback: any[] = []) => {
      try {
        return (await req.dbOperations.all(query)) || fallback;
      } catch (error) {
        console.log('Metrics safeAll query error:', error.message);
        return fallback;
      }
    };

    const tableExists = async (tableName: string) => {
      const row = await safeGet(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName.replace(/'/g, "''")}'`,
        {}
      );
      return Boolean(row?.name);
    };

    const parseStructuredList = (value: any) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    };

    const metrics = await safeAll('SELECT * FROM system_metrics');
    const metricMap: Record<string, any> = {};
    metrics.forEach((m: any) => {
      metricMap[m.metric_key] = m.metric_value;
    });

    const settingsRows = await safeAll('SELECT setting_key, setting_value, setting_type FROM platform_settings');
    const settingsMap = settingsRows.reduce((acc: Record<string, any>, row: any) => {
      const key = row.setting_key;
      if (!key) return acc;
      if (row.setting_type === 'boolean') {
        acc[key] = String(row.setting_value).toLowerCase() === 'true';
      } else if (row.setting_type === 'number') {
        acc[key] = Number(row.setting_value || 0);
      } else {
        acc[key] = row.setting_value;
      }
      return acc;
    }, {});

    const userUnionQuery = `
      SELECT admin_id as id, name, email, phone, role, status, last_login, created_at FROM admins
      UNION ALL
      SELECT manager_id as id, name, email, phone, role, status, last_login, created_at FROM event_managers
      UNION ALL
      SELECT customer_id as id, TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) as name, email, phone, role, status, last_login, created_at FROM customers
      UNION ALL
      SELECT support_id as id, name, email, phone, role, status, last_login, created_at FROM support_staff
      UNION ALL
      SELECT organizer_id as id, name, email, phone, role, status, last_login, created_at FROM event_organizers
    `;

    const userCounts = await safeGet(`
      SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'active')) = 'active' THEN 1 ELSE 0 END), 0) as active_users,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'active')) != 'active' THEN 1 ELSE 0 END), 0) as inactive_users,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('suspended', 'blocked', 'inactive') THEN 1 ELSE 0 END), 0) as suspended_users,
        COALESCE(SUM(CASE WHEN datetime(created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) as new_this_week,
        COALESCE(SUM(CASE WHEN datetime(created_at) >= datetime('now', '-14 days') AND datetime(created_at) < datetime('now', '-7 days') THEN 1 ELSE 0 END), 0) as previous_week
      FROM (${userUnionQuery})
    `, {
      total_users: 0,
      active_users: 0,
      inactive_users: 0,
      suspended_users: 0,
      new_this_week: 0,
      previous_week: 0
    });

    const roleCounts = await safeGet(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM customers), 0) as total_customers,
        COALESCE((SELECT COUNT(*) FROM admins), 0) as total_admins,
        COALESCE((SELECT COUNT(*) FROM event_managers), 0) as total_managers,
        COALESCE((SELECT COUNT(*) FROM support_staff), 0) as total_support,
        COALESCE((SELECT COUNT(*) FROM event_organizers), 0) as total_organizers
    `, {
      total_customers: 0,
      total_admins: 0,
      total_managers: 0,
      total_support: 0,
      total_organizers: 0
    });

    const latestUsers = await safeAll(`
      SELECT id, name, email, phone, role, status, last_login, created_at
      FROM (${userUnionQuery})
      ORDER BY datetime(created_at) DESC
      LIMIT 8
    `);

    const eventCounts = await safeGet(`
      SELECT 
        COALESCE(COUNT(*), 0) as total_events,
        COALESCE(SUM(CASE WHEN archived = 0 AND LOWER(COALESCE(status, '')) IN ('validated', 'active', 'approved') THEN 1 ELSE 0 END), 0) as active_events,
        COALESCE(SUM(CASE WHEN archived = 0 AND LOWER(COALESCE(status, '')) IN ('pending', 'draft', 'submitted') THEN 1 ELSE 0 END), 0) as pending_events,
        COALESCE(SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END), 0) as archived_events
      FROM events
    `, {
      total_events: 0,
      active_events: 0,
      pending_events: 0,
      archived_events: 0
    });

    const pendingEvents = await safeAll(`
      SELECT
        event_id as id,
        event_name as name,
        COALESCE(organizer_name, created_by, 'Unknown') as organizer,
        created_at as submitted,
        COALESCE(category, 'General') as category,
        LOWER(COALESCE(status, 'pending')) as status
      FROM events
      WHERE archived = 0
        AND LOWER(COALESCE(status, 'pending')) IN ('pending', 'draft', 'submitted')
      ORDER BY datetime(created_at) DESC
      LIMIT 8
    `);

    const hasSupportTickets = await tableExists('support_tickets');
    const issueStats = hasSupportTickets
      ? await safeGet(`
          SELECT
            COUNT(*) as reported_issues,
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, 'open')) IN ('resolved', 'closed') THEN 1 ELSE 0 END), 0) as resolved_issues,
            COALESCE(ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24 END), 1), 0) as avg_resolution_hours
          FROM support_tickets
        `, { reported_issues: 0, resolved_issues: 0, avg_resolution_hours: 0 })
      : { reported_issues: 0, resolved_issues: 0, avg_resolution_hours: 0 };

    const securitySummary = await safeGet(`
      SELECT
        COALESCE(SUM(CASE WHEN datetime(created_at) >= datetime('now', '-1 day') AND LOWER(COALESCE(event_type, '')) IN ('failed_login', 'login_failed', 'authentication_failed') THEN 1 ELSE 0 END), 0) as failed_logins,
        COALESCE(SUM(CASE WHEN datetime(created_at) >= datetime('now', '-1 day') AND LOWER(COALESCE(severity, 'info')) IN ('high', 'critical') THEN 1 ELSE 0 END), 0) as suspicious_activity
      FROM security_logs
    `, { failed_logins: 0, suspicious_activity: 0 });

    const passwordResetSummary = await safeGet(`
      SELECT
        COALESCE(COUNT(*), 0) as resets
      FROM user_activity_logs
      WHERE LOWER(COALESCE(activity_type, '')) LIKE 'password_reset%'
        AND datetime(created_at) >= datetime('now', '-1 day')
    `, { resets: 0 });

    const blockedIpSummary = await safeGet(`
      SELECT COALESCE(COUNT(*), 0) as active_blocked
      FROM blocked_ips
      WHERE is_active = 1
    `, { active_blocked: 0 });

    const securityLogs = await safeAll(`
      SELECT
        id,
        COALESCE(event_type, 'security_event') as type,
        COALESCE(user_email, 'system') as user,
        COALESCE(ip_address, 'N/A') as ip,
        created_at as time,
        COALESCE(severity, 'info') as severity,
        COALESCE(details, event_type, 'Security event') as details
      FROM security_logs
      ORDER BY datetime(created_at) DESC
      LIMIT 12
    `);

    const blockedIPsList = await safeAll(`
      SELECT
        ip_address as ip,
        COALESCE(reason, 'Suspicious activity') as reason,
        created_at as blocked,
        COALESCE(attempts, 0) as attempts
      FROM blocked_ips
      WHERE is_active = 1
      ORDER BY datetime(created_at) DESC
      LIMIT 10
    `);

    const recentActivity = await safeAll(`
      SELECT
        id,
        COALESCE(activity_type, 'activity') as type,
        COALESCE(user_email, 'system') as user,
        created_at as time,
        COALESCE(activity_details, activity_type, 'Activity recorded') as details
      FROM user_activity_logs
      ORDER BY datetime(created_at) DESC
      LIMIT 12
    `);

    const alerts = await safeAll(`
      SELECT
        id,
        COALESCE(alert_type, 'system') as type,
        COALESCE(title, 'System Alert') as title,
        COALESCE(message, '') as message,
        COALESCE(severity, 'medium') as severity,
        created_at as time,
        affected_items,
        recommendations
      FROM system_alerts
      ORDER BY datetime(created_at) DESC
      LIMIT 8
    `);

    const logs = await safeAll(`
      SELECT *
      FROM (
        SELECT
          id,
          created_at as timestamp,
          UPPER(CASE
            WHEN LOWER(COALESCE(severity, 'info')) IN ('critical', 'high') THEN 'ERROR'
            WHEN LOWER(COALESCE(severity, 'info')) = 'medium' THEN 'WARN'
            ELSE 'INFO'
          END) as level,
          'security' as module,
          COALESCE(details, event_type, 'Security event') as message,
          COALESCE(user_email, 'system') as user
        FROM security_logs
        UNION ALL
        SELECT
          id + 1000000 as id,
          created_at as timestamp,
          'INFO' as level,
          'activity' as module,
          COALESCE(activity_details, activity_type, 'User activity') as message,
          COALESCE(user_email, 'system') as user
        FROM user_activity_logs
      )
      ORDER BY datetime(timestamp) DESC
      LIMIT 30
    `);

    const sizeResult = await safeGet(`
      SELECT (page_count * page_size) / (1024.0 * 1024.0) as size_mb
      FROM pragma_page_count(), pragma_page_size()
    `, { size_mb: 0 });

    const latestBackup = await safeGet(`
      SELECT backup_type, status, size_mb, duration_seconds, details, created_at
      FROM backup_history
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `, {});

    const backupHistory = await safeAll(`
      SELECT backup_type, status, size_mb, duration_seconds, details, created_at
      FROM backup_history
      ORDER BY datetime(created_at) DESC
      LIMIT 10
    `);

    const latestIncident = await safeGet(`
      SELECT incident, created_at
      FROM (
        SELECT title || ': ' || message as incident, created_at
        FROM system_alerts
        WHERE LOWER(COALESCE(severity, 'medium')) IN ('high', 'critical')
        UNION ALL
        SELECT COALESCE(details, event_type, 'Security incident') as incident, created_at
        FROM security_logs
        WHERE LOWER(COALESCE(severity, 'info')) IN ('high', 'critical')
      )
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `, {});

    const latestSystemStatus = await safeGet(`
      SELECT status, response_time_ms, last_check, error_message
      FROM system_uptime
      ORDER BY datetime(last_check) DESC
      LIMIT 1
    `, {});

    const unresolvedAlertSummary = await safeGet(`
      SELECT
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(severity, 'medium')) = 'critical' AND COALESCE(acknowledged, 0) = 0 THEN 1 ELSE 0 END), 0) as critical_alerts,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(severity, 'medium')) = 'high' AND COALESCE(acknowledged, 0) = 0 THEN 1 ELSE 0 END), 0) as high_alerts
      FROM system_alerts
    `, { critical_alerts: 0, high_alerts: 0 });

    const totalUsers = Number(userCounts.total_users || 0);
    const currentWeekUsers = Number(userCounts.new_this_week || 0);
    const previousWeekUsers = Number(userCounts.previous_week || 0);
    const userGrowthRate = previousWeekUsers > 0
      ? Number((((currentWeekUsers - previousWeekUsers) / previousWeekUsers) * 100).toFixed(1))
      : currentWeekUsers > 0
        ? 100
        : 0;

    const responseTimeMs = Number(
      metricMap.api_avg_response_time_ms ||
      metricMap.avg_response_time ||
      latestSystemStatus.response_time_ms ||
      0
    );
    const systemStatus = String(latestSystemStatus.status || 'up').toLowerCase() !== 'up'
      ? 'critical'
      : Number(unresolvedAlertSummary.critical_alerts || 0) > 0
        ? 'critical'
        : Number(unresolvedAlertSummary.high_alerts || 0) > 0
          ? 'warning'
          : 'healthy';

    const dashboardData = {
      systemHealth: {
        status: systemStatus,
        uptime: `${metricMap.system_uptime_days || 0} days`,
        lastIncident: latestIncident?.incident || 'No incidents',
        responseTime: `${responseTimeMs} ms`
      },
      users: {
        total: totalUsers,
        active: Number(userCounts.active_users || 0),
        inactive: Number(userCounts.inactive_users || 0),
        newThisWeek: currentWeekUsers,
        suspended: Number(userCounts.suspended_users || 0),
        admins: Number(roleCounts.total_admins || 0),
        eventManagers: Number(roleCounts.total_managers || 0),
        customers: Number(roleCounts.total_customers || 0),
        growthRate: userGrowthRate,
        userList: latestUsers.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          joined: user.created_at,
          lastActive: user.last_login,
          phone: user.phone,
          avatar: null,
          country: null
        }))
      },
      security: {
        failedLogins: Number(securitySummary.failed_logins || metricMap.failed_login_attempts_24h || 0),
        suspiciousActivity: Number(securitySummary.suspicious_activity || 0),
        blockedIPs: Number(blockedIpSummary.active_blocked || metricMap.active_blocked_ips || 0),
        twoFactorEnabled: 0,
        passwordResets: Number(passwordResetSummary.resets || metricMap.password_resets_24h || 0),
        securityLogs,
        blockedIPsList
      },
      platform: {
        totalEvents: Number(eventCounts.total_events || 0),
        activeEvents: Number(eventCounts.active_events || 0),
        pendingApprovals: Number(eventCounts.pending_events || 0),
        reportedIssues: Number(issueStats.reported_issues || 0),
        resolvedIssues: Number(issueStats.resolved_issues || 0),
        averageResolutionTime: `${Number(issueStats.avg_resolution_hours || 0)} hours`,
        pendingEvents
      },
      database: {
        size: `${Number(sizeResult.size_mb || metricMap.database_size_mb || 0).toFixed(2)} MB`,
        backupStatus: latestBackup?.status || 'unknown',
        lastBackup: latestBackup?.created_at || 'Never',
        queries: Number(metricMap.database_query_rate || metricMap.db_query_rate || 0),
        slowQueries: Number(metricMap.db_slow_queries_1h || metricMap.database_slow_queries_last_hour || 0),
        backupHistory: backupHistory.map((backup: any) => ({
          date: backup.created_at,
          size: backup.size_mb != null ? `${backup.size_mb} MB` : '0 MB',
          duration: backup.duration_seconds != null ? `${backup.duration_seconds} sec` : '0 sec',
          status: backup.status,
          type: backup.backup_type || 'automatic',
          details: backup.details
        }))
      },
      settings: {
        platformName: settingsMap.platform_name || 'Ticket Hub',
        maintenanceMode: settingsMap.maintenance_mode ?? false,
        registrationEnabled: settingsMap.registration_enabled ?? true,
        emailNotifications: settingsMap.email_notifications ?? true,
        twoFactorRequired: settingsMap.two_factor_required ?? false,
        maxUploadSize: settingsMap.max_upload_size || '10 MB',
        sessionTimeout: settingsMap.session_timeout || '30 minutes'
      },
      logs,
      recentActivity,
      alerts: alerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        time: alert.time,
        details: alert.message,
        affectedItems: parseStructuredList(alert.affected_items),
        recommendations: parseStructuredList(alert.recommendations)
      }))
    };
    
    res.json({
      success: true,
      data: dashboardData,
      metrics: {
        system_uptime: metricMap.system_uptime_days || '0',
        system_uptime_days: Number(metricMap.system_uptime_days || 0),
        active_users: Number(userCounts.active_users || 0),
        inactive_users: Number(userCounts.inactive_users || 0),
        new_users_today: Number(metricMap.new_users_today || 0),
        total_events: Number(eventCounts.total_events || 0),
        active_events: Number(eventCounts.active_events || 0),
        pending_events: Number(eventCounts.pending_events || 0),
        database_size: `${Number(sizeResult.size_mb || metricMap.database_size_mb || 0).toFixed(2)} MB`,
        database_size_mb: Number(sizeResult.size_mb || metricMap.database_size_mb || 0),
        avg_response_time: responseTimeMs,
        api_avg_response_time_ms: Number(metricMap.api_avg_response_time_ms || responseTimeMs || 0),
        failed_logins: Number(securitySummary.failed_logins || metricMap.failed_login_attempts_24h || 0),
        password_resets_24h: Number(passwordResetSummary.resets || metricMap.password_resets_24h || 0),
        active_blocked_ips: Number(blockedIpSummary.active_blocked || metricMap.active_blocked_ips || 0),
        total_customers: Number(roleCounts.total_customers || 0),
        total_admins: Number(roleCounts.total_admins || 0),
        total_managers: Number(roleCounts.total_managers || 0),
        total_support: Number(roleCounts.total_support || 0),
        total_organizers: Number(roleCounts.total_organizers || 0),
        cpu_usage_percent: Number(metricMap.system_cpu_usage_percent || metricMap.cpu_usage_percent || 0),
        memory_usage_percent: Number(metricMap.system_memory_usage_percent || metricMap.memory_usage_percent || 0),
        disk_usage_percent: Number(metricMap.system_disk_usage_percent || metricMap.disk_usage_percent || 0),
        api_requests_per_minute: Number(metricMap.api_requests_per_minute || 0),
        database_query_rate: Number(metricMap.database_query_rate || metricMap.db_query_rate || 0),
        db_slow_queries_1h: Number(metricMap.db_slow_queries_1h || metricMap.database_slow_queries_last_hour || 0),
        active_sessions: Number(metricMap.active_sessions || 0)
      },
      alerts: dashboardData.alerts,
      securityLogs,
      blockedIPs: blockedIPsList,
      backupHistory: dashboardData.database.backupHistory,
      recentActivity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Metrics dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

// Database comprehensive metrics endpoint
router.get('/database-comprehensive', authenticateToken, checkUserStatus, requireAdminOrManager, async (req, res) => {
  try {
    if (!req.dbOperations) {
      return res.status(500).json({ success: false, error: 'Database not ready' });
    }

    const safeGet = async (query: string, fallback: Record<string, any> = {}) => {
      try {
        return (await req.dbOperations.get(query)) || fallback;
      } catch (error) {
        console.log('Database comprehensive safeGet error:', error.message);
        return fallback;
      }
    };

    // Get table info
    const tables = await req.dbOperations.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");

    // Get size info
    let sizeMb = '0.00';
    try {
      const sizeResult = await req.dbOperations.get(`
        SELECT 
          (page_count * page_size) / (1024 * 1024) as size_mb
        FROM pragma_page_count(), pragma_page_size()
      `);
      sizeMb = sizeResult?.size_mb?.toFixed(2) || '0.00';
    } catch (err) {
      console.log('Database size query error:', err.message);
    }

    let totalRows = 0;
    const tableDetails = [];
    for (const table of tables) {
      const tableName = String(table.name || '').replace(/"/g, '""');
      const rowCount = await safeGet(`SELECT COUNT(*) as count FROM "${tableName}"`, { count: 0 });
      const rows = Number(rowCount.count || 0);
      totalRows += rows;
      tableDetails.push({
        name: table.name,
        rows
      });
    }

    const backupCount = await safeGet('SELECT COUNT(*) as count FROM backup_history', { count: 0 });
    const latestBackup = await safeGet(`
      SELECT status, backup_type, created_at, size_mb, duration_seconds
      FROM backup_history
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `, {});

    const integrityCheck = await safeGet('PRAGMA integrity_check', { integrity_check: 'OK' });
    const avgResponseTime = Number((await safeGet("SELECT metric_value FROM system_metrics WHERE metric_key = 'api_avg_response_time_ms'", { metric_value: 0 })).metric_value || 0);

    res.json({
      success: true,
      data: {
        statistics: {
          totalTables: tables.length,
          totalRows,
          actualFileSizeMB: `${sizeMb} MB`
        },
        tables: tableDetails,
        backup: {
          count: Number(backupCount.count || 0),
          lastBackup: latestBackup?.created_at || 'Never',
          lastStatus: latestBackup?.status || 'unknown'
        },
        health: {
          integrityCheck: integrityCheck.integrity_check || 'OK',
          avgResponseTimeMs: avgResponseTime
        }
      },
      database: {
        table_count: tables.length,
        total_records: totalRows,
        size: `${sizeMb} MB`,
        tables: tables.map(t => t.name),
        backup_count: Number(backupCount.count || 0),
        last_backup: latestBackup?.created_at || 'Never',
        integrity_check: integrityCheck.integrity_check || 'OK',
        performance_status: avgResponseTime > 800 ? 'Degraded' : avgResponseTime > 400 ? 'Moderate' : 'Good'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database comprehensive metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch database metrics' });
  }
});

module.exports = router;
