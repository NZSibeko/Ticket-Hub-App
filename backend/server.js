require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbOperations } = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Admin-only middleware - ADD THIS
const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }
  next();
};

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

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Check if email already exists
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create customer
    const customerId = uuidv4();
    await dbOperations.run(
      `INSERT INTO customers (customer_id, first_name, last_name, email, phone_number, password_hash, account_status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [customerId, firstName, lastName, email, phone || '', passwordHash]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        customerId, 
        email, 
        firstName, 
        lastName,
        role: 'customer'
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
        account_status: 'ACTIVE'
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

    // Find user by email
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

    // Check account status
    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false,
        error: 'Account is inactive. Please contact support.' 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        customerId: user.customer_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'customer'
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
        account_status: user.account_status
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

// Admin login - FIXED version
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

    // Find admin by username or email
    const admin = await dbOperations.get(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!admin) {
      console.log('❌ No admin found with username/email:', username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials - admin not found' 
      });
    }

    console.log('✅ Admin found:', admin.username);
    console.log('🔑 Verifying password...');

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      console.log('❌ Password incorrect for admin:', admin.username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials - wrong password' 
      });
    }

    console.log('✅ Password verified for admin:', admin.username);

    // Generate JWT token
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

// Admin registration (for creating additional admin users)
app.post('/api/admin/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'ADMIN' } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    // Check if username or email already exists
    const existingAdmin = await dbOperations.get(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingAdmin) {
      return res.status(409).json({ 
        success: false,
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const adminId = uuidv4();
    await dbOperations.run(
      `INSERT INTO admins (admin_id, username, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, username, email, passwordHash, role]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId,
        username,
        email,
        role,
        userType: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin registration successful',
      token,
      admin: {
        admin_id: adminId,
        username,
        email,
        role,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Get admin profile
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }

    const admin = await dbOperations.get(
      'SELECT admin_id, username, email, role, created_at FROM admins WHERE admin_id = ?',
      [req.user.adminId]
    );

    if (!admin) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }

    res.json({ success: true, admin });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

// ============= EVENT ROUTES =============

// Get all validated events
app.get('/zi_events', async (req, res) => {
  try {
    const { $filter, $orderby, $top, $skip } = req.query;
    
    let query = `SELECT * FROM events WHERE event_status = 'VALIDATED'`;
    const params = [];

    // Apply filters if provided
    if ($filter) {
      // Simple filter parsing (extend as needed)
      if ($filter.includes('end_date ge')) {
        query += ` AND end_date >= datetime('now')`;
      }
    }

    // Apply ordering
    if ($orderby) {
      query += ` ORDER BY ${$orderby}`;
    } else {
      query += ` ORDER BY start_date ASC`;
    }

    // Apply pagination
    if ($top) {
      query += ` LIMIT ${parseInt($top)}`;
    }
    if ($skip) {
      query += ` OFFSET ${parseInt($skip)}`;
    }

    const events = await dbOperations.all(query, params);

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
      res.json({ d: event });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Search events
app.get('/api/events/search', async (req, res) => {
  try {
    const { query, location, minPrice, maxPrice, dateFrom, dateTo } = req.query;
    
    let sql = `SELECT * FROM events WHERE event_status = 'VALIDATED'`;
    const params = [];

    if (query) {
      sql += ` AND (event_name LIKE ? OR event_description LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }

    if (location) {
      sql += ` AND location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (minPrice) {
      sql += ` AND price >= ?`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      sql += ` AND price <= ?`;
      params.push(parseFloat(maxPrice));
    }

    if (dateFrom) {
      sql += ` AND start_date >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND start_date <= ?`;
      params.push(dateTo);
    }

    sql += ` ORDER BY start_date ASC`;

    const events = await dbOperations.all(sql, params);
    res.json({ success: true, events });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============= ADMIN EVENT ROUTES =============

// Create event (admin)
app.post('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const {
      event_name,
      event_description,
      start_date,
      end_date,
      location,
      max_attendees,
      price,
      currency = 'ZAR',
      event_image
    } = req.body;

    // Validation
    if (!event_name || !start_date || !end_date || !location || !max_attendees || price === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    const eventId = uuidv4();
    await dbOperations.run(
      `INSERT INTO events (
        event_id, event_name, event_description, start_date, end_date, 
        location, max_attendees, current_attendees, price, currency, 
        event_image, created_by, event_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'VALIDATED')`,
      [
        eventId, event_name, event_description || '', start_date, end_date, 
        location, parseInt(max_attendees), parseFloat(price), currency, 
        event_image || null, req.user.customerId
      ]
    );

    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?',
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

// Update event (admin)
app.put('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    const { 
      event_name, 
      event_description, 
      start_date, 
      end_date, 
      location, 
      max_attendees, 
      price, 
      event_status,
      event_image
    } = req.body;

    await dbOperations.run(
      `UPDATE events SET 
       event_name = ?, 
       event_description = ?, 
       start_date = ?, 
       end_date = ?,
       location = ?, 
       max_attendees = ?, 
       price = ?, 
       event_status = ?,
       event_image = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ?`,
      [
        event_name, event_description, start_date, end_date, 
        location, max_attendees, price, event_status, event_image,
        req.params.id
      ]
    );

    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?', 
      [req.params.id]
    );

    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update event' 
    });
  }
});

// Delete event (admin)
app.delete('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    // Check if event has tickets
    const tickets = await dbOperations.get(
      'SELECT COUNT(*) as count FROM tickets WHERE event_id = ?',
      [req.params.id]
    );

    if (tickets.count > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete event with existing tickets' 
      });
    }

    await dbOperations.run(
      'DELETE FROM events WHERE event_id = ?', 
      [req.params.id]
    );

    res.json({ 
      success: true, 
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete event' 
    });
  }
});

// All admin routes should now use both middlewares:
app.get('/api/admin/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  // ... existing code
});

app.get('/api/admin/tickets', authenticateToken, requireAdmin, async (req, res) => {
  // ... existing code
});

app.post('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  // ... existing code
});

app.put('/api/admin/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  // ... existing code
});

app.delete('/api/admin/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  // ... existing code
});

// ============= TICKET ROUTES =============

// Purchase ticket
app.post('/api/tickets/purchase', authenticateToken, async (req, res) => {
  try {
    const { event_id, quantity = 1 } = req.body;
    const customer_id = req.user.customerId;

    // Get event details
    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?',
      [event_id]
    );

    if (!event) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found' 
      });
    }

    if (event.event_status !== 'VALIDATED') {
      return res.status(400).json({ 
        success: false,
        error: 'Event is not available for booking' 
      });
    }

    // Check capacity
    const availableSpots = event.max_attendees - event.current_attendees;
    if (availableSpots < quantity) {
      return res.status(400).json({ 
        success: false,
        error: `Only ${availableSpots} tickets available` 
      });
    }

    const tickets = [];

    // Create tickets
    for (let i = 0; i < quantity; i++) {
      const ticketId = uuidv4();
      const ticketCode = generateTicketCode();
      const qrCode = generateQRCode();

      await dbOperations.run(
        `INSERT INTO tickets (
          ticket_id, event_id, customer_id, ticket_code, qr_code, 
          price, currency, ticket_status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PURCHASED', 'COMPLETED')`,
        [
          ticketId, event_id, customer_id, ticketCode, qrCode, 
          event.price, event.currency
        ]
      );

      const ticket = await dbOperations.get(
        'SELECT * FROM tickets WHERE ticket_id = ?',
        [ticketId]
      );

      tickets.push(ticket);
    }

    // Update event attendees
    await dbOperations.run(
      'UPDATE events SET current_attendees = current_attendees + ? WHERE event_id = ?',
      [quantity, event_id]
    );

    res.status(201).json({ 
      success: true, 
      tickets,
      event: event.event_name
    });
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to purchase ticket' 
    });
  }
});

// Get customer tickets
app.get('/zi_tickets', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.customerId;
    const { $expand } = req.query;

    let query = `
      SELECT t.*, e.event_name, e.start_date, e.end_date, e.location, e.event_image
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      WHERE t.customer_id = ?
      ORDER BY t.purchase_date DESC
    `;

    const tickets = await dbOperations.all(query, [customer_id]);

    // Format response for OData structure
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
      _event: {
        event_name: ticket.event_name,
        start_date: ticket.start_date,
        end_date: ticket.end_date,
        location: ticket.location,
        event_image: ticket.event_image
      }
    }));

    res.json({ d: { results: formattedTickets } });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket
app.get('/api/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await dbOperations.get(
      `SELECT t.*, e.event_name, e.start_date, e.location
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.ticket_id = ? AND t.customer_id = ?`,
      [req.params.ticketId, req.user.customerId]
    );

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        error: 'Ticket not found' 
      });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Validate ticket (scan QR code)
app.post('/api/tickets/:code/validate', authenticateToken, async (req, res) => {
  try {
    const ticket = await dbOperations.get(
      `SELECT t.*, e.event_name, e.start_date, e.location, e.end_date,
              c.first_name, c.last_name, c.email
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.ticket_code = ? OR t.qr_code = ?`,
      [req.params.code, req.params.code]
    );

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        error: 'Ticket not found' 
      });
    }

    if (ticket.ticket_status === 'VALIDATED') {
      return res.status(400).json({ 
        success: false,
        error: 'Ticket already validated',
        ticket: {
          ticket_code: ticket.ticket_code,
          validation_date: ticket.validation_date
        }
      });
    }

    if (ticket.ticket_status === 'CANCELLED' || ticket.ticket_status === 'REFUNDED') {
      return res.status(400).json({ 
        success: false,
        error: `Ticket has been ${ticket.ticket_status.toLowerCase()}` 
      });
    }

    // Validate ticket
    await dbOperations.run(
      'UPDATE tickets SET ticket_status = ?, validation_date = CURRENT_TIMESTAMP WHERE ticket_id = ?',
      ['VALIDATED', ticket.ticket_id]
    );

    const updatedTicket = await dbOperations.get(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticket.ticket_id]
    );

    res.json({ 
      success: true, 
      message: 'Ticket validated successfully',
      ticket: {
        ...updatedTicket,
        event_name: ticket.event_name,
        customer_name: `${ticket.first_name} ${ticket.last_name}`,
        event_date: ticket.start_date,
        location: ticket.location
      }
    });
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate ticket' 
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

// Get all tickets (admin)
app.get('/api/admin/tickets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tickets = await dbOperations.all(
      `SELECT t.*, e.event_name, c.first_name, c.last_name, c.email
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       JOIN customers c ON t.customer_id = c.customer_id
       ORDER BY t.purchase_date DESC
       LIMIT 100`
    );

    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get all events for admin management
app.get('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const events = await dbOperations.all(
      `SELECT e.*, c.first_name, c.last_name, c.email as creator_email
       FROM events e
       LEFT JOIN customers c ON e.created_by = c.customer_id
       ORDER BY e.created_at DESC`
    );

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
      max_attendees,
      price,
      currency = 'USD',
      event_image
    } = req.body;

    // Validation
    if (!event_name || !start_date || !end_date || !location || !max_attendees || price === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    const eventId = uuidv4();
    await dbOperations.run(
      `INSERT INTO events (
        event_id, event_name, event_description, start_date, end_date, 
        location, max_attendees, current_attendees, price, currency, 
        event_image, created_by, event_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'VALIDATED')`,
      [
        eventId, event_name, event_description || '', start_date, end_date, 
        location, parseInt(max_attendees), parseFloat(price), currency, 
        event_image || null, req.user.adminId || req.user.customerId
      ]
    );

    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?',
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

// Update event (admin)
app.put('/api/admin/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      event_name, 
      event_description, 
      start_date, 
      end_date, 
      location, 
      max_attendees, 
      price, 
      event_status,
      event_image
    } = req.body;

    await dbOperations.run(
      `UPDATE events SET 
       event_name = ?, 
       event_description = ?, 
       start_date = ?, 
       end_date = ?,
       location = ?, 
       max_attendees = ?, 
       price = ?, 
       event_status = ?,
       event_image = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ?`,
      [
        event_name, event_description, start_date, end_date, 
        location, max_attendees, price, event_status, event_image,
        req.params.id
      ]
    );

    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?', 
      [req.params.id]
    );

    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update event' 
    });
  }
});

// Delete event (admin)
app.delete('/api/admin/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if event has tickets
    const tickets = await dbOperations.get(
      'SELECT COUNT(*) as count FROM tickets WHERE event_id = ?',
      [req.params.id]
    );

    if (tickets.count > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete event with existing tickets' 
      });
    }

    await dbOperations.run(
      'DELETE FROM events WHERE event_id = ?', 
      [req.params.id]
    );

    res.json({ 
      success: true, 
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete event' 
    });
  }
});

// ============= PROFILE ROUTES =============

// Get customer profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const customer = await dbOperations.get(
      'SELECT customer_id, first_name, last_name, email, phone_number, profile_picture, account_status, created_at FROM customers WHERE customer_id = ?',
      [req.user.customerId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update customer profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, phone_number, profile_picture } = req.body;

    await dbOperations.run(
      `UPDATE customers SET 
       first_name = ?, 
       last_name = ?, 
       phone_number = ?,
       profile_picture = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = ?`,
      [first_name, last_name, phone_number, profile_picture, req.user.customerId]
    );

    const customer = await dbOperations.get(
      'SELECT customer_id, first_name, last_name, email, phone_number, profile_picture FROM customers WHERE customer_id = ?',
      [req.user.customerId]
    );

    res.json({ success: true, customer });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============= DEBUG ROUTES =============

// Check if admin users exist
app.get('/api/debug/admins', async (req, res) => {
  try {
    const admins = await dbOperations.all('SELECT admin_id, username, email, role FROM admins');
    console.log('📋 Admins in database:', admins);
    res.json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});

// Check if customers exist
app.get('/api/debug/customers', async (req, res) => {
  try {
    const customers = await dbOperations.all('SELECT customer_id, first_name, last_name, email FROM customers');
    console.log('📋 Customers in database:', customers);
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// Check database tables
app.get('/api/debug/tables', async (req, res) => {
  try {
    const tables = await dbOperations.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log('📋 Database tables:', tables);
    res.json({ success: true, tables });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Create admin user via API (temporary)
app.post('/api/debug/create-admin', async (req, res) => {
  try {
    const { username = 'admin', password = 'admin123', email = 'admin@tickethub.com' } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await dbOperations.get(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingAdmin) {
      return res.json({ 
        success: true, 
        message: 'Admin already exists',
        admin: existingAdmin 
      });
    }

    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await dbOperations.run(
      `INSERT INTO admins (admin_id, username, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, username, email, passwordHash, 'SUPER_ADMIN']
    );

    const newAdmin = await dbOperations.get(
      'SELECT * FROM admins WHERE admin_id = ?',
      [adminId]
    );

    console.log('✅ Created admin:', newAdmin);

    res.json({ 
      success: true, 
      message: 'Admin created successfully',
      admin: {
        admin_id: newAdmin.admin_id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
});

// ============= HEALTH CHECK =============

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ticket-Hub Backend API is running',
    timestamp: new Date().toISOString()
  });
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
app.listen(PORT, () => {
  console.log(`\n🚀 Ticket-Hub Backend Server Started`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Ready to accept connections from mobile app\n`);
});

// Debug endpoint to check admin users
app.get('/api/debug/admins', async (req, res) => {
  try {
    const admins = await dbOperations.all('SELECT admin_id, username, email, role FROM admins');
    res.json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});