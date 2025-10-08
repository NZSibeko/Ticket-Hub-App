require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbOperations, connectDatabase } = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database connection check middleware
const checkDatabaseConnection = (req, res, next) => {
  if (!dbOperations.isConnected()) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available. Please try again.'
    });
  }
  next();
};

// Apply database connection check to all API routes
app.use('/api', checkDatabaseConnection);
app.use('/zi_events', checkDatabaseConnection);
app.use('/zi_tickets', checkDatabaseConnection);

// ============= MIDDLEWARE =============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }
  next();
};

// ============= ROUTE IMPORTS =============
const paymentRoutes = require('./routes/payments');

// ============= REGISTER ROUTES =============
app.use('/api/payments', paymentRoutes);

// ============= HELPER FUNCTIONS =============

const generateTicketCode = () => {
  return `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const generateQRCode = () => {
  return `QR-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
};

// ============= AUTHENTICATION ROUTES =============

// Register new customer
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    const existingUser = await dbOperations.get(
      'SELECT * FROM customers WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        error: 'Email already registered' 
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customerId = uuidv4();
    
    await dbOperations.run(
      `INSERT INTO customers (customer_id, first_name, last_name, email, phone_number, password_hash, account_status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [customerId, firstName, lastName, email, phone || '', passwordHash]
    );

    const token = jwt.sign(
      { 
        customerId, 
        email, 
        firstName, 
        lastName,
        role: 'customer',
        userType: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        customer_id: customerId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phone || '',
        account_status: 'ACTIVE',
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Login customer
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    const user = await dbOperations.get(
      'SELECT * FROM customers WHERE email = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false,
        error: 'Account is inactive. Please contact support.' 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        customerId: user.customer_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'customer',
        userType: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        customer_id: user.customer_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        profile_picture: user.profile_picture,
        account_status: user.account_status,
        role: 'customer'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed. Please try again.' 
    });
  }
});

// ============= ADMIN AUTHENTICATION ROUTES =============

// Admin login
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Admin login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    const admin = await dbOperations.get(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!admin) {
      console.log('❌ No admin found with username/email:', username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ Admin found:', admin.username);

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      console.log('❌ Password incorrect for admin:', admin.username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ Password verified for admin:', admin.username);

    const token = jwt.sign(
      { 
        adminId: admin.admin_id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        userType: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 Admin login successful for:', admin.username);

    res.json({
      success: true,
      token,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('💥 Admin login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed. Please try again.' 
    });
  }
});

// ============= EVENT ROUTES =============

// Get all validated events
app.get('/zi_events', async (req, res) => {
  try {
    const { $filter, $orderby, $top, $skip } = req.query;
    
    let query = `SELECT * FROM events WHERE event_status = 'VALIDATED'`;
    const params = [];

    if ($filter) {
      if ($filter.includes('end_date ge')) {
        query += ` AND end_date >= datetime('now')`;
      }
    }

    if ($orderby) {
      query += ` ORDER BY ${$orderby}`;
    } else {
      query += ` ORDER BY start_date ASC`;
    }

    if ($top) {
      query += ` LIMIT ${parseInt($top)}`;
    }
    if ($skip) {
      query += ` OFFSET ${parseInt($skip)}`;
    }

    const events = await dbOperations.all(query, params);

    // Get ticket types for each event
    for (let event of events) {
      const ticketTypes = await dbOperations.all(
        'SELECT * FROM event_ticket_types WHERE event_id = ?',
        [event.event_id]
      );
      event.ticket_types = ticketTypes;
    }

    res.json({ 
      d: { 
        results: events,
        __count: events.length
      } 
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
app.get('/zi_events/:id', async (req, res) => {
  try {
    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?',
      [req.params.id]
    );

    if (event) {
      // Get ticket types
      const ticketTypes = await dbOperations.all(
        'SELECT * FROM event_ticket_types WHERE event_id = ?',
        [req.params.id]
      );
      event.ticket_types = ticketTypes;
      
      res.json({ d: event });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get customer tickets - UPDATED with better error handling
app.get('/zi_tickets', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.customerId;
    console.log('📋 Fetching tickets for customer:', customer_id);

    if (!customer_id) {
      return res.status(400).json({ 
        error: 'Customer ID is required' 
      });
    }

    const query = `
      SELECT 
        t.*, 
        e.event_name, 
        e.start_date, 
        e.end_date, 
        e.location, 
        e.event_image,
        e.event_id
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      WHERE t.customer_id = ?
      ORDER BY t.purchase_date DESC
    `;

    const tickets = await dbOperations.all(query, [customer_id]);
    console.log(`✅ Found ${tickets.length} tickets for customer ${customer_id}`);

    const formattedTickets = tickets.map(ticket => ({
      ticket_id: ticket.ticket_id,
      event_id: ticket.event_id,
      customer_id: ticket.customer_id,
      ticket_code: ticket.ticket_code,
      qr_code: ticket.qr_code,
      ticket_status: ticket.ticket_status,
      purchase_date: ticket.purchase_date,
      validation_date: ticket.validation_date,
      price: ticket.price,
      currency: ticket.currency,
      payment_status: ticket.payment_status,
      ticket_type: ticket.ticket_type || 'general',
      _event: {
        event_name: ticket.event_name,
        start_date: ticket.start_date,
        end_date: ticket.end_date,
        location: ticket.location,
        event_image: ticket.event_image
      }
    }));

    res.json({ 
      d: { 
        results: formattedTickets 
      } 
    });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tickets',
      details: error.message 
    });
  }
});

// ============= ADMIN DASHBOARD ROUTES =============

// Get dashboard statistics
app.get('/api/admin/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      dbOperations.get('SELECT COUNT(*) as count FROM events'),
      dbOperations.get('SELECT COUNT(*) as count FROM tickets'),
      dbOperations.get('SELECT SUM(price) as total FROM tickets WHERE payment_status = "COMPLETED"'),
      dbOperations.get('SELECT COUNT(DISTINCT customer_id) as count FROM tickets'),
      dbOperations.get('SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "VALIDATED"')
    ]);

    res.json({
      totalEvents: stats[0].count,
      totalTickets: stats[1].count,
      totalRevenue: stats[2].total || 0,
      totalCustomers: stats[3].count,
      validatedTickets: stats[4].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============= ADMIN EVENT ROUTES =============

// Get all events for admin management
app.get('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const events = await dbOperations.all(
      `SELECT e.*, c.first_name, c.last_name, c.email as creator_email
       FROM events e
       LEFT JOIN customers c ON e.created_by = c.customer_id
       ORDER BY e.created_at DESC`
    );

    // Get ticket types for each event
    for (let event of events) {
      const ticketTypes = await dbOperations.all(
        'SELECT * FROM event_ticket_types WHERE event_id = ?',
        [event.event_id]
      );
      event.ticket_types = ticketTypes;
    }

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching admin events:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch events' 
    });
  }
});

// Create event (admin)
app.post('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      event_name,
      event_description,
      start_date,
      end_date,
      location,
      ticket_types,
      currency = 'ZAR',
      event_image
    } = req.body;

    if (!event_name || !start_date || !end_date || !location || !ticket_types) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    // Calculate total max attendees from ticket types
    const totalMaxAttendees = ticket_types.reduce((sum, type) => sum + type.quantity, 0);
    // Use the first ticket type price as the event price for compatibility
    const eventPrice = ticket_types[0]?.price || 0;

    const eventId = uuidv4();
    
    // Insert event
    await dbOperations.run(
      `INSERT INTO events (
        event_id, event_name, event_description, start_date, end_date, 
        location, max_attendees, current_attendees, price, currency, 
        event_image, created_by, event_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'VALIDATED')`,
      [
        eventId, event_name, event_description || '', start_date, end_date, 
        location, totalMaxAttendees, eventPrice, currency, 
        event_image || null, req.user.adminId || req.user.customerId
      ]
    );

    // Insert ticket types
    for (const ticketType of ticket_types) {
      const ticketTypeId = uuidv4();
      await dbOperations.run(
        `INSERT INTO event_ticket_types (
          ticket_type_id, event_id, type, price, quantity, available_quantity
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ticketTypeId, eventId, ticketType.type, 
          ticketType.price, ticketType.quantity, ticketType.quantity
        ]
      );
    }

    const event = await dbOperations.get(
      `SELECT e.*, 
              (SELECT COUNT(*) FROM event_ticket_types WHERE event_id = e.event_id) as ticket_type_count
       FROM events e WHERE e.event_id = ?`,
      [eventId]
    );

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create event' 
    });
  }
});

// ============= HEALTH CHECK =============

// Enhanced health check
app.get('/health', async (req, res) => {
  try {
    const dbStatus = dbOperations.isConnected() ? 'connected' : 'disconnected';
    
    // Test database connection
    let dbTest = 'unknown';
    if (dbOperations.isConnected()) {
      try {
        const result = await dbOperations.get('SELECT 1 as test');
        dbTest = result && result.test === 1 ? 'working' : 'failed';
      } catch (error) {
        dbTest = 'error: ' + error.message;
      }
    }

    res.json({ 
      status: 'OK', 
      message: 'Ticket-Hub Backend API is running',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        test: dbTest
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database and start server
async function startServer() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Ticket-Hub Backend Server Started`);
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`📱 Ready to accept connections from mobile app\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();