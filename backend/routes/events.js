// backend/routes/events.js - FINAL FIXED VERSION (Using Email for created_by)
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const { v4: uuidv4 } = require('uuid');

const getAuth = (req) => req.app.locals.authenticateToken;

// Helper function to check if the user is authorized for management
const isManagerOrAdmin = (user) => {
  return ['admin', 'SUPER_ADMIN', 'event_manager'].includes(user?.role) ||
         ['admin', 'event_manager'].includes(user?.userType);
};

// Middleware to ensure staff access
const requireStaffAccess = (req, res, next) => {
    const auth = getAuth(req);
    if (!auth) return res.status(500).json({ success: false, error: 'Server error: Auth middleware not attached' });
    // This is the correct way to call the middleware to populate req.user
    auth(req, res, next);
};

// Helper function for parsing event data from DB (used by GET routes)
const parseEventData = (event) => {
  let ticketTypes = [];
  try {
    if (event.ticket_types) {
      // Ensure it only attempts to parse if it's a non-empty string
      if (typeof event.ticket_types === 'string') {
        ticketTypes = JSON.parse(event.ticket_types);
      } else if (Array.isArray(event.ticket_types)) {
        // Handle cases where data might already be an array (if coming from insert or other flow)
        ticketTypes = event.ticket_types;
      }
    }
  } catch (parseError) {
    console.error(
      `Warning: Failed to parse ticket_types for event ID ${event.event_id || event.id}. Data: ${event.ticket_types}`,
      parseError
    );
    ticketTypes = []; 
  }

  // Ensure price and max_attendees are numerical
  return {
    ...event,
    price: parseFloat(event.price) || 0,
    max_attendees: parseInt(event.max_attendees) || 0,
    // Add default values for view if null
    end_date: event.end_date || null,
    image_url: event.image_url || null,
    ticket_types: ticketTypes
  };
};

// =================================================================
// 1. CREATE EVENT (POST /) - Handles the "Create Event" card action
// =================================================================
router.post('/', requireStaffAccess, async (req, res) => {
  const user = req.user;
  
  if (!isManagerOrAdmin(user)) {
    return res.status(403).json({ success: false, error: 'Access denied: Must be an event manager or admin to create events' });
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
    ticket_types,
  } = req.body;

  // Basic Input Validation
  if (!event_name || !location || !start_date || !max_attendees) {
    return res.status(400).json({ success: false, error: 'Missing required event fields (name, location, start date, max attendees)' });
  }
  
  // ✅ FIX: Use the user's email as the identifier for the 'created_by' column.
  const created_by_identifier = user.email; 
  if (!created_by_identifier) {
    console.error('Authentication Error: User email missing in token payload.');
    // Changing the error to reflect the missing email/identifier specifically
    return res.status(500).json({ success: false, error: 'Internal server error: User email missing in authentication token payload.' });
  }
  
  const status = 'PENDING'; // Default status on creation
  const archived = 0; // Default non-archived

  let ticketTypesString = '[]';
  try {
    // Ensure ticket_types is a JSON string, defaulting to '[]' if not provided or invalid
    ticketTypesString = JSON.stringify(ticket_types || []);
  } catch (error) {
    console.error('Error stringifying ticket types:', error);
    return res.status(400).json({ success: false, error: 'Invalid format for ticket types' });
  }

  try {
    // FIX: Re-confirmed SQLITE_MISMATCH fix from previous step (no event_id in query)
    const query = `
      INSERT INTO events (
        event_name, event_description, location, 
        start_date, end_date, max_attendees, price, image_url, 
        created_by, status, archived, created_at, ticket_types
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `;
    
    const result = await dbOperations.run(query, [
      event_name, 
      event_description || null, 
      location, 
      start_date, 
      end_date || null, 
      parseInt(max_attendees) || 0, 
      parseFloat(price) || 0, 
      image_url || null, 
      created_by_identifier, // ✅ FIXED: Insert the email here
      status, 
      archived,
      ticketTypesString // Insert the JSON string
    ]);

    return res.status(201).json({ 
        success: true, 
        message: 'Event created and set to PENDING status.', 
        event_id: result.id 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'Another event with this name already exists' });
    }
    console.error('Create event error:', err);
    res.status(500).json({ success: false, error: 'Failed to create event due to an internal server error.' });
  }
});


// =================================================================
// 2. UPDATE EVENT (PUT /:id) - Handles the "Edit/View" button action
// =================================================================
router.put('/:id', requireStaffAccess, async (req, res) => {
  const eventId = req.params.id;
  const user = req.user;

  if (!isManagerOrAdmin(user)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
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
    ticket_types,
  } = req.body;

  if (!event_name || !location || !start_date || !max_attendees) {
    return res.status(400).json({ success: false, error: 'Missing required event fields (name, location, start date, max attendees)' });
  }

  let ticketTypesString = '[]';
  try {
    ticketTypesString = JSON.stringify(ticket_types || []);
  } catch (error) {
    return res.status(400).json({ success: false, error: 'Invalid format for ticket types' });
  }
  
  // ✅ FIX: Use user.email for the authorization check against the 'created_by' column.
  const created_by_identifier = user.email; 
  const userRole = user.role || user.userType;

  try {
    const query = `
      UPDATE events SET 
        event_name = ?, 
        event_description = ?, 
        location = ?, 
        start_date = ?, 
        end_date = ?, 
        max_attendees = ?, 
        price = ?, 
        image_url = ?, 
        updated_at = datetime('now'),
        ticket_types = ?
      WHERE event_id = ? 
      AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
    `;

    const result = await dbOperations.run(query, [
      event_name, 
      event_description || null, 
      location, 
      start_date, 
      end_date || null, 
      parseInt(max_attendees) || 0, 
      parseFloat(price) || 0, 
      image_url || null, 
      ticketTypesString,
      eventId, 
      created_by_identifier, // ✅ FIXED: Use email for created_by check
      userRole, 
      userRole  
    ]);
    
    if (result.changes === 0) {
        const existingEvent = await dbOperations.get(`SELECT event_id, created_by FROM events WHERE event_id = ?`, [eventId]);
        if (!existingEvent) {
             return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(403).json({ success: false, error: 'Access denied or no changes made' });
    }

    return res.status(200).json({ 
      success: true, 
      event_id: eventId, 
      message: 'Event updated successfully!' 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'Another event with this name already exists' });
    }
    console.error('Update event error:', err);
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});


// =================================================================
// 3. DELETE EVENT (DELETE /:id) - Handles the Delete button action
// =================================================================
router.delete('/:id', requireStaffAccess, async (req, res) => {
    const eventId = req.params.id;
    const user = req.user;

    if (!isManagerOrAdmin(user)) {
        return res.status(403).json({ success: false, error: 'Access denied: Must be an event manager or admin to delete events' });
    }
    
    // ✅ FIX: Use user.email for the authorization check against the 'created_by' column.
    const created_by_identifier = user.email; 
    const userRole = user.role || user.userType;


    try {
        const query = `
            DELETE FROM events 
            WHERE event_id = ? 
            AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
        `;

        const result = await dbOperations.run(query, [
            eventId, 
            created_by_identifier, // ✅ FIXED: Use email for created_by check
            userRole,
            userRole
        ]);

        if (result.changes === 0) {
            const existingEvent = await dbOperations.get(`SELECT event_id FROM events WHERE event_id = ?`, [eventId]);
            if (!existingEvent) {
                 return res.status(404).json({ success: false, error: 'Event not found' });
            }
            return res.status(403).json({ success: false, error: 'Access denied or no changes made' });
        }

        return res.status(200).json({ success: true, message: 'Event permanently deleted.' });

    } catch (err) {
        console.error('Delete event error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete event' });
    }
});


// PROTECTED: Get all events (Admin & Event Manager)
router.get('/', requireStaffAccess, async (req, res) => {
  const user = req.user;
  if (!isManagerOrAdmin(user)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  // Define the identifiers for Admin and Event Managers that create events.
  const createdBy = user.manager_id || user.user_id; 
  const userRole = user.role || user.userType;

  // FIX: Query remains the same to fetch all staff-created events
  let query = `SELECT * FROM events WHERE created_by IS NOT NULL`;
  let params = [];
  
  query += ` ORDER BY created_at DESC`;

  try {
    const events = await dbOperations.all(query, params);
    const parsedEvents = events.map(parseEventData);

    const counts = {
      all: parsedEvents.length,
      pending: parsedEvents.filter(e => e.status === 'PENDING' && e.archived !== 1).length,
      validated: parsedEvents.filter(e => e.status === 'VALIDATED' && e.archived !== 1).length,
      archived: parsedEvents.filter(e => e.archived === 1).length,
    };

    res.json({ success: true, events: parsedEvents, counts });
  } catch (err) {
    console.error('Fetch all events error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});


// Public route (for SearchEventsScreen)
router.get('/public', async (req, res) => {
  try {
    // SearchEventsScreen displays events that are VALIDATED and NOT ARCHIVED
    const events = await dbOperations.all(`
      SELECT * FROM events WHERE created_by IS NOT NULL AND archived = 0
      ORDER BY start_date ASC
    `);

    const parsedEvents = events.map(parseEventData);

    return res.json({ success: true, events: parsedEvents });
  } catch (err) {
    console.error('Fetch public events error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch public events' });
  }
});

// Status change routes (validate/archive/unarchive)
router.put('/:id/validate', requireStaffAccess, async (req, res) => {
    const eventId = req.params.id;
    const user = req.user;
    
    const created_by_identifier = user.email;
    const userRole = user.role || user.userType;

    try {
        const result = await dbOperations.run(`
            UPDATE events SET status = 'VALIDATED', updated_at = datetime('now')
            WHERE event_id = ? 
            AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
        `, [
            eventId, 
            created_by_identifier, // ✅ FIXED: Use email for created_by check
            userRole,
            userRole
        ]);

        if (result.changes === 0) {
             return res.status(403).json({ success: false, error: 'Access denied or event not found' });
        }
        res.json({ success: true, message: 'Event validated successfully!' });
    } catch (err) {
        console.error('Validate event error:', err);
        res.status(500).json({ success: false, error: 'Failed to validate event' });
    }
});

router.put('/:id/archive', requireStaffAccess, async (req, res) => {
    const eventId = req.params.id;
    const user = req.user;

    const created_by_identifier = user.email;
    const userRole = user.role || user.userType;

    try {
        const result = await dbOperations.run(`
            UPDATE events SET archived = 1, updated_at = datetime('now')
            WHERE event_id = ? 
            AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
        `, [
            eventId, 
            created_by_identifier, // ✅ FIXED: Use email for created_by check
            userRole,
            userRole
        ]);

        if (result.changes === 0) {
             return res.status(403).json({ success: false, error: 'Access denied or event not found' });
        }
        res.json({ success: true, message: 'Event archived successfully!' });
    } catch (err) {
        console.error('Archive event error:', err);
        res.status(500).json({ success: false, error: 'Failed to archive event' });
    }
});

router.put('/:id/unarchive', requireStaffAccess, async (req, res) => {
    const eventId = req.params.id;
    const user = req.user;
    
    const created_by_identifier = user.email;
    const userRole = user.role || user.userType;

    try {
        const result = await dbOperations.run(`
            UPDATE events SET archived = 0, updated_at = datetime('now')
            WHERE event_id = ? 
            AND (created_by = ? OR ? = 'admin' OR ? = 'SUPER_ADMIN')
        `, [
            eventId, 
            created_by_identifier, // ✅ FIXED: Use email for created_by check
            userRole,
            userRole
        ]);

        if (result.changes === 0) {
             return res.status(403).json({ success: false, error: 'Access denied or event not found' });
        }
        res.json({ success: true, message: 'Event restored successfully!' });
    } catch (err) {
        console.error('Unarchive event error:', err);
        res.status(500).json({ success: false, error: 'Failed to restore event' });
    }
});


module.exports = router;