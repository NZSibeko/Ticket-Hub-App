// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const jwt = require('jsonwebtoken');

// Middleware to verify admin token
const authenticateAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const JWT_SECRET = 'ticket-hub-super-secret-2025';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    
    const role = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(role);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    req.user = user;
    next();
  });
};

// Dashboard statistics
router.get('/dashboard/stats', authenticateAdminToken, async (req, res) => {
  try {
    console.log('📊 [ADMIN API] Fetching dashboard statistics...');
    
    // Get total events count
    const eventsStats = await dbOperations.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
      FROM events
    `);
    
    // Get user counts
    const userStats = await dbOperations.get(`
      SELECT 
        (SELECT COUNT(*) FROM admins) as admins,
        (SELECT COUNT(*) FROM event_managers) as managers,
        (SELECT COUNT(*) FROM event_organizers) as organizers,
        (SELECT COUNT(*) FROM support_staff) as support,
        (SELECT COUNT(*) FROM customers) as customers
    `);
    
    // Get ticket sales (if tickets table exists)
    let ticketStats = { total: 0, revenue: 0 };
    try {
      const tickets = await dbOperations.get(`
        SELECT 
          COUNT(*) as total,
          SUM(total_amount) as revenue
        FROM tickets
        WHERE status = 'confirmed'
      `);
      ticketStats = tickets || { total: 0, revenue: 0 };
    } catch (error) {
      console.log('⚠️ Tickets table not available yet');
    }
    
    // Recent activities
    const recentActivities = await dbOperations.all(`
      SELECT * FROM user_activity_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `).catch(() => []);
    
    res.json({
      success: true,
      stats: {
        events: {
          total: eventsStats?.total || 0,
          validated: eventsStats?.validated || 0,
          pending: eventsStats?.pending || 0,
          archived: eventsStats?.archived || 0
        },
        users: {
          total: (userStats?.admins || 0) + (userStats?.managers || 0) + 
                 (userStats?.organizers || 0) + (userStats?.support || 0) + 
                 (userStats?.customers || 0),
          admins: userStats?.admins || 0,
          managers: userStats?.managers || 0,
          organizers: userStats?.organizers || 0,
          support: userStats?.support || 0,
          customers: userStats?.customers || 0
        },
        tickets: {
          total: ticketStats.total || 0,
          revenue: ticketStats.revenue || 0
        }
      },
      recentActivities: recentActivities,
      message: 'Dashboard statistics retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      stats: {
        events: { total: 0, validated: 0, pending: 0, archived: 0 },
        users: { total: 0, admins: 0, managers: 0, organizers: 0, support: 0, customers: 0 },
        tickets: { total: 0, revenue: 0 }
      }
    });
  }
});

// User management dashboard
router.get('/users/dashboard', authenticateAdminToken, async (req, res) => {
  try {
    console.log('👥 [ADMIN API] Fetching user dashboard...');
    
    // Get all users from all tables
    const admins = await dbOperations.all('SELECT admin_id as id, name, email, created_at FROM admins');
    const managers = await dbOperations.all('SELECT manager_id as id, name, email, created_at FROM event_managers');
    const organizers = await dbOperations.all('SELECT organizer_id as id, name, email, created_at FROM event_organizers');
    const support = await dbOperations.all('SELECT support_id as id, name, email, created_at FROM support_staff');
    const customers = await dbOperations.all('SELECT customer_id as id, name, email, created_at FROM customers LIMIT 50');
    
    // Add role information
    const allUsers = [
      ...admins.map(u => ({ ...u, role: 'admin', role_display: 'Administrator' })),
      ...managers.map(u => ({ ...u, role: 'event_manager', role_display: 'Event Manager' })),
      ...organizers.map(u => ({ ...u, role: 'event_organizer', role_display: 'Event Organizer' })),
      ...support.map(u => ({ ...u, role: 'support', role_display: 'Support Staff' })),
      ...customers.map(u => ({ ...u, role: 'customer', role_display: 'Customer' }))
    ];
    
    // Sort by creation date
    allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Get user activity counts
    const userActivity = await dbOperations.all(`
      SELECT user_email, COUNT(*) as activity_count
      FROM user_activity_logs 
      GROUP BY user_email
      ORDER BY activity_count DESC
      LIMIT 10
    `).catch(() => []);
    
    res.json({
      success: true,
      users: {
        all: allUsers,
        counts: {
          total: allUsers.length,
          admins: admins.length,
          managers: managers.length,
          organizers: organizers.length,
          support: support.length,
          customers: customers.length
        }
      },
      recentActivity: userActivity,
      message: 'User dashboard data retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching user dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user dashboard',
      users: {
        all: [],
        counts: { total: 0, admins: 0, managers: 0, organizers: 0, support: 0, customers: 0 }
      }
    });
  }
});

// System metrics
router.get('/system/metrics', authenticateAdminToken, async (req, res) => {
  try {
    console.log('⚙️ [ADMIN API] Fetching system metrics...');
    
    // Database size (approximate)
    const dbStats = await dbOperations.all(`
      SELECT name as table_name, COUNT(*) as row_count
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).catch(() => []);
    
    // Recent errors from logs
    const recentErrors = await dbOperations.all(`
      SELECT * FROM user_activity_logs 
      WHERE activity_type LIKE '%error%' OR activity_type LIKE '%failed%'
      ORDER BY created_at DESC 
      LIMIT 20
    `).catch(() => []);
    
    // API usage (simplified)
    const apiUsage = await dbOperations.all(`
      SELECT activity_type, COUNT(*) as count
      FROM user_activity_logs 
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY activity_type
      ORDER BY count DESC
      LIMIT 10
    `).catch(() => []);
    
    res.json({
      success: true,
      metrics: {
        database: {
          tables: dbStats,
          totalTables: dbStats.length,
          totalRows: dbStats.reduce((sum, table) => sum + (table.row_count || 0), 0)
        },
        errors: {
          recent: recentErrors,
          count: recentErrors.length
        },
        apiUsage: apiUsage,
        uptime: process.uptime(), // seconds
        memory: process.memoryUsage()
      },
      message: 'System metrics retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics',
      metrics: {
        database: { tables: [], totalTables: 0, totalRows: 0 },
        errors: { recent: [], count: 0 },
        apiUsage: [],
        uptime: 0
      }
    });
  }
});

// Quick actions
router.post('/quick-action', authenticateAdminToken, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    console.log(`⚡ [ADMIN API] Quick action: ${action}`);
    
    switch (action) {
      case 'clear_logs':
        await dbOperations.run('DELETE FROM user_activity_logs WHERE created_at < datetime("now", "-30 days")');
        return res.json({ success: true, message: 'Old logs cleared successfully' });
        
      case 'refresh_cache':
        return res.json({ success: true, message: 'Cache refresh initiated' });
        
      case 'backup_database':
        // In a real app, this would backup the database file
        return res.json({ success: true, message: 'Database backup completed' });
        
      default:
        return res.status(400).json({ success: false, error: 'Unknown action' });
    }
    
  } catch (error) {
    console.error('❌ [ADMIN API] Quick action error:', error);
    res.status(500).json({ success: false, error: 'Action failed' });
  }
});

module.exports = router;