// backend/routes/events.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ========================
// HELPER FUNCTIONS
// ========================

// Get database operations from request or app.locals
const getDbOperations = (req) => {
  // Try different ways to get dbOperations
  return req.dbOperations || 
         req.app.locals.db || 
         (req.app.locals.dbOperations ? req.app.locals.dbOperations() : null);
};

// Parse event data with ticket types
const parseEventData = (event) => {
  let ticketTypes = [];
  try {
    if (event.ticket_types) {
      if (typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
        ticketTypes = JSON.parse(event.ticket_types);
      } else if (Array.isArray(event.ticket_types)) {
        ticketTypes = event.ticket_types;
      }
    }
  } catch (parseError) {
    console.error(`Warning: Failed to parse ticket_types for event ID ${event.event_id || event.id}`, parseError);
    ticketTypes = [];
  }

  return {
    ...event,
    price: parseFloat(event.price) || 0,
    max_attendees: parseInt(event.max_attendees) || 0,
    end_date: event.end_date || null,
    image_url: event.image_url || null,
    ticket_types: ticketTypes,
    source: event.source || 'manual'
  };
};

// Helper function for public events
const getPublicEvents = async (req, res) => {
  try {
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    const events = await dbOperations.all(`
      SELECT * FROM events 
      WHERE status = 'VALIDATED' 
      AND archived = 0
      ORDER BY start_date ASC
      LIMIT 20
    `);
    
    const parsedEvents = events.map(parseEventData);

    return res.json({ 
      success: true, 
      events: parsedEvents,
      count: parsedEvents.length,
      message: 'Public events retrieved successfully'
    });
  } catch (err) {
    console.error('❌ [EVENTS API] Public events error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch public events',
      events: [] 
    });
  }
};

// Helper function for authenticated events
const getAllEventsHandler = async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Fetching events for management...');
    
    const user = req.user;
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    // Check if user has proper role
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    console.log(`👤 User: ${userEmail}, Role: ${userRole}, Is Admin: ${isAdmin}`);
    
    // Get events with proper filtering
    let query = '';
    let params = [];
    
    if (isAdmin) {
      // Admins can see all events
      query = `
        SELECT e.*,
               COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name,
               COALESCE(a.email, em.email, eo.email, ss.email, c.email) as creator_email
        FROM events e
        LEFT JOIN admins a ON e.created_by = a.email
        LEFT JOIN event_managers em ON e.created_by = em.email
        LEFT JOIN event_organizers eo ON e.created_by = eo.email
        LEFT JOIN support_staff ss ON e.created_by = ss.email
        LEFT JOIN customers c ON e.created_by = c.email
        ORDER BY e.created_at DESC
      `;
    } else {
      // Event managers can see their own events and validated/pending events from others
      query = `
        SELECT e.*,
               COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name,
               COALESCE(a.email, em.email, eo.email, ss.email, c.email) as creator_email
        FROM events e
        LEFT JOIN admins a ON e.created_by = a.email
        LEFT JOIN event_managers em ON e.created_by = em.email
        LEFT JOIN event_organizers eo ON e.created_by = eo.email
        LEFT JOIN support_staff ss ON e.created_by = ss.email
        LEFT JOIN customers c ON e.created_by = c.email
        WHERE e.created_by = ? OR e.status IN ('VALIDATED', 'PENDING')
        ORDER BY e.created_at DESC
      `;
      params = [userEmail];
    }
    
    const events = await dbOperations.all(query, params);
    
    // Parse ticket types for each event
    const parsedEvents = events.map(event => {
      let ticketTypes = [];
      try {
        if (event.ticket_types && typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
          ticketTypes = JSON.parse(event.ticket_types);
        } else if (Array.isArray(event.ticket_types)) {
          ticketTypes = event.ticket_types;
        }
      } catch (error) {
        console.error(`Error parsing ticket_types for event ${event.event_id}:`, error);
        ticketTypes = [];
      }
      
      return {
        ...event,
        ticket_types: ticketTypes,
        price: parseFloat(event.price) || 0,
        max_attendees: parseInt(event.max_attendees) || 0,
        end_date: event.end_date || null,
        image_url: event.image_url || null,
        source: event.source || 'manual'
      };
    });
    
    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} events`);
    
    // Calculate counts
    const counts = {
      all: parsedEvents.length,
      pending: parsedEvents.filter(e => e.status === 'PENDING' && e.archived !== 1).length,
      validated: parsedEvents.filter(e => e.status === 'VALIDATED' && e.archived !== 1).length,
      archived: parsedEvents.filter(e => e.archived === 1).length,
    };
    
    return res.json({
      success: true,
      events: parsedEvents,
      counts: counts,
      count: parsedEvents.length,
      message: 'Events retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error fetching events:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events',
      details: error.message,
      events: []
    });
  }
};

// ========================
// MIDDLEWARE
// ========================

// Helper function to check if the user is authorized for management
const isManagerOrAdmin = (user) => {
  const role = user?.role || user?.userType;
  return ['admin', 'SUPER_ADMIN', 'event_manager'].includes(role);
};

// ========================
// PUBLIC ROUTES (NO AUTH REQUIRED)
// ========================

// 1. PUBLIC: Get public events (no auth required)
router.get('/public', async (req, res) => {
  try {
    console.log('📋 [EVENTS API] PUBLIC endpoint called (no auth required)');
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    // Get public events - NO AUTHENTICATION REQUIRED
    const events = await dbOperations.all(`
      SELECT * FROM events 
      WHERE status = 'VALIDATED' 
      AND archived = 0
      ORDER BY start_date ASC
      LIMIT 50
    `);
    
    const parsedEvents = events.map(parseEventData);

    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} public events`);

    return res.json({ 
      success: true, 
      events: parsedEvents,
      count: parsedEvents.length,
      message: 'Public events retrieved successfully'
    });
  } catch (err) {
    console.error('❌ [EVENTS API] Public events error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch public events',
      events: [] 
    });
  }
});

// 2. PUBLIC: Get validated events for public
router.get('/public/validated', async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Fetching validated events for public...');
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    // Display events that are VALIDATED, NOT ARCHIVED
    const events = await dbOperations.all(`
      SELECT * FROM events 
      WHERE status = 'VALIDATED' 
      AND archived = 0
      ORDER BY start_date ASC
    `);

    const parsedEvents = events.map(parseEventData);

    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} validated events for public`);

    return res.json({ 
      success: true, 
      events: parsedEvents,
      count: parsedEvents.length,
      message: 'Validated events retrieved successfully'
    });
  } catch (err) {
    console.error('❌ [EVENTS API] Fetch public events error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch public events' 
    });
  }
});

// ========================
// ROOT ENDPOINT WITH AUTH DETECTION
// ========================

router.get('/', async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Root endpoint called');
    
    // Check if it's an authenticated request
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      // If authenticated, forward to the authenticated events handler
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'ticket-hub-super-secret-2025';
      const token = authHeader.split(' ')[1];
      
      try {
        jwt.verify(token, JWT_SECRET, async (err, user) => {
          if (err) {
            // Token invalid, return public events
            console.log('⚠️ Invalid token, returning public events');
            return getPublicEvents(req, res);
          }
          
          // Token valid, get admin/manager events
          req.user = user;
          
          // Check if user has proper role
          const userRole = user?.role || user?.userType;
          if (!['admin', 'SUPER_ADMIN', 'event_manager'].includes(userRole)) {
            console.log('⚠️ User not admin/manager, returning public events');
            return getPublicEvents(req, res);
          }
          
          return await getAllEventsHandler(req, res);
        });
      } catch (jwtError) {
        console.log('⚠️ JWT error, returning public events');
        return getPublicEvents(req, res);
      }
    } else {
      // No auth header, return public events
      console.log('⚠️ No auth header, returning public events');
      return getPublicEvents(req, res);
    }
  } catch (error) {
    console.error('❌ [EVENTS API] Root endpoint error:', error);
    return getPublicEvents(req, res);
  }
});

// ========================
// PROTECTED ROUTES (AUTH REQUIRED)
// ========================

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'ticket-hub-super-secret-2025';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    
    const role = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(role);
    const isManager = role === 'event_manager';
    
    if (!isAdmin && !isManager) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    req.user = user;
    next();
  });
};

// Middleware to ensure staff access (compatible with both versions)
const requireStaffAccess = authenticateToken;

// 1. GET ALL EVENTS (for EventManagementScreen) - FIXED VERSION
router.get('/manage/all', requireStaffAccess, async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Fetching events for management...');
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    console.log(`👤 User: ${userEmail}, Role: ${userRole}, Is Admin: ${isAdmin}`);
    
    // Get events with proper filtering - FIXED QUERY
    let query = '';
    let params = [];
    
    if (isAdmin) {
      // Admins can see all events
      query = `
        SELECT e.*,
               COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name,
               COALESCE(a.email, em.email, eo.email, ss.email, c.email) as creator_email
        FROM events e
        LEFT JOIN admins a ON e.created_by = a.email
        LEFT JOIN event_managers em ON e.created_by = em.email
        LEFT JOIN event_organizers eo ON e.created_by = eo.email
        LEFT JOIN support_staff ss ON e.created_by = ss.email
        LEFT JOIN customers c ON e.created_by = c.email
        ORDER BY e.created_at DESC
      `;
    } else {
      // Event managers can see their own events and validated/pending events from others
      query = `
        SELECT e.*,
               COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name,
               COALESCE(a.email, em.email, eo.email, ss.email, c.email) as creator_email
        FROM events e
        LEFT JOIN admins a ON e.created_by = a.email
        LEFT JOIN event_managers em ON e.created_by = em.email
        LEFT JOIN event_organizers eo ON e.created_by = eo.email
        LEFT JOIN support_staff ss ON e.created_by = ss.email
        LEFT JOIN customers c ON e.created_by = c.email
        WHERE e.created_by = ? OR e.status IN ('VALIDATED', 'PENDING')
        ORDER BY e.created_at DESC
      `;
      params = [userEmail];
    }
    
    console.log(`📋 [EVENTS API] Executing query: ${query}`);
    console.log(`📋 [EVENTS API] Query params: ${JSON.stringify(params)}`);
    
    const events = await dbOperations.all(query, params);
    
    // Parse ticket types for each event
    const parsedEvents = events.map(event => {
      let ticketTypes = [];
      try {
        if (event.ticket_types && typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
          ticketTypes = JSON.parse(event.ticket_types);
        } else if (Array.isArray(event.ticket_types)) {
          ticketTypes = event.ticket_types;
        }
      } catch (error) {
        console.error(`Error parsing ticket_types for event ${event.event_id}:`, error);
        ticketTypes = [];
      }
      
      return {
        ...event,
        ticket_types: ticketTypes,
        price: parseFloat(event.price) || 0,
        max_attendees: parseInt(event.max_attendees) || 0,
        end_date: event.end_date || null,
        image_url: event.image_url || null,
        source: event.source || 'manual'
      };
    });
    
    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} events`);
    
    // Calculate counts
    const counts = {
      all: parsedEvents.length,
      pending: parsedEvents.filter(e => e.status === 'PENDING' && e.archived !== 1).length,
      validated: parsedEvents.filter(e => e.status === 'VALIDATED' && e.archived !== 1).length,
      archived: parsedEvents.filter(e => e.archived === 1).length,
    };
    
    res.json({
      success: true,
      events: parsedEvents,
      counts: counts,
      count: parsedEvents.length,
      message: 'Events retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error fetching events:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 2. GET SINGLE EVENT BY ID - FIXED VERSION
router.get('/:id', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Fetching event ${eventId}...`);
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Get the event with creator info - FIXED QUERY
    const event = await dbOperations.get(`
      SELECT e.*,
             COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name,
             COALESCE(a.email, em.email, eo.email, ss.email, c.email) as creator_email
      FROM events e
      LEFT JOIN admins a ON e.created_by = a.email
      LEFT JOIN event_managers em ON e.created_by = em.email
      LEFT JOIN event_organizers eo ON e.created_by = eo.email
      LEFT JOIN support_staff ss ON e.created_by = ss.email
      LEFT JOIN customers c ON e.created_by = c.email
      WHERE e.event_id = ?
    `, [eventId]);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }
    
    // Check permissions (managers can only edit their own events unless admin)
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    if (!isAdmin && event.created_by !== userEmail && event.status !== 'VALIDATED') {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only view your own events or validated events' 
      });
    }
    
    console.log(`✅ [EVENTS API] Found event: ${event.event_name}`);
    
    // Parse ticket types
    let ticketTypes = [];
    try {
      if (event.ticket_types && typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
        ticketTypes = JSON.parse(event.ticket_types);
      } else if (Array.isArray(event.ticket_types)) {
        ticketTypes = event.ticket_types;
      }
    } catch (error) {
      console.error(`Error parsing ticket_types for event ${eventId}:`, error);
      ticketTypes = [];
    }
    
    const eventDetails = {
      ...event,
      ticket_types: ticketTypes,
      price: parseFloat(event.price) || 0,
      max_attendees: parseInt(event.max_attendees) || 0,
      end_date: event.end_date || null,
      image_url: event.image_url || null,
      source: event.source || 'manual'
    };
    
    res.json({
      success: true,
      event: eventDetails,
      message: 'Event retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error fetching event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch event',
      details: error.message 
    });
  }
});

// 3. CREATE NEW EVENT (UPDATED WITH APPROVAL LOGIC)
router.post('/', requireStaffAccess, async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Creating new event...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    const userRole = user?.role || user?.userType;
    const userEmail = user.email;
    
    // Determine if event requires approval
    // Admins and Event Managers don't need approval
    const requiresApproval = !['admin', 'SUPER_ADMIN', 'event_manager'].includes(userRole);
    
    // Set initial status based on approval requirement
    const initialStatus = requiresApproval ? 'PENDING' : 'VALIDATED';
    
    const {
      event_name,
      event_description,
      location,
      start_date,
      end_date,
      max_attendees,
      price,
      image_url,
      ticket_types = []
    } = req.body;
    
    // Validate required fields
    if (!event_name || !location || !start_date || !max_attendees) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, location, start date, and max attendees' 
      });
    }
    
    // Parse numeric values
    const parsedMaxAttendees = parseInt(max_attendees) || 0;
    const parsedPrice = parseFloat(price) || 0;
    
    // Validate max attendees
    if (parsedMaxAttendees <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Max attendees must be greater than 0'
      });
    }
    
    // Convert ticket_types to JSON string
    let ticketTypesString = '[]';
    try {
      // Ensure ticket_types is an array and has valid data
      const validTicketTypes = Array.isArray(ticket_types) 
        ? ticket_types.filter(t => t && t.name && t.name.trim())
        : [];
      
      if (validTicketTypes.length === 0) {
        // Add a default ticket type if none provided
        validTicketTypes.push({
          name: 'General Admission',
          price: parsedPrice,
          quantity: parsedMaxAttendees
        });
      }
      
      ticketTypesString = JSON.stringify(validTicketTypes);
    } catch (error) {
      console.error('Error stringifying ticket types:', error);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid format for ticket types' 
      });
    }
    
    const archived = 0;
    const source = 'manual';
    
    console.log('📝 Prepared data for insertion:', {
      event_name,
      location,
      start_date,
      max_attendees: parsedMaxAttendees,
      price: parsedPrice,
      status: initialStatus,
      requires_approval: requiresApproval,
      source,
      userEmail,
      userRole,
      ticketTypesLength: ticket_types?.length || 0
    });
    
    // Insert the event with approval logic
    const result = await dbOperations.run(`
      INSERT INTO events (
        event_name, event_description, location, 
        start_date, end_date, max_attendees, price, image_url, 
        created_by, status, archived, requires_approval,
        created_at, updated_at, source, user_type, ticket_types
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
    `, [
      event_name,
      event_description || '',
      location,
      start_date,
      end_date || null,
      parsedMaxAttendees,
      parsedPrice,
      image_url || null,
      userEmail,
      initialStatus, // PENDING or VALIDATED based on user role
      archived,
      requiresApproval ? 1 : 0, // Set approval requirement
      source,
      userRole,
      ticketTypesString
    ]);
    
    // DEBUG: Log the insert result
    console.log('🔍 Insert result:', JSON.stringify(result, null, 2));
    
    // Get the last inserted ID - SQLite needs this approach
    let eventId = result.lastID || result.id;
    
    // If still undefined, get it directly from the database
    if (!eventId) {
      const row = await dbOperations.get(
        `SELECT last_insert_rowid() as id`
      );
      eventId = row?.id;
      console.log(`⚠ Using fallback event ID: ${eventId}`);
    }
    
    console.log(`✅ [EVENTS API] Created event ${eventId}: ${event_name} with status: ${initialStatus}`);
    
    // Get the created event - FIXED QUERY
    const createdEvent = await dbOperations.get(`
      SELECT e.*,
             COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name
      FROM events e
      LEFT JOIN admins a ON e.created_by = a.email
      LEFT JOIN event_managers em ON e.created_by = em.email
      LEFT JOIN event_organizers eo ON e.created_by = eo.email
      LEFT JOIN support_staff ss ON e.created_by = ss.email
      LEFT JOIN customers c ON e.created_by = c.email
      WHERE e.event_id = ?
    `, [eventId]);
    
    if (!createdEvent) {
      // Try to find it by name as fallback
      const fallbackEvent = await dbOperations.get(
        `SELECT * FROM events WHERE event_name = ? AND created_by = ? ORDER BY event_id DESC LIMIT 1`,
        [event_name, userEmail]
      );
      
      if (fallbackEvent) {
        console.log(`✅ Found event by fallback: ${fallbackEvent.event_id}`);
        res.status(201).json({
          success: true,
          event: parseEventData(fallbackEvent),
          event_id: fallbackEvent.event_id,
          message: `Event created successfully with status: ${fallbackEvent.status}`
        });
        return;
      }
      
      return res.status(500).json({
        success: false,
        error: 'Event created but could not be retrieved'
      });
    }
    
    res.status(201).json({
      success: true,
      event: parseEventData(createdEvent),
      event_id: eventId,
      message: `Event created successfully with status: ${initialStatus}`
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error creating event:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Event with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

// 4. UPDATE EVENT (FIXED VERSION)
router.put('/:id', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Updating event ${eventId}...`);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check if event exists
    const existingEvent = await dbOperations.get(`
      SELECT * FROM events 
      WHERE event_id = ?
    `, [eventId]);
    
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }
    
    // Check permissions
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    if (!isAdmin && existingEvent.created_by !== userEmail) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only update your own events' 
      });
    }
    
    const {
      event_name,
      event_description,
      location,
      start_date,
      end_date,
      max_attendees,
      price,
      image_url,
      ticket_types = []
    } = req.body;
    
    // Validate required fields
    if (!event_name || !location || !start_date || !max_attendees) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, location, start date, and max attendees' 
      });
    }
    
    // Parse numeric values
    const parsedMaxAttendees = parseInt(max_attendees) || 0;
    const parsedPrice = parseFloat(price) || 0;
    
    // Validate max attendees
    if (parsedMaxAttendees <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Max attendees must be greater than 0'
      });
    }
    
    // Convert ticket_types to JSON string
    let ticketTypesString = '[]';
    try {
      // Ensure ticket_types is an array and has valid data
      const validTicketTypes = Array.isArray(ticket_types) 
        ? ticket_types.filter(t => t && t.name && t.name.trim())
        : [];
      
      if (validTicketTypes.length === 0) {
        // Use existing ticket types if none provided
        try {
          if (existingEvent.ticket_types && typeof existingEvent.ticket_types === 'string') {
            const existingTickets = JSON.parse(existingEvent.ticket_types);
            if (Array.isArray(existingTickets) && existingTickets.length > 0) {
              ticketTypesString = existingEvent.ticket_types;
            } else {
              ticketTypesString = JSON.stringify([{
                name: 'General Admission',
                price: parsedPrice,
                quantity: parsedMaxAttendees
              }]);
            }
          }
        } catch (parseError) {
          console.error('Error parsing existing ticket types:', parseError);
          ticketTypesString = JSON.stringify([{
            name: 'General Admission',
            price: parsedPrice,
            quantity: parsedMaxAttendees
          }]);
        }
      } else {
        ticketTypesString = JSON.stringify(validTicketTypes);
      }
    } catch (error) {
      console.error('Error stringifying ticket types:', error);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid format for ticket types' 
      });
    }
    
    // Update the event with permission check
    const result = await dbOperations.run(`
      UPDATE events SET
        event_name = ?,
        event_description = ?,
        location = ?,
        start_date = ?,
        end_date = ?,
        max_attendees = ?,
        price = ?,
        image_url = ?,
        ticket_types = ?,
        updated_at = datetime('now')
      WHERE event_id = ?
      AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
    `, [
      event_name,
      event_description || '',
      location,
      start_date,
      end_date || null,
      parsedMaxAttendees,
      parsedPrice,
      image_url || null,
      ticketTypesString,
      eventId,
      userEmail,
      userRole,
      userRole
    ]);
    
    if (result.changes === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied or no changes made' 
      });
    }
    
    console.log(`✅ [EVENTS API] Updated event ${eventId}`);
    
    // Get the updated event - FIXED QUERY
    const updatedEvent = await dbOperations.get(`
      SELECT e.*,
             COALESCE(a.name, em.name, eo.name, ss.name, c.name) as creator_name
      FROM events e
      LEFT JOIN admins a ON e.created_by = a.email
      LEFT JOIN event_managers em ON e.created_by = em.email
      LEFT JOIN event_organizers eo ON e.created_by = eo.email
      LEFT JOIN support_staff ss ON e.created_by = ss.email
      LEFT JOIN customers c ON e.created_by = c.email
      WHERE e.event_id = ?
    `, [eventId]);
    
    res.json({
      success: true,
      event: parseEventData(updatedEvent),
      message: 'Event updated successfully'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error updating event:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Event with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update event',
      details: error.message 
    });
  }
});

// 5. DELETE EVENT
router.delete('/:id', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Deleting event ${eventId}...`);
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check if event exists
    const existingEvent = await dbOperations.get(`
      SELECT * FROM events WHERE event_id = ?
    `, [eventId]);
    
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }
    
    // Check permissions
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    if (!isAdmin && existingEvent.created_by !== userEmail) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only delete your own events' 
      });
    }
    
    // Delete the event with permission check
    const result = await dbOperations.run(`
      DELETE FROM events 
      WHERE event_id = ? 
      AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
    `, [eventId, userEmail, userRole, userRole]);
    
    if (result.changes === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied or no changes made' 
      });
    }
    
    console.log(`✅ [EVENTS API] Deleted event ${eventId}`);
    
    res.json({
      success: true,
      message: 'Event permanently deleted!',
      eventId: eventId
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error deleting event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete event',
      details: error.message 
    });
  }
});

// 6. GET EVENT STATISTICS
router.get('/stats/validated', requireStaffAccess, async (req, res) => {
  try {
    console.log('📊 [EVENTS API] Getting events statistics...');
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' AND archived = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'VALIDATED' AND archived = 0 THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as created_today
      FROM events
      WHERE 1=1
    `;
    
    const params = [];
    
    if (!isAdmin) {
      query += ` AND (created_by = ? OR status IN ('VALIDATED', 'PENDING'))`;
      params.push(userEmail);
    }
    
    const stats = await dbOperations.get(query, params);
    
    console.log(`✅ [EVENTS API] Statistics retrieved`);
    
    res.json({
      success: true,
      stats: {
        total: stats.total || 0,
        pending: stats.pending || 0,
        validated: stats.validated || 0,
        archived: stats.archived || 0,
        created_today: stats.created_today || 0
      },
      message: 'Events statistics retrieved'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics' 
    });
  }
});

// 7. SEARCH EVENTS
router.get('/search/validated', requireStaffAccess, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.json({
        success: true,
        events: [],
        message: 'No search query provided'
      });
    }
    
    console.log(`🔍 [EVENTS API] Searching events for: ${query}`);
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    const userEmail = user.email;
    
    let sqlQuery = `
      SELECT * FROM events 
      WHERE 1=1
      AND (event_name LIKE ? OR location LIKE ? OR event_description LIKE ?)
    `;
    
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (!isAdmin) {
      sqlQuery += ` AND (created_by = ? OR status IN ('VALIDATED', 'PENDING'))`;
      params.push(userEmail);
    }
    
    sqlQuery += ` ORDER BY created_at DESC`;
    
    const events = await dbOperations.all(sqlQuery, params);
    const parsedEvents = events.map(parseEventData);
    
    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} events matching: ${query}`);
    
    res.json({
      success: true,
      events: parsedEvents,
      count: parsedEvents.length,
      message: 'Search results retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search events' 
    });
  }
});

// ========================
// ADDITIONAL ROUTES FROM ORIGINAL FILE
// ========================

// 8. NEW: Get pending events for approval - FIXED QUERY
router.get('/pending/approvals', requireStaffAccess, async (req, res) => {
  try {
    console.log('📋 [EVENTS API] Fetching pending events for approval...');
    
    const user = req.user;
    const userRole = user?.role || user?.userType;
    
    // Only admins can approve events
    if (!['admin', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required for approvals' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable',
        events: []
      });
    }
    
    // Get events that require approval and are pending - FIXED QUERY
    const pendingEvents = await dbOperations.all(`
      SELECT e.*, 
             COALESCE(a.name, em.name, eo.name, ss.name, c.name) as organizer_name,
             COALESCE(a.email, em.email, eo.email, ss.email, c.email) as organizer_email
      FROM events e
      LEFT JOIN admins a ON e.created_by = a.email
      LEFT JOIN event_managers em ON e.created_by = em.email
      LEFT JOIN event_organizers eo ON e.created_by = eo.email
      LEFT JOIN support_staff ss ON e.created_by = ss.email
      LEFT JOIN customers c ON e.created_by = c.email
      WHERE e.status = 'PENDING' 
      AND e.requires_approval = 1
      AND e.archived = 0
      ORDER BY e.created_at DESC
    `);
    
    // Parse ticket types for each event
    const parsedEvents = pendingEvents.map(event => {
      let ticketTypes = [];
      try {
        if (event.ticket_types && typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
          ticketTypes = JSON.parse(event.ticket_types);
        } else if (Array.isArray(event.ticket_types)) {
          ticketTypes = event.ticket_types;
        }
      } catch (error) {
        console.error(`Error parsing ticket_types for event ${event.event_id}:`, error);
        ticketTypes = [];
      }
      
      return {
        ...event,
        ticket_types: ticketTypes,
        price: parseFloat(event.price) || 0,
        max_attendees: parseInt(event.max_attendees) || 0
      };
    });
    
    console.log(`✅ [EVENTS API] Found ${parsedEvents.length} pending events for approval`);
    
    res.json({
      success: true,
      events: parsedEvents,
      count: parsedEvents.length,
      message: 'Pending events retrieved for approval'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error fetching pending events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending events',
      details: error.message 
    });
  }
});

// 9. NEW: Get event details for approval modal - FIXED QUERY
router.get('/:id/approval-details', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Getting approval details for event ${eventId}...`);
    
    const user = req.user;
    const userRole = user?.role || user?.userType;
    
    // Only admins can view approval details
    if (!['admin', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Get full event details with user info - FIXED QUERY
    const event = await dbOperations.get(`
      SELECT e.*,
             COALESCE(a.name, em.name, eo.name, ss.name, c.name) as organizer_full_name,
             COALESCE(a.email, em.email, eo.email, ss.email, c.email) as organizer_email,
             COALESCE(a.phone, em.phone, eo.phone, ss.phone, c.phone) as organizer_phone,
             CASE 
               WHEN a.admin_id IS NOT NULL THEN 'admin'
               WHEN em.manager_id IS NOT NULL THEN 'event_manager'
               WHEN eo.organizer_id IS NOT NULL THEN 'event_organizer'
               WHEN ss.support_id IS NOT NULL THEN 'support'
               WHEN c.customer_id IS NOT NULL THEN 'customer'
               ELSE 'unknown'
             END as organizer_type
      FROM events e
      LEFT JOIN admins a ON e.created_by = a.email
      LEFT JOIN event_managers em ON e.created_by = em.email
      LEFT JOIN event_organizers eo ON e.created_by = eo.email
      LEFT JOIN support_staff ss ON e.created_by = ss.email
      LEFT JOIN customers c ON e.created_by = c.email
      WHERE e.event_id = ?
      AND e.status = 'PENDING'
      AND e.requires_approval = 1
    `, [eventId]);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pending event not found or already processed' 
      });
    }
    
    // Parse ticket types
    let ticketTypes = [];
    try {
      if (event.ticket_types && typeof event.ticket_types === 'string' && event.ticket_types.trim() !== '') {
        ticketTypes = JSON.parse(event.ticket_types);
      } else if (Array.isArray(event.ticket_types)) {
        ticketTypes = event.ticket_types;
      }
    } catch (error) {
      console.error(`Error parsing ticket_types for event ${eventId}:`, error);
      ticketTypes = [];
    }
    
    const eventDetails = {
      ...event,
      ticket_types: ticketTypes,
      price: parseFloat(event.price) || 0,
      max_attendees: parseInt(event.max_attendees) || 0
    };
    
    console.log(`✅ [EVENTS API] Retrieved approval details for event ${eventId}`);
    
    res.json({
      success: true,
      event: eventDetails,
      message: 'Event approval details retrieved'
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error getting approval details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get approval details',
      details: error.message 
    });
  }
});

// 10. UPDATED: Validate event (approve) with better logic
router.put('/:id/validate', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { notes } = req.body; // Optional approval notes
    console.log(`📋 [EVENTS API] Validating/approving event ${eventId}...`);
    
    const user = req.user;
    const userRole = user?.role || user?.userType;
    const userEmail = user.email;
    
    // Only admins can validate/approve events
    if (!['admin', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required for event approval' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check if event exists and is pending
    const existingEvent = await dbOperations.get(`
      SELECT * FROM events 
      WHERE event_id = ? 
      AND status = 'PENDING'
      AND requires_approval = 1
      AND archived = 0
    `, [eventId]);
    
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pending event not found or already processed' 
      });
    }
    
    // Update event status to VALIDATED
    const result = await dbOperations.run(`
      UPDATE events SET 
        status = 'VALIDATED',
        updated_at = datetime('now'),
        notes = COALESCE(?, notes)
      WHERE event_id = ?
    `, [notes || null, eventId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found or no changes made' 
      });
    }
    
    // Log the approval activity
    try {
      await dbOperations.run(`
        INSERT INTO user_activity_logs (user_id, user_email, activity_type, activity_details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `, [
        user.userId || 'admin',
        userEmail,
        'event_approved',
        JSON.stringify({
          event_id: eventId,
          event_name: existingEvent.event_name,
          approved_by: userEmail,
          notes: notes || null
        }),
        req.ip || '127.0.0.1'
      ]);
    } catch (logError) {
      console.error('Error logging approval activity:', logError);
    }
    
    console.log(`✅ [EVENTS API] Approved event ${eventId} by ${userEmail}`);
    
    // Get the updated event
    const updatedEvent = await dbOperations.get(`
      SELECT * FROM events WHERE event_id = ?
    `, [eventId]);
    
    res.json({
      success: true,
      event: parseEventData(updatedEvent),
      message: 'Event successfully approved and validated',
      eventId: eventId,
      status: 'VALIDATED',
      approved_by: userEmail
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error approving event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve event',
      details: error.message 
    });
  }
});

// 11. NEW: Reject event (with optional reason)
router.put('/:id/reject', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { reason } = req.body; // Rejection reason
    console.log(`📋 [EVENTS API] Rejecting event ${eventId}...`);
    
    const user = req.user;
    const userRole = user?.role || user?.userType;
    const userEmail = user.email;
    
    // Only admins can reject events
    if (!['admin', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required for event rejection' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check if event exists and is pending
    const existingEvent = await dbOperations.get(`
      SELECT * FROM events 
      WHERE event_id = ? 
      AND status = 'PENDING'
      AND requires_approval = 1
      AND archived = 0
    `, [eventId]);
    
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pending event not found or already processed' 
      });
    }
    
    // Update event status to REJECTED
    const result = await dbOperations.run(`
      UPDATE events SET 
        status = 'REJECTED',
        updated_at = datetime('now'),
        notes = ?
      WHERE event_id = ?
    `, [reason || 'Event rejected by administrator', eventId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found or no changes made' 
      });
    }
    
    // Log the rejection activity
    try {
      await dbOperations.run(`
        INSERT INTO user_activity_logs (user_id, user_email, activity_type, activity_details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `, [
        user.userId || 'admin',
        userEmail,
        'event_rejected',
        JSON.stringify({
          event_id: eventId,
          event_name: existingEvent.event_name,
          rejected_by: userEmail,
          reason: reason || null
        }),
        req.ip || '127.0.0.1'
      ]);
    } catch (logError) {
      console.error('Error logging rejection activity:', logError);
    }
    
    console.log(`✅ [EVENTS API] Rejected event ${eventId} by ${userEmail}`);
    
    res.json({
      success: true,
      message: 'Event successfully rejected',
      eventId: eventId,
      status: 'REJECTED',
      rejected_by: userEmail,
      reason: reason || null
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error rejecting event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject event',
      details: error.message 
    });
  }
});

// 12. Archive event
router.put('/:id/archive', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Archiving event ${eventId}...`);
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check permissions (only admin can archive events)
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required for this action' 
      });
    }
    
    const userEmail = user.email;
    
    const result = await dbOperations.run(`
      UPDATE events SET archived = 1, updated_at = datetime('now')
      WHERE event_id = ? 
      AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
    `, [eventId, userEmail, userRole, userRole]);
    
    if (result.changes === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied or event not found' 
      });
    }
    
    console.log(`✅ [EVENTS API] Archived event ${eventId}`);
    
    res.json({
      success: true,
      message: 'Event successfully archived',
      eventId: eventId,
      archived: 1
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error archiving event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to archive event',
      details: error.message 
    });
  }
});

// 13. Unarchive event
router.put('/:id/unarchive', requireStaffAccess, async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`📋 [EVENTS API] Unarchiving event ${eventId}...`);
    
    const user = req.user;
    if (!isManagerOrAdmin(user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin or Event Manager access required' 
      });
    }
    
    const dbOperations = getDbOperations(req);
    
    if (!dbOperations) {
      console.error('[EVENTS API] Database operations not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database service temporarily unavailable' 
      });
    }
    
    // Check permissions (only admin can unarchive events)
    const userRole = user?.role || user?.userType;
    const isAdmin = ['admin', 'SUPER_ADMIN'].includes(userRole);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required for this action' 
      });
    }
    
    const userEmail = user.email;
    
    const result = await dbOperations.run(`
      UPDATE events SET archived = 0, updated_at = datetime('now')
      WHERE event_id = ? 
      AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
    `, [eventId, userEmail, userRole, userRole]);
    
    if (result.changes === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied or event not found' 
      });
    }
    
    console.log(`✅ [EVENTS API] Unarchived event ${eventId}`);
    
    res.json({
      success: true,
      message: 'Event successfully restored from archive',
      eventId: eventId,
      archived: 0
    });
    
  } catch (error) {
    console.error('❌ [EVENTS API] Error unarchiving event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restore event',
      details: error.message 
    });
  }
});

// ========================
// TEST ENDPOINTS
// ========================

// TEST: Simple endpoint to verify events route is working
router.get('/test/health', (req, res) => {
  const dbOperations = getDbOperations(req);
  const dbStatus = dbOperations ? 'connected' : 'not connected';
  
  res.json({
    success: true,
    message: 'Events API is working!',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0'
  });
});

// TEST: Get API info
router.get('/info', (req, res) => {
  res.json({
    success: true,
    service: 'Events API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/events',
      'GET /api/events/public',
      'GET /api/events/:id',
      'POST /api/events',
      'PUT /api/events/:id',
      'DELETE /api/events/:id'
    ]
  });
});

// ========================
// ERROR HANDLING MIDDLEWARE FOR THIS ROUTER
// ========================

router.use((err, req, res, next) => {
  console.error('❌ [EVENTS API] Route error:', err);
  
  // Check if it's a database connection error
  if (err.message && err.message.includes('database')) {
    return res.status(503).json({
      success: false,
      error: 'Database service unavailable. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;