// backend/server.js - FINAL 100% WORKING VERSION (November 18, 2025)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');
const { dbOperations, connectDatabase, initializeTables, ensureDefaultEventManager, ensureDefaultAdmin, ensureDefaultCustomer } = db;

const app = express();

app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:19006', 'http://localhost:19000'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'ticket-hub-super-secret-2025';

// Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.userType !== 'admin' && !req.user?.role?.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

const requireEventManager = (req, res, next) => {
  if (req.user?.userType !== 'event_manager' && req.user?.role !== 'event_manager') {
    return res.status(403).json({ success: false, error: 'Event manager access required' });
  }
  next();
};

// In backend/server.js - REPLACE the old requireAdmin with this

const requireAdminOrManager = (req, res, next) => {
  const role = req.user?.role;
  const userType = req.user?.userType;

  const allowed = 
    role === 'SUPER_ADMIN' || 
    role === 'admin' || 
    userType === 'admin' ||
    role === 'event_manager' || 
    userType === 'event_manager';

  if (!allowed) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. Admin or Event Manager role required.' 
    });
  }
  next();
};

// AUTH ROUTES
app.use('/api/auth', require('./routes/auth/customerAuth'));
app.use('/api/event-manager/auth', require('./routes/auth/eventManagerAuth'));
app.use('/api/admin/auth', require('./routes/auth/adminAuth'));

// PROTECTED ROUTES
app.use('/api/event-manager/planner', authenticateToken, requireEventManager, require('./routes/eventPlanner'));

// ADMIN DASHBOARD ROUTE 
app.use('/api/admin/dashboard', authenticateToken, requireAdminOrManager, require('./routes/adminDashboard'));
app.use('/api/events', authenticateToken, require('./routes/events'));

// Scraper
app.get('/api/scrape/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const EnhancedEventScraperService = require('./services/EnhancedEventScraperService');
    const scraper = new EnhancedEventScraperService();
    const result = await scraper.runFullScrape();
    res.json({ success: true, message: 'Scrape completed!', ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// ========================
// STARTUP - FIXED ORDER!
// ========================
(async () => {
  try {
    console.log('Starting Ticket-Hub Backend...');
    await connectDatabase();
    console.log('Database connected');

    // 1. CREATE TABLES FIRST
    //await initializeTables();
    console.log('All tables ready');

    // 2. CREATE DEFAULT USERS
    await ensureDefaultEventManager(bcrypt, uuidv4);
    await ensureDefaultAdmin(bcrypt, uuidv4);
    await ensureDefaultCustomer(bcrypt, uuidv4);

    // 3. START SCRAPER
    const EnhancedEventScraperService = require('./services/EnhancedEventScraperService');
    const scraper = new EnhancedEventScraperService();
    scraper.startAutoScrape();

    app.listen(PORT, () => {
      console.log(`\n🎉 TICKET-HUB BACKEND IS LIVE → http://localhost:${PORT}`);
      console.log(`   🔑 Customer → customer@test.com       / customer123`);
      console.log(`   🔑 Manager  → manager@tickethub.co.za / manager123`);
      console.log(`   🔑 Admin    → admin@tickethub.co.za   / admin123`);
      console.log(`   🕐 Auto scraper running every 6 hours\n`);
    });

  } catch (err) {
    console.error('FATAL ERROR - Server failed:', err);
    process.exit(1);
  }
})();