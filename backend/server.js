// server.js - COMPLETE FIXED VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbOperations, connectDatabase, ensureDefaultEventManager } = require('./database');

const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://localhost:19006'
    ], 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

console.log('📦 Loading routes...');

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

// ============= ENHANCED AUTHENTICATION MIDDLEWARE =============
// Replace the existing middleware section in server.js (around line 51-89) with this:

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 Auth middleware - Header present:', !!authHeader);
    console.log('🔐 Auth middleware - Token present:', !!token);

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
            success: false,
            error: 'Access token required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Token verification failed:', err.message);
            
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    error: 'Token expired' 
                });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid token' 
                });
            } else {
                return res.status(401).json({ 
                    success: false,
                    error: 'Token verification failed' 
                });
            }
        }
        
        console.log('✅ Token verified successfully');
        req.user = decoded;
        next();
    });
};

// Admin-only middleware - FIXED TO ALLOW EVENT MANAGERS
const requireAdmin = (req, res, next) => {
    console.log('👑 Admin check - user data:', {
        userType: req.user?.userType,
        role: req.user?.role,
        id: req.user?.adminId || req.user?.customerId || req.user?.managerId
    });
    
    // FIX: Allow both admins AND event managers
    const isAdmin = req.user?.userType === 'admin' || 
                   req.user?.role === 'SUPER_ADMIN' || 
                   req.user?.role === 'admin' ||
                   req.user?.adminId !== undefined;
    
    const isEventManager = req.user?.userType === 'event_manager' || 
                           req.user?.role === 'event_manager' ||
                           req.user?.role === 'EVENT_MANAGER' ||
                           req.user?.managerId !== undefined;
    
    if (!isAdmin && !isEventManager) {
        console.log('❌ Admin/Event Manager access denied - insufficient privileges');
        return res.status(403).json({ 
            success: false,
            error: 'Admin or Event Manager privileges required'
        });
    }
    
    console.log('✅ Admin/Event Manager access granted');
    next();
};

// Event Manager only middleware - ALSO ALLOW ADMINS
const requireEventManager = (req, res, next) => {
    console.log('📋 Event Manager check - user data:', {
        userType: req.user?.userType,
        role: req.user?.role
    });
    
    const isEventManager = req.user?.userType === 'event_manager' || 
                           req.user?.role === 'event_manager' ||
                           req.user?.role === 'EVENT_MANAGER';
    
    const isAdmin = req.user?.userType === 'admin' || 
                    req.user?.role === 'SUPER_ADMIN' || 
                    req.user?.role === 'admin';
    
    if (!isEventManager && !isAdmin) {
        console.log('❌ Event Manager access denied');
        return res.status(403).json({ 
            success: false,
            error: 'Event Manager privileges required' 
        });
    }
    
    console.log('✅ Event Manager access granted');
    next();
};

// ============= ROUTE IMPORTS =============
// Find this section in your server.js (around line 90-95) and replace with:

const paymentRoutes = require('./routes/payments');
const eventPlannerRoutes = require('./routes/eventPlanner');

// ============= REGISTER ROUTES WITH PROPER MIDDLEWARE =============
// Find this section in your server.js (around line 96-100) and replace with:

// Payment routes (requires authentication)
app.use('/api/payments', authenticateToken, paymentRoutes);

// Event Manager/Planner routes (requires event manager or admin access)
// app.use('/api/event-manager', authenticateToken, requireEventManager, eventPlannerRoutes);
app.use('/api/event-manager/planner', authenticateToken, requireEventManager, eventPlannerRoutes);

// Apply database connection check to all API routes
app.use('/api', checkDatabaseConnection);
app.use('/zi_events', checkDatabaseConnection);
app.use('/zi_tickets', checkDatabaseConnection);

console.log('✅ Routes registered with proper middleware');
console.log('✅ Database connection middleware applied');

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

// ============= EVENT MANAGER AUTHENTICATION ROUTES =============

// Event Manager Registration (Admin only)
app.post('/api/admin/event-managers/create', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username, email, and password are required' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid email format' 
            });
        }

        const existingManager = await dbOperations.get(
            'SELECT * FROM event_managers WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingManager) {
            return res.status(409).json({ 
                success: false,
                error: 'Event manager already exists with this email or username' 
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const managerId = uuidv4();
        
        await dbOperations.run(
            `INSERT INTO event_managers (
                manager_id, username, email, password_hash, 
                first_name, last_name, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [managerId, username, email, passwordHash, firstName || '', lastName || '']
        );

        console.log('✅ Event manager created:', username);

        res.status(201).json({
            success: true,
            message: 'Event manager created successfully',
            manager: {
                manager_id: managerId,
                username,
                email,
                first_name: firstName,
                last_name: lastName,
                status: 'ACTIVE'
            }
        });
    } catch (error) {
        console.error('❌ Event manager creation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create event manager' 
        });
    }
});

// Event Manager Login
app.post('/api/event-manager/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('🔐 Event manager login attempt for:', username);

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username and password are required' 
            });
        }

        const manager = await dbOperations.get(
            'SELECT * FROM event_managers WHERE username = ? OR email = ?',
            [username, username]
        );

        if (!manager) {
            console.log('❌ No event manager found with username/email:', username);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        console.log('✅ Event manager found:', manager.username);

        if (manager.status !== 'ACTIVE') {
            console.log('❌ Event manager account is not active:', manager.username);
            return res.status(403).json({ 
                success: false,
                error: 'Account is not active. Please contact administrator.' 
            });
        }

        const validPassword = await bcrypt.compare(password, manager.password_hash);

        if (!validPassword) {
            console.log('❌ Password incorrect for event manager:', manager.username);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        console.log('✅ Password verified for event manager:', manager.username);

        const token = jwt.sign(
            { 
                managerId: manager.manager_id,
                username: manager.username,
                email: manager.email,
                firstName: manager.first_name,
                lastName: manager.last_name,
                role: 'event_manager',
                userType: 'event_manager'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('🎉 Event manager login successful for:', manager.username);

        res.json({
            success: true,
            token,
            user: {
                manager_id: manager.manager_id,
                username: manager.username,
                email: manager.email,
                first_name: manager.first_name,
                last_name: manager.last_name,
                status: manager.status,
                role: 'event_manager',
                userType: 'event_manager',
                created_at: manager.created_at
            }
        });
    } catch (error) {
        console.error('💥 Event manager login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
});

// Get Event Manager Profile
app.get('/api/event-manager/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.userType !== 'event_manager' && req.user.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const managerId = req.user.managerId;
        const manager = await dbOperations.get(
            'SELECT manager_id, username, email, first_name, last_name, status, created_at FROM event_managers WHERE manager_id = ?',
            [managerId]
        );

        if (!manager) {
            return res.status(404).json({
                success: false,
                error: 'Event manager not found'
            });
        }

        res.json({
            success: true,
            manager: manager
        });
    } catch (error) {
        console.error('Error fetching event manager profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

// List all Event Managers (Admin only)
app.get('/api/admin/event-managers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const managers = await dbOperations.all(
            'SELECT manager_id, username, email, first_name, last_name, status, created_at FROM event_managers ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            managers: managers,
            count: managers.length
        });
    } catch (error) {
        console.error('Error fetching event managers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event managers'
        });
    }
});

// Update Event Manager Status (Admin only)
app.patch('/api/admin/event-managers/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED'
            });
        }

        await dbOperations.run(
            'UPDATE event_managers SET status = ? WHERE manager_id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Event manager status updated successfully'
        });
    } catch (error) {
        console.error('Error updating event manager status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update event manager status'
        });
    }
});

// ============= USER MANAGEMENT ROUTES =============

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await dbOperations.all(`
            SELECT 
                customer_id, first_name, last_name, email, phone_number, 
                profile_picture, account_status, created_at, updated_at
            FROM customers 
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Update user status (Admin only)
app.patch('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        await dbOperations.run(
            'UPDATE customers SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status'
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

// Get customer tickets
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

// ============= ENHANCED EVENT MANAGEMENT ROUTES =============

// Create event (admin) - FIXED VERSION WITHOUT DESCRIPTION COLUMN
app.post('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🎯 Create event request received');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        console.log('👤 User making request:', req.user);

        const {
            event_name,
            event_description,
            start_date,
            end_date,
            location,
            ticket_types,
            currency = 'ZAR',
            event_status = 'VALIDATED',
            event_image
        } = req.body;

        // Validation
        if (!event_name || !start_date || !end_date || !location || !ticket_types) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false,
                error: 'All required fields must be provided: event_name, start_date, end_date, location, ticket_types' 
            });
        }

        if (!Array.isArray(ticket_types) || ticket_types.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'At least one ticket type is required' 
            });
        }

        // Calculate total max attendees and find minimum price
        const totalMaxAttendees = ticket_types.reduce((sum, type) => sum + (type.quantity || 0), 0);
        const eventPrice = Math.min(...ticket_types.map(t => t.price || 0));

        const eventId = uuidv4();
        const createdBy = req.user.adminId || req.user.customerId;
        
        console.log('🆔 Creating event with ID:', eventId);
        console.log('🎟️ Ticket types to create:', ticket_types.length);

        // Insert event
        await dbOperations.run(
            `INSERT INTO events (
                event_id, event_name, event_description, start_date, end_date, 
                location, max_attendees, current_attendees, price, currency, 
                event_image, created_by, event_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
            [
                eventId, 
                event_name, 
                event_description || '', 
                start_date, 
                end_date, 
                location, 
                totalMaxAttendees, 
                eventPrice, 
                currency, 
                event_image || null, 
                createdBy,
                event_status
            ]
        );

        console.log('✅ Event created, adding ticket types...');

        // Insert ticket types - FIXED: WITHOUT description column
        for (const ticketType of ticket_types) {
            const ticketTypeId = uuidv4();
            
            console.log(`➕ Adding ticket type: ${ticketType.type}, Price: ${ticketType.price}, Qty: ${ticketType.quantity}`);
            
            await dbOperations.run(
                `INSERT INTO event_ticket_types (
                    ticket_type_id, event_id, type, price, quantity, available_quantity
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    ticketTypeId, 
                    eventId, 
                    ticketType.type || 'General', 
                    ticketType.price || 0, 
                    ticketType.quantity || 0, 
                    ticketType.quantity || 0
                ]
            );
            console.log(`✅ Added ticket type: ${ticketType.type}`);
        }

        // Fetch complete event with ticket types
        const event = await dbOperations.get(
            `SELECT * FROM events WHERE event_id = ?`,
            [eventId]
        );

        const eventTicketTypes = await dbOperations.all(
            'SELECT * FROM event_ticket_types WHERE event_id = ?',
            [eventId]
        );

        const completeEvent = {
            ...event,
            ticket_types: eventTicketTypes
        };

        console.log('🎉 Event creation completed successfully:', {
            event_id: eventId,
            event_name: event_name,
            ticket_types_count: eventTicketTypes.length
        });

        res.status(201).json({ 
            success: true, 
            event: completeEvent,
            message: 'Event created successfully'
        });

    } catch (error) {
        console.error('❌ Error creating event:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create event: ' + error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update event
app.put('/api/admin/events/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            event_name,
            event_description,
            start_date,
            end_date,
            location,
            event_image,
            event_status
        } = req.body;

        await dbOperations.run(
            `UPDATE events 
             SET event_name = ?, event_description = ?, start_date = ?, end_date = ?, 
                 location = ?, event_image = ?, event_status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE event_id = ?`,
            [event_name, event_description, start_date, end_date, location, event_image, event_status, id]
        );

        res.json({
            success: true,
            message: 'Event updated successfully'
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update event'
        });
    }
});

// Add event status update endpoint
app.patch('/api/admin/events/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['VALIDATED', 'PENDING', 'CANCELLED'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be VALIDATED, PENDING, or CANCELLED'
            });
        }

        await dbOperations.run(
            'UPDATE events SET event_status = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: `Event status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update event status'
        });
    }
});

// Get all events for admin management (enhanced)
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

            // Calculate current attendees from ticket sales
            const ticketSales = await dbOperations.get(
                'SELECT COUNT(*) as sold_tickets FROM tickets WHERE event_id = ? AND ticket_status != "CANCELLED"',
                [event.event_id]
            );
            event.current_attendees = ticketSales.sold_tickets || 0;
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

// Get event statistics
app.get('/api/admin/events/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const event = await dbOperations.get(
            'SELECT * FROM events WHERE event_id = ?',
            [id]
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const stats = await Promise.all([
            // Total tickets sold
            dbOperations.get('SELECT COUNT(*) as total_sold FROM tickets WHERE event_id = ? AND ticket_status != "CANCELLED"', [id]),
            // Revenue
            dbOperations.get('SELECT SUM(price) as total_revenue FROM tickets WHERE event_id = ? AND payment_status = "COMPLETED"', [id]),
            // Ticket types breakdown
            dbOperations.all('SELECT type, price, quantity, available_quantity FROM event_ticket_types WHERE event_id = ?', [id]),
            // Recent sales
            dbOperations.all(`SELECT t.*, c.first_name, c.last_name 
                             FROM tickets t 
                             JOIN customers c ON t.customer_id = c.customer_id 
                             WHERE t.event_id = ? 
                             ORDER BY t.purchase_date DESC 
                             LIMIT 10`, [id])
        ]);

        const eventStats = {
            event: event,
            total_sold: stats[0].total_sold || 0,
            total_revenue: stats[1].total_revenue || 0,
            ticket_types: stats[2],
            recent_sales: stats[3]
        };

        res.json({
            success: true,
            stats: eventStats
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event statistics'
        });
    }
});

// ============= ADMIN DASHBOARD ROUTES =============

// Get dashboard statistics with time range support
app.get('/api/admin/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { range = 'all' } = req.query;
        
        let dateFilter = '';
        let params = [];
        
        // Add date filtering based on range
        if (range === 'week') {
            dateFilter = ' AND created_at >= datetime("now", "-7 days")';
        } else if (range === 'month') {
            dateFilter = ' AND created_at >= datetime("now", "-30 days")';
        } else if (range === 'today') {
            dateFilter = ' AND DATE(created_at) = DATE("now")';
        }

        const stats = await Promise.all([
            // Total events
            dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE 1=1 ${dateFilter}`, params),
            // Total tickets
            dbOperations.get(`SELECT COUNT(*) as count FROM tickets WHERE 1=1 ${dateFilter}`, params),
            // Total revenue
            dbOperations.get(`SELECT SUM(price) as total FROM tickets WHERE payment_status = "COMPLETED" ${dateFilter}`, params),
            // Total customers
            dbOperations.get(`SELECT COUNT(DISTINCT customer_id) as count FROM tickets WHERE 1=1 ${dateFilter}`, params),
            // Validated tickets
            dbOperations.get(`SELECT COUNT(*) as count FROM tickets WHERE ticket_status = "VALIDATED" ${dateFilter}`, params),
            // Validated events
            dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE event_status = "VALIDATED" ${dateFilter}`, params),
            // Pending events
            dbOperations.get(`SELECT COUNT(*) as count FROM events WHERE event_status = "PENDING" ${dateFilter}`, params),
            // Recent tickets (last 7 days)
            dbOperations.get(`SELECT COUNT(*) as recent_tickets FROM tickets WHERE created_at >= datetime("now", "-7 days")`)
        ]);

        res.json({
            success: true,
            stats: {
                totalEvents: stats[0].count,
                totalTickets: stats[1].count,
                totalRevenue: stats[2].total || 0,
                totalCustomers: stats[3].count,
                validatedTickets: stats[4].count,
                validatedEvents: stats[5].count,
                pendingEvents: stats[6].count,
                recentTickets: stats[7].recent_tickets
            },
            range: range
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch statistics' 
        });
    }
});

// ============= TICKET MANAGEMENT ROUTES =============

// Create ticket purchase
app.post('/api/tickets/purchase', authenticateToken, async (req, res) => {
    try {
        const { event_id, ticket_type, quantity = 1 } = req.body;
        const customer_id = req.user.customerId;

        if (!event_id || !ticket_type) {
            return res.status(400).json({
                success: false,
                error: 'Event ID and ticket type are required'
            });
        }

        // Get ticket type details
        const ticketType = await dbOperations.get(
            'SELECT * FROM event_ticket_types WHERE event_id = ? AND type = ? AND available_quantity > 0',
            [event_id, ticket_type]
        );

        if (!ticketType) {
            return res.status(400).json({
                success: false,
                error: 'Ticket type not available or sold out'
            });
        }

        if (ticketType.available_quantity < quantity) {
            return res.status(400).json({
                success: false,
                error: `Only ${ticketType.available_quantity} tickets available for this type`
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
                    ticket_status, purchase_date, price, currency, payment_status, ticket_type
                ) VALUES (?, ?, ?, ?, ?, 'PURCHASED', CURRENT_TIMESTAMP, ?, ?, 'PENDING', ?)`,
                [ticketId, event_id, customer_id, ticketCode, qrCode, ticketType.price, ticketType.currency, ticket_type]
            );

            tickets.push({
                ticket_id: ticketId,
                ticket_code: ticketCode,
                qr_code: qrCode,
                price: ticketType.price,
                currency: ticketType.currency,
                ticket_type: ticket_type
            });
        }

        // Update available quantity
        await dbOperations.run(
            'UPDATE event_ticket_types SET available_quantity = available_quantity - ? WHERE ticket_type_id = ?',
            [quantity, ticketType.ticket_type_id]
        );

        res.status(201).json({
            success: true,
            message: 'Tickets reserved successfully',
            tickets: tickets,
            total_amount: ticketType.price * quantity,
            currency: ticketType.currency
        });
    } catch (error) {
        console.error('Error purchasing tickets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to purchase tickets'
        });
    }
});

// Validate ticket (for event organizers)
app.post('/api/tickets/:id/validate', authenticateToken, requireEventManager, async (req, res) => {
    try {
        const { id } = req.params;

        const ticket = await dbOperations.get(
            'SELECT * FROM tickets WHERE ticket_id = ?',
            [id]
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
                error: 'Ticket already validated'
            });
        }

        if (ticket.ticket_status !== 'PURCHASED') {
            return res.status(400).json({
                success: false,
                error: 'Ticket cannot be validated'
            });
        }

        await dbOperations.run(
            'UPDATE tickets SET ticket_status = "VALIDATED", validation_date = CURRENT_TIMESTAMP WHERE ticket_id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Ticket validated successfully',
            ticket: {
                ...ticket,
                ticket_status: 'VALIDATED',
                validation_date: new Date().toISOString()
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

// ============= DEBUG & TESTING ROUTES =============

// Debug endpoint to check scraper status
app.get('/api/debug/scraper-status', async (req, res) => {
    try {
        const EventScraperService = require('./services/EnhancedEventScraperService');
        const scraper = new EventScraperService();
        
        const status = {
            scraper: {
                initialized: !!scraper,
                sourcesCount: scraper.sources?.length || 0,
                activeSources: scraper.sources?.filter(s => s.active).length || 0,
                sources: scraper.sources || []
            },
            testScrape: 'Run /api/debug/scraper-test to test actual scraping'
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to check if scraping works
app.get('/api/debug/scraper-test', async (req, res) => {
    try {
        const EventScraperService = require('./services/EnhancedEventScraperService');
        const scraper = new EventScraperService();
        
        console.log('🧪 Testing scraper directly...');
        const events = await scraper.scrapeAllEvents();
        
        res.json({
            success: true,
            eventsCount: events.events ? events.events.length : events.length,
            events: events.events ? events.events.slice(0, 5) : events.slice(0, 5),
            sources: scraper.sources.map(s => ({
                name: s.name,
                url: s.url,
                active: s.active
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
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
            },
            endpoints: {
                events: '/zi_events',
                admin: '/api/admin',
                auth: '/api/auth',
                event_manager: '/api/event-manager'
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

// Test endpoint for event manager routes
app.get('/api/event-manager/test', (req, res) => {
    res.json({
        success: true,
        message: 'Event Manager routes are working!',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for event planner
app.get('/api/test-planner', (req, res) => {
    res.json({
        success: true,
        message: 'Event planner API is working',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database and start server
async function startServer() {
    try {
        console.log('🔗 Connecting to database...');
        await connectDatabase();
        console.log('✅ Database connected successfully');

        // Ensure default event manager exists
        await ensureDefaultEventManager(bcrypt, uuidv4);
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Ticket-Hub Backend Server Started`);
            console.log(`📡 Server running on: http://localhost:${PORT}`);
            console.log(`❤️  Health check: http://localhost:${PORT}/health`);
            console.log(`📅 Event Manager API: http://localhost:${PORT}/api/event-manager`);
            console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/event-manager/test`);
            console.log(`🔐 Event Manager Login: http://localhost:${PORT}/api/event-manager/auth/login`);
            console.log(`📱 Ready to accept connections from mobile app\n`);
            
            console.log('🎫 Available Admin Routes:');
            console.log('   POST /api/admin/events - Create event');
            console.log('   GET  /api/admin/events - List events');
            console.log('   PUT  /api/admin/events/:id - Update event');
            console.log('   GET  /api/admin/dashboard/stats - Dashboard stats');
            console.log('   GET  /api/admin/users - User management');
            console.log('   GET  /api/admin/event-managers - Event manager management');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();