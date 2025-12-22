// backend/server.js - UPDATED WITH TOKEN VALIDATION ENDPOINT
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Database setup
const db = require('./database');
const { 
  dbOperations, 
  connectDatabase, 
  initializeTables, 
  ensureDefaultEventManager, 
  ensureDefaultAdmin, 
  ensureDefaultCustomer 
} = db;

// Initialize MetricsService - FORCE REAL MODE
let MetricsService = null;
let metricsService = null;
let metricsInitialized = false;

console.log('Loading MetricsService...');
try {
  MetricsService = require('./services/MetricsService');
  console.log('✓ REAL MetricsService module loaded');
  
  // Test if we can create an instance
  const testService = new MetricsService();
  if (testService && typeof testService.startMetricsCollection === 'function') {
    console.log('✓ MetricsService is a valid constructor');
  } else {
    throw new Error('MetricsService is not a valid constructor');
  }
} catch (error) {
  console.error('❌ CRITICAL: Failed to load MetricsService:', error.message);
  console.error('Error stack:', error.stack);
  console.log('\nThe server will continue but metrics will not work properly.');
  console.log('Please check that backend/services/MetricsService.js exists and is valid.\n');
  
  // Create a minimal fallback that at least logs errors
  MetricsService = class EmergencyMetricsService {
    constructor() { 
      console.log('EMERGENCY: Using EmergencyMetricsService');
      this.startTime = new Date();
      this.isRunning = false;
      this.initialized = false;
    }
    
    async startMetricsCollection() { 
      console.log('EMERGENCY: Cannot start metrics collection - real service failed');
      this.isRunning = false;
      this.initialized = false;
      return Promise.resolve(); 
    }
    
    stop() { 
      console.log('EMERGENCY: stop called'); 
      this.isRunning = false;
    }
    
    async logSecurityEvent(eventData) { 
      console.log('EMERGENCY: Security event (NOT LOGGED):', eventData.event_type);
      return Promise.resolve(); 
    }
    
    async logUserActivity(activityData) { 
      console.log('EMERGENCY: User activity (NOT LOGGED):', activityData.activity_type);
      return Promise.resolve(); 
    }
    
    async logPerformance(endpoint, responseTime, statusCode) { 
      return Promise.resolve(); 
    }
    
    async getDashboardData() { 
      console.log('EMERGENCY: getDashboardData called - returning empty data');
      return Promise.resolve({
        metrics: {},
        alerts: [],
        securityLogs: [],
        blockedIPs: [],
        backupHistory: [],
        recentActivity: []
      });
    }
    
    async updateAllMetrics() {
      console.log('EMERGENCY: updateAllMetrics called - doing nothing');
      return Promise.resolve();
    }
  };
}

const app = express();

// CORS - Allow all your frontend origins with DELETE method
app.use(cors({
  origin: [
    'http://localhost:8082',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://localhost:8082',
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-ID']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Proper preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Session-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Hardcoded JWT secret
const JWT_SECRET = 'ticket-hub-super-secret-2025';

// Make bcrypt & uuidv4 available globally in routes
app.locals.bcrypt = bcrypt;
app.locals.uuidv4 = uuidv4;
app.locals.MetricsService = MetricsService;

// ============================
// AUTH MIDDLEWARE
// ============================
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

// Attach authenticateToken to app.locals
app.locals.authenticateToken = authenticateToken;

// ============================
// USER STATUS CHECK MIDDLEWARE
// ============================
const checkUserStatus = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    try {
        const user = req.user;
        let userTable, userIdColumn;
        
        // Determine which table to check based on role
        if (user.role === 'customer' || user.userType === 'customer') {
            userTable = 'customers';
            userIdColumn = 'customer_id';
        } else if (user.role === 'event_manager' || user.userType === 'event_manager') {
            userTable = 'event_managers';
            userIdColumn = 'manager_id';
        } else if (user.role === 'admin' || user.userType === 'admin' || user.role === 'SUPER_ADMIN') {
            userTable = 'admins';
            userIdColumn = 'admin_id';
        } else {
            return next();
        }

        // Get current user status from database
        const dbUser = await dbOperations.get(
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
        next(); // Continue on error
    }
};

// Role-based middlewares
const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (!['admin', 'SUPER_ADMIN'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

const requireEventManager = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (role !== 'event_manager') {
    return res.status(403).json({ success: false, error: 'Event Manager access required' });
  }
  next();
};

const requireAdminOrManager = (req, res, next) => {
  const role = req.user?.role || req.user?.userType;
  if (!['admin', 'SUPER_ADMIN', 'event_manager'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Admin or Manager access required' });
  }
  next();
};

// ============================
// METRICS STATUS DISPLAY FUNCTION
// ============================

const updateMetricsStatusMessage = () => {
  console.log('\n' + '='.repeat(45));
  console.log('📊 METRICS STATUS UPDATE');
  console.log('='.repeat(45));
  console.log(`   Service: ${metricsService ? metricsService.constructor.name : 'Not loaded'}`);
  console.log(`   Mode: ${metricsInitialized ? 'REAL DATA MODE ✅' : 'INITIALIZING...'}`);
  console.log(`   Collection: ${metricsService?.isRunning ? 'ACTIVE ✅' : 'INACTIVE'}`);
  console.log(`   Dashboard: http://localhost:${process.env.PORT || 8081}/api/metrics/dashboard-metrics`);
  console.log('='.repeat(45) + '\n');
};

// ============================
// FORCE REAL METRICS INITIALIZATION
// ============================

const initializeMetricsSystem = async () => {
  console.log('\n=== FORCING REAL METRICS INITIALIZATION ===');
  
  try {
    if (!MetricsService) {
      console.error('❌ MetricsService is null or undefined');
      return;
    }
    
    console.log('Creating MetricsService instance...');
    
    // Create metrics service instance
    metricsService = new MetricsService();
    
    if (!metricsService) {
      console.error('❌ Failed to create MetricsService instance');
      return;
    }
    
    console.log('✓ MetricsService instance created');
    
    // Store in app.locals for routes to access
    app.locals.metricsService = metricsService;
    console.log('✓ MetricsService stored in app.locals');
    
    // Initialize metrics tables first
    try {
      console.log('Ensuring metrics tables exist...');
      await dbOperations.run(`CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_key TEXT UNIQUE NOT NULL,
        metric_value TEXT NOT NULL,
        metric_type TEXT DEFAULT 'gauge',
        unit TEXT,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      
      await dbOperations.run(`CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        response_time_ms INTEGER NOT NULL,
        status_code INTEGER,
        request_size INTEGER,
        response_size INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      
      console.log('✓ Metrics tables verified');
    } catch (tableError) {
      console.error('⚠ Could not create metrics tables:', tableError.message);
    }
    
    // Force start metrics collection with timeout
    console.log('Starting metrics collection...');
    try {
      await Promise.race([
        metricsService.startMetricsCollection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metrics startup timeout after 10 seconds')), 10000)
        )
      ]);
      
      console.log('✓ Metrics collection started successfully');
      metricsInitialized = true;
      
      // Force initial metrics update
      console.log('Running initial metrics update...');
      if (metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe) {
        const updateMethod = metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe;
        await updateMethod.call(metricsService);
        console.log('✓ Initial metrics updated');
      }
      
      // Insert initial metrics if table is empty
      try {
        const existingMetrics = await dbOperations.all('SELECT COUNT(*) as count FROM system_metrics');
        if (existingMetrics[0]?.count === 0) {
          console.log('Inserting initial metrics...');
          await dbOperations.run(`
            INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, description) 
            VALUES 
            ('system_uptime_days', '0', 'counter', 'System uptime in days'),
            ('database_size_mb', '0', 'gauge', 'Database size in MB'),
            ('avg_response_time', '0', 'gauge', 'Average response time'),
            ('failed_login_attempts_24h', '0', 'counter', 'Failed login attempts in 24h'),
            ('active_users', '3', 'gauge', 'Active user count'),
            ('total_events', '0', 'gauge', 'Total events'),
            ('active_events', '0', 'gauge', 'Active events'),
            ('pending_events', '0', 'gauge', 'Pending event approvals'),
            ('last_system_restart', '${new Date().toISOString()}', 'timestamp', 'Last system restart time')
          `);
          console.log('✓ Initial metrics inserted');
        }
      } catch (insertError) {
        console.error('⚠ Could not insert initial metrics:', insertError.message);
      }
      
      // Start periodic metrics update (every 5 minutes)
      setInterval(async () => {
        if (metricsService && (metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe)) {
          try {
            const updateMethod = metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe;
            await updateMethod.call(metricsService);
            console.log('🔄 Periodic metrics update completed');
          } catch (err) {
            console.error('Periodic metrics update failed:', err.message);
          }
        }
      }, 5 * 60 * 1000);
      
      console.log('✅ REAL METRICS SYSTEM FULLY INITIALIZED');
      
      // Update the status message
      updateMetricsStatusMessage();
      
    } catch (startError) {
      console.error('❌ Failed to start metrics collection:', startError.message);
      metricsInitialized = false;
      updateMetricsStatusMessage();
    }
    
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize metrics system:', error);
    console.error('Error stack:', error.stack);
    metricsInitialized = false;
    updateMetricsStatusMessage();
  }
};

// ============================
// PERFORMANCE LOGGING MIDDLEWARE
// ============================

// Performance logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log performance if metrics service is available
    if (metricsService && metricsService.logPerformance) {
      // Use setTimeout to avoid blocking response
      setTimeout(() => {
        try {
          metricsService.logPerformance(
            req.path,
            responseTime,
            res.statusCode,
            req.headers['content-length'] || 0,
            res.getHeader('Content-Length') || 0
          );
        } catch (error) {
          // Don't crash on logging errors
          console.error('Performance logging error (non-critical):', error.message);
        }
      }, 0);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
});

// ============================
// ROUTES
// ============================

// Health check (public) - shows real metrics status
app.get('/api/health', (req, res) => {
  const healthData = {
    success: true, 
    message: 'Ticket Hub Backend is running!', 
    timestamp: new Date().toISOString(),
    metrics: {
      service: metricsService ? 'Available' : 'Not available',
      running: metricsService?.isRunning || false,
      initialized: metricsInitialized,
      mode: metricsService?.constructor?.name || 'Unknown'
    },
    database: 'Connected',
    version: '1.0.0',
    uptime: process.uptime()
  };
  
  res.json(healthData);
});

// NEW: Token validation endpoint (public)
app.get('/api/auth/validate-token', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    
    // Determine if user has admin access
    const role = user.role || user.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN', 'event_manager'].includes(role);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.userId || user.id,
        email: user.email,
        role: role,
        name: user.name || 'Admin User'
      },
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
});

// NEW: Admin login endpoint (public)
app.post('/api/admin/demo-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Demo admin credentials
    const demoAdmin = {
      email: 'admin@tickethub.co.za',
      password: 'admin123'
    };
    
    if (email !== demoAdmin.email || password !== demoAdmin.password) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Create token
    const token = jwt.sign(
      { 
        userId: 'admin-demo-001',
        email: demoAdmin.email,
        role: 'admin',
        name: 'Demo Admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token: token,
      user: {
        id: 'admin-demo-001',
        email: demoAdmin.email,
        role: 'admin',
        name: 'Demo Admin'
      },
      message: 'Demo login successful'
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Auth Routes (public)
app.use('/api/auth', require('./routes/auth/customerAuth'));
app.use('/api/event-manager/auth', require('./routes/auth/eventManagerAuth'));
app.use('/api/admin/auth', require('./routes/auth/adminAuth'));

// ============================
// FIXED: EVENTS ROUTES - MOUNT THE ENTIRE ROUTER
// ============================
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

// Protected Routes with Status Check

// Event Manager Routes
app.use('/api/event-manager/planner', authenticateToken, checkUserStatus, requireEventManager, require('./routes/eventPlanner'));

// Admin Dashboard Routes
app.use('/api/admin/dashboard', authenticateToken, checkUserStatus, requireAdminOrManager, require('./routes/adminDashboard'));

// Admin Users Routes
app.use('/api/admin/users', authenticateToken, checkUserStatus, requireAdminOrManager, require('./routes/adminUsers'));

// ============================
// METRICS API ROUTES
// ============================

// Core metrics API (authenticated) - This will use REAL data
const metricsRouter = require('./routes/metricsAPI');
app.use('/api/metrics', authenticateToken, checkUserStatus, requireAdminOrManager, metricsRouter);

// ============================
// DATABASE MANAGEMENT ROUTES
// ============================

// Database Management Routes
const databaseManagementRouter = require('./routes/databaseManagement');
app.use('/api/database', authenticateToken, checkUserStatus, requireAdmin, databaseManagementRouter);

// ============================
// DEBUG ROUTES (FOR DEVELOPMENT)
// ============================

// Debug endpoint to check metrics status
const debugRouter = require('./routes/metricsDebug');
app.use('/api/debug', debugRouter);

// ============================
// METRICS DIAGNOSTICS ENDPOINTS
// ============================

// Metrics diagnostics endpoint
app.get('/api/metrics-diagnostics', authenticateToken, checkUserStatus, requireAdmin, async (req, res) => {
  try {
    // Get system metrics from database
    const systemMetrics = await dbOperations.all('SELECT * FROM system_metrics LIMIT 20');
    const performanceMetrics = await dbOperations.all('SELECT COUNT(*) as count FROM performance_metrics');
    const securityLogs = await dbOperations.all('SELECT COUNT(*) as count FROM security_logs');
    const userActivity = await dbOperations.all('SELECT COUNT(*) as count FROM user_activity_logs');
    const systemAlerts = await dbOperations.all('SELECT COUNT(*) as count FROM system_alerts');
    
    const diagnostics = {
      success: true,
      metricsService: {
        exists: !!metricsService,
        constructor: metricsService?.constructor?.name,
        isRunning: metricsService?.isRunning || false,
        initialized: metricsService?.initialized || false,
        metricsInitialized: metricsInitialized
      },
      database: {
        systemMetricsCount: systemMetrics.length,
        performanceMetricsCount: performanceMetrics[0]?.count || 0,
        securityLogsCount: securityLogs[0]?.count || 0,
        userActivityCount: userActivity[0]?.count || 0,
        systemAlertsCount: systemAlerts[0]?.count || 0
      },
      sampleMetrics: systemMetrics.slice(0, 5)
    };
    
    res.json(diagnostics);
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Diagnostics failed',
      details: error.message 
    });
  }
});

// Force metrics refresh endpoint
app.post('/api/metrics-refresh', authenticateToken, checkUserStatus, requireAdmin, async (req, res) => {
  try {
    if (!metricsService) {
      return res.status(500).json({ 
        success: false, 
        error: 'Metrics service not available' 
      });
    }
    
    let result = { message: 'Refresh initiated' };
    
    // Force update all metrics
    if (metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe) {
      const updateMethod = metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe;
      await updateMethod.call(metricsService);
      result.metricsUpdate = 'Completed';
    }
    
    // Get fresh dashboard data
    if (metricsService.getDashboardData) {
      const dashboardData = await metricsService.getDashboardData();
      result.dashboardData = {
        metricsCount: Object.keys(dashboardData.metrics || {}).length,
        alertsCount: dashboardData.alerts?.length || 0,
        securityLogsCount: dashboardData.securityLogs?.length || 0
      };
    }
    
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to refresh metrics' });
  }
});

// ============================
// SYSTEM ADMIN ROUTES
// ============================

// System info endpoint
app.get('/api/system/info', authenticateToken, checkUserStatus, requireAdmin, async (req, res) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      database: {
        tables: await dbOperations.all("SELECT name FROM sqlite_master WHERE type='table'")
      },
      metrics: {
        enabled: !!metricsService,
        serviceRunning: metricsService?.isRunning || false,
        initialized: metricsInitialized,
        serviceName: metricsService?.constructor?.name || 'Unknown'
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, data: systemInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get system info' });
  }
});

// ============================
// ERROR HANDLING
// ============================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8081;

// ============================
// SERVER STARTUP
// ============================
(async () => {
  try {
    console.log('============================================');
    console.log('🚀 Starting Ticket-Hub Backend Server...');
    console.log('============================================');
    
    // Connect to database
    await connectDatabase();
    console.log('✓ Database connected');

    // Initialize tables & default users
    await initializeTables();
    console.log('✓ Database tables initialized');

    // Create default users
    await ensureDefaultEventManager(bcrypt, uuidv4);
    await ensureDefaultAdmin(bcrypt, uuidv4);
    await ensureDefaultCustomer(bcrypt, uuidv4);
    console.log('✓ Default users created');

    // Start auto scraper (if service exists)
    try {
      const EnhancedEventScraperService = require('./services/EnhancedEventScraperService');
      const scraper = new EnhancedEventScraperService();
      scraper.startAutoScrape();
      console.log('✓ Auto scraper started');
    } catch (err) {
      console.log('⚠ Scraper service not found (normal in dev)');
    }

    // Initialize Database Management Service
    try {
      const DatabaseManagementService = require('./services/DatabaseManagementService');
      const dbManagementService = new DatabaseManagementService();
      app.locals.dbManagementService = dbManagementService;
      
      // Schedule automatic backups (every 24 hours)
      dbManagementService.scheduleAutomaticBackups(24);
      console.log('✓ Database management service initialized');
    } catch (error) {
      console.log('⚠ Database management service not available:', error.message);
    }

    // Initialize System Logs Service
    try {
      const SystemLogsService = require('./services/SystemLogsService');
      const systemLogsService = new SystemLogsService();
      app.locals.systemLogsService = systemLogsService;
      
      // Schedule log monitoring (every hour)
      setInterval(() => {
        systemLogsService.monitorLogLevels().catch(err => {
          console.error('Log monitoring failed:', err.message);
        });
      }, 60 * 60 * 1000);
      
      console.log('✓ System logs service initialized');
    } catch (error) {
      console.log('⚠ System logs service not available:', error.message);
    }

    // Create the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n============================================');
      console.log('✅ TICKET-HUB BACKEND IS LIVE');
      console.log('============================================');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   Events API: http://localhost:${PORT}/api/events`);
      console.log(`   Metrics Dashboard: http://localhost:${PORT}/api/metrics/dashboard-metrics`);
      console.log(`   Demo Login: POST http://localhost:${PORT}/api/admin/demo-login`);
      console.log(`   Token Validation: http://localhost:${PORT}/api/auth/validate-token`);
      console.log(`\n   Default Login Credentials:`);
      console.log(`   Admin → admin@tickethub.co.za / admin123`);
      console.log(`   Manager → manager@tickethub.co.za / manager123`);
      console.log(`   Customer → customer@test.com / customer123`);
      console.log(`\n   === METRICS STATUS ===`);
      console.log(`   Service: Initializing...`);
      console.log(`   Mode: STARTING UP...`);
      console.log(`   Collection: Please wait...`);
      console.log(`\n   (Metrics will initialize in a few seconds)`);
      console.log('============================================\n');
    });

    // Initialize metrics system after server starts
    setTimeout(async () => {
      await initializeMetricsSystem();
    }, 2000);

  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();

// ============================
// GRACEFUL SHUTDOWN
// ============================

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  if (metricsService && metricsService.stop) {
    metricsService.stop();
  }
  console.log('Server shutdown complete.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  if (metricsService && metricsService.stop) {
    metricsService.stop();
  }
  console.log('Server shutdown complete.');
  process.exit(0);
});

module.exports = app;