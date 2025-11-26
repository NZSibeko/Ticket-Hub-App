// backend/routes/events.js - FINAL 100% WORKING (November 27, 2025)
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

const getAuth = (req) => req.app.locals.authenticateToken;

// PROTECTED: Get all events (Admin & Event Manager)
// This route is for staff and returns ALL events created by staff (as per previous logic).
router.get('/', (req, res, next) => {
  const auth = getAuth(req);
  if (!auth) return res.status(500).json({ success: false, error: 'Server error' });
  auth(req, res, next);
}, async (req, res) => {
  const user = req.user;
  const allowed = ['admin', 'SUPER_ADMIN', 'event_manager'].includes(user?.role) ||
                  ['admin', 'event_manager'].includes(user?.userType);

  if (!allowed) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  try {
    const events = await dbOperations.all(`SELECT * FROM events ORDER BY created_at DESC`);

    // **FIX: Added robust JSON parsing inside the map to prevent 500 errors on bad data**
    const parsedEvents = events.map(event => {
      let ticketTypes = [];
      try {
        if (event.ticket_types) {
          // Attempt to parse the JSON string
          ticketTypes = JSON.parse(event.ticket_types);
        }
      } catch (parseError) {
        // Log the error and default to an empty array for this event
        console.error(
          `Warning: Failed to parse ticket_types for event ID ${event.event_id || event.id}. Data: ${event.ticket_types}`,
          parseError
        );
        ticketTypes = []; 
      }

      return {
        ...event,
        ticket_types: ticketTypes
      };
    });

    res.json({ success: true, events: parsedEvents });
  } catch (err) {
    console.error('Get all events error:', err);
    res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

// PROTECTED: Create a new event (Admin & Event Manager)
router.post('/', (req, res, next) => {
  const auth = getAuth(req);
  if (!auth) return res.status(500).json({ success: false, error: 'Server error' });
  auth(req, res, next);
}, async (req, res) => {
  const user = req.user;
  const allowed = ['admin', 'SUPER_ADMIN', 'event_manager'].includes(user?.role) ||
                  ['admin', 'event_manager'].includes(user?.userType);

  if (!allowed) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { event_name, event_description, location, start_date, ticket_types, status = 'DRAFT' } = req.body;

  if (!event_name || !location || !start_date || !ticket_types) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const result = await dbOperations.run(`
      INSERT INTO events (
        event_name, event_description, location, start_date,
        ticket_types, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      event_name.trim(),
      event_description,
      location.trim(),
      start_date,
      JSON.stringify(ticket_types),
      status,
      user.email || user.admin_id || 'admin@tickethub.co.za'
    ]);

    res.json({ 
      success: true, 
      event_id: result.id, 
      message: 'Event created successfully!' 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'Event name already exists' });
    }
    console.error('Create event error:', err);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

// Public route (optional)
router.get('/public', async (req, res) => {
  try {
    // UPDATED: Now filters by 'created_by IS NOT NULL' instead of 'status = 'VALIDATED''
    // This allows newly created DRAFT events by admins/managers to show up immediately
    const events = await dbOperations.all(`
      SELECT * FROM events WHERE created_by IS NOT NULL AND archived = 0
      ORDER BY start_date ASC
    `);

    // Use the same robust parsing for public events
    const parsedEvents = events.map(event => {
      let ticketTypes = [];
      try {
        if (event.ticket_types) {
          ticketTypes = JSON.parse(event.ticket_types);
        }
      } catch (parseError) {
        console.error(
          `Warning: Failed to parse ticket_types for public event ID ${event.event_id || event.id}. Data: ${event.ticket_types}`,
          parseError
        );
        ticketTypes = []; 
      }

      return {
        ...event,
        ticket_types: ticketTypes
      };
    });

    res.json({ success: true, events: parsedEvents });
  } catch (err) {
    console.error('Get public events error:', err);
    res.status(500).json({ success: false, error: 'Failed to load public events' });
  }
});

module.exports = router;