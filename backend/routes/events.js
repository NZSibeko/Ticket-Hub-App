// backend/routes/events.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

const requireAdminOrManager = (req, res, next) => {
  const allowed = ['admin', 'SUPER_ADMIN', 'event_manager'].includes(req.user?.role) ||
                  ['admin', 'event_manager'].includes(req.user?.userType);
  if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });
  next();
};

// GET public events for customers
router.get('/public', async (req, res) => {
  try {
    const events = await dbOperations.all(`
      SELECT 
        event_id,
        event_name,
        event_description,
        location,
        start_date,
        end_date,
        event_image,
        currency,
        ticket_types,
        status
      FROM events
      WHERE status = 'VALIDATED' AND archived = 0
      ORDER BY start_date DESC
    `);

    const parsedEvents = events.map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));

    res.json({ success: true, events: parsedEvents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE event (admin + manager)
router.post('/', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const {
      event_name,
      event_description,
      location,
      start_date,
      end_date,
      event_image,
      currency = 'ZAR',
      ticket_types
    } = req.body;

    if (!event_name || !location || !start_date || !ticket_types?.length) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    const result = await dbOperations.run(`
      INSERT INTO events (
        event_name, event_description, location, start_date, end_date,
        event_image, currency, ticket_types, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VALIDATED', ?)
    `, [
      event_name,
      event_description || '',
      location,
      start_date,
      end_date || null,
      event_image || null,
      currency,
      JSON.stringify(ticket_types),
      req.user.manager_id || req.user.admin_id
    ]);

    res.json({ success: true, event_id: result.id });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'Event name already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;