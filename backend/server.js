// backend/server.js - WITH USER STATUS MIDDLEWARE & DELETE SUPPORT
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const metricsAPI = require('./routes/metricsAPI');

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

const app = express();

// CORS - Allow all your frontend origins with DELETE method
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://localhost:8082',
    'http://localhost:5173',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Proper preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Hardcoded JWT secret
const JWT_SECRET = 'ticket-hub-super-secret-2025';

// Make bcrypt & uuidv4 available globally in routes
app.locals.bcrypt = bcrypt;
app.locals.uuidv4 = uuidv4;

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

// Add after other require statements
const { initializeMetrics } = require('./middleware/metricsMiddleware');
const MetricsService = require('./services/MetricsService');

// Initialize metrics service
const metricsService = new MetricsService();
initializeMetrics(metricsService);
metricsService.startMetricsCollection();

// Add metrics middleware before routes
app.use(require('./middleware/metricsMiddleware').metricsMiddleware);
app.use(require('./middleware/metricsMiddleware').securityLoggingMiddleware);

// Add metrics API route (after other routes)
app.use('/api/metrics', require('./routes/metricsAPI'));

// ============================
// ROUTES
// ============================

// Auth Routes
app.use('/api/auth', require('./routes/auth/customerAuth'));
app.use('/api/event-manager/auth', require('./routes/auth/eventManagerAuth'));
app.use('/api/admin/auth', require('./routes/auth/adminAuth'));

// Protected Routes with Status Check
app.use('/api/event-manager/planner', authenticateToken, checkUserStatus, requireEventManager, require('./routes/eventPlanner'));
app.use('/api/admin/dashboard', authenticateToken, checkUserStatus, requireAdminOrManager, require('./routes/adminDashboard'));
app.use('/api/events', require('./routes/events'));

// Admin Users Routes with Status Check
app.use('/api/admin/users', authenticateToken, checkUserStatus, requireAdminOrManager, require('./routes/adminUsers'));

// Optional scraper endpoint
app.get('/api/scrape/run', authenticateToken, checkUserStatus, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Scraper not active in this build' });
});

// Add Metrics API routes (with authentication)
app.use('/api/metrics', authenticateToken, checkUserStatus, requireAdminOrManager, require('./routes/metricsAPI'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Ticket Hub Backend is running!', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8081;

// ============================
// SERVER STARTUP
// ============================
(async () => {
  try {
    console.log('Starting Ticket-Hub Backend...');
    await connectDatabase();
    console.log('Database connected');

    // Initialize tables & default users
    await initializeTables();
    console.log('Tables initialized');

    await ensureDefaultEventManager(bcrypt, uuidv4);
    await ensureDefaultAdmin(bcrypt, uuidv4);
    await ensureDefaultCustomer(bcrypt, uuidv4);

    // Start auto scraper (if service exists)
    try {
      const EnhancedEventScraperService = require('./services/EnhancedEventScraperService');
      const scraper = new EnhancedEventScraperService();
      scraper.startAutoScrape();
      console.log('Auto scraper started');
    } catch (err) {
      console.log('Scraper service not found (normal in dev)');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\nTICKET-HUB BACKEND IS LIVE → http://localhost:${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   Admin → admin@tickethub.co.za / admin123`);
      console.log(`   Manager → manager@tickethub.co.za / manager123`);
      console.log(`   Customer → customer@test.com / customer123\n`);
    });

  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
})();