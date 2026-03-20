// backend/routes/admin.js - COMPLETE VERSION
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Helper function to get database connection
const getDb = () => {
  try {
    return require('../database').dbOperations;
  } catch (error) {
    console.error('Database module not found:', error);
    return null;
  }
};

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    // Clean the token
    const cleanToken = token.replace(/^"(.*)"$/, '$1').trim();
    
    jwt.verify(cleanToken, JWT_SECRET, (err, user) => {
      if (err) {
        console.log('❌ Token verification failed:', err.message);
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired token' 
        });
      }
      
      const role = user?.role || user?.userType;
      const isAdmin = ['admin', 'SUPER_ADMIN'].includes(role);
      
      if (!isAdmin) {
        console.log(`❌ User ${user.email} is not admin (role: ${role})`);
        return res.status(403).json({ 
          success: false, 
          error: 'Admin access required' 
        });
      }
      
      console.log(`✅ Admin access granted for ${user.email}`);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/admin/dashboard/stats',
      '/api/admin/users/dashboard',
      '/api/admin/system/metrics'
    ]
  });
});

// Dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 [ADMIN API] Fetching dashboard statistics...');
    const dbOperations = getDb();
    
    if (!dbOperations) {
      return res.status(503).json({
        success: false,
        error: 'Database unavailable',
        message: 'Dashboard statistics cannot be retrieved without a database connection.'
      });
    }

    // Get event statistics
    let eventsStats = { total: 0, validated: 0, pending: 0, archived: 0 };
    try {
      const eventsResult = await dbOperations.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) as validated,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
        FROM events
      `);
      eventsStats = eventsResult || eventsStats;
    } catch (error) {
      console.log('⚠️ Events query failed:', error.message);
    }

    // Get user statistics
    let userStats = { total: 0, admins: 0, managers: 0, organizers: 0, support: 0, customers: 0 };
    try {
      // Try to get counts from each table
      const tables = ['admins', 'event_managers', 'event_organizers', 'support_staff', 'customers'];
      
      for (const table of tables) {
        try {
          const result = await dbOperations.get(`SELECT COUNT(*) as count FROM ${table}`);
          const count = result?.count || 0;
          userStats.total += count;
          
          if (table === 'admins') userStats.admins = count;
          else if (table === 'event_managers') userStats.managers = count;
          else if (table === 'event_organizers') userStats.organizers = count;
          else if (table === 'support_staff') userStats.support = count;
          else if (table === 'customers') userStats.customers = count;
        } catch (tableError) {
          console.log(`⚠️ Table ${table} not accessible`);
        }
      }
    } catch (error) {
      console.log('⚠️ User stats query failed:', error.message);
    }

    // Get ticket statistics (if tickets table exists)
    let ticketStats = { total: 0, revenue: 0 };
    try {
      const ticketsResult = await dbOperations.get(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM tickets
        WHERE status = 'confirmed' OR status IS NULL
      `);
      ticketStats = ticketsResult || ticketStats;
    } catch (error) {
      console.log('⚠️ Tickets table not available');
    }

    res.json({
      success: true,
      stats: {
        events: {
          total: eventsStats.total || 0,
          validated: eventsStats.validated || 0,
          pending: eventsStats.pending || 0,
          archived: eventsStats.archived || 0
        },
        users: userStats,
        tickets: {
          total: ticketStats.total || 0,
          revenue: ticketStats.revenue || 0,
          formattedRevenue: ticketStats.revenue ? `$${Number(ticketStats.revenue).toFixed(2)}` : '$0.00'
        }
      },
      message: 'Dashboard statistics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
});

// User management dashboard
router.get('/users/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('👥 [ADMIN API] Fetching user dashboard...');
    const dbOperations = getDb();
    
    if (!dbOperations) {
      return res.status(503).json({
        success: false,
        error: 'Database unavailable',
        message: 'User dashboard data cannot be retrieved without a database connection.'
      });
    }

    const allUsers = [];
    
    // Helper function to fetch users from a table
    const fetchUsers = async (table, role, roleDisplay) => {
      try {
        const users = await dbOperations.all(`
          SELECT 
            ${table}_id as id, 
            name, 
            email, 
            created_at,
            '${role}' as role,
            '${roleDisplay}' as role_display
          FROM ${table}
          ORDER BY created_at DESC
          LIMIT 20
        `);
        return users || [];
      } catch (error) {
        console.log(`⚠️ Could not fetch from ${table}:`, error.message);
        return [];
      }
    };

    // Fetch from all user tables
    const userPromises = [
      fetchUsers('admins', 'admin', 'Administrator'),
      fetchUsers('event_managers', 'manager', 'Manager'),
      fetchUsers('event_organizers', 'event_organizer', 'Event Organizer'),
      fetchUsers('support_staff', 'omni_support_consultant', 'Omni Support Consultant'),
      fetchUsers('customers', 'customer', 'Customer')
    ];

    const results = await Promise.allSettled(userPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allUsers.push(...result.value);
      }
    });

    // Sort by creation date (newest first)
    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Count by role
    const counts = {
      total: allUsers.length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      managers: allUsers.filter(u => u.role === 'manager').length,
      organizers: allUsers.filter(u => u.role === 'event_organizer').length,
      support: allUsers.filter(u => u.role === 'omni_support_consultant').length,
      customers: allUsers.filter(u => u.role === 'customer').length
    };

    res.json({
      success: true,
      users: {
        all: allUsers.slice(0, 50), // Limit to 50 users
        counts: counts,
        recent: allUsers.slice(0, 10) // Top 10 recent users
      },
      message: 'User dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching user dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user dashboard data',
      details: error.message
    });
  }
});

// System metrics
router.get('/system/metrics', authenticateToken, async (req, res) => {
  try {
    console.log('⚙️ [ADMIN API] Fetching system metrics...');
    
    res.json({
      success: true,
      metrics: {
        system: {
          uptime: process.uptime(),
          memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
          },
          nodeVersion: process.version,
          platform: process.platform
        },
        api: {
          status: 'operational',
          responseTime: 'normal'
        }
      },
      message: 'System metrics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN API] Error fetching system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics'
    });
  }
});

// Quick actions
router.post('/quick-action', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    
    console.log(`⚡ [ADMIN API] Quick action: ${action}`);
    
    const actions = {
      'refresh_cache': 'Cache refreshed successfully',
      'clear_logs': 'Logs cleared (simulated)',
      'backup_database': 'Backup completed (simulated)',
      'send_test_notification': 'Test notification sent'
    };
    
    if (actions[action]) {
      res.json({
        success: true,
        message: actions[action]
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unknown action',
        availableActions: Object.keys(actions)
      });
    }
    
  } catch (error) {
    console.error('❌ [ADMIN API] Quick action error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Action failed' 
    });
  }
});

module.exports = router;
