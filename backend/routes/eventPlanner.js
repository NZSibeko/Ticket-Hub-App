// routes/eventPlanner.js - UPDATED WITH SEARCH AND DELETE
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Get all events for event manager with search
router.get('/events', async (req, res) => {
  try {
    const { search, category, partnershipStatus } = req.query;
    
    console.log('Fetching events with filters:', { search, category, partnershipStatus });
    
    let query = `
      SELECT 
        event_id as id,
        event_name as name,
        description,
        start_date as startDate,
        location,
        venue,
        source_url as sourceUrl,
        has_ticketing as hasTicketing,
        ticket_provider as ticketingProvider,
        partnership_status as partnershipStatus,
        notes,
        contact_email as contactEmail,
        contact_phone as contactPhone,
        organizer_name as organizerName,
        capacity,
        archived,
        category,
        created_at as createdAt,
        updated_at as updatedAt
      FROM events 
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add search filter
    if (search) {
      query += ` AND (
        event_name LIKE ? OR 
        description LIKE ? OR 
        venue LIKE ? OR 
        location LIKE ? OR 
        organizer_name LIKE ? OR
        contact_email LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add category filter
    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    // Add partnership status filter
    if (partnershipStatus && partnershipStatus !== 'all') {
      query += ` AND partnership_status = ?`;
      params.push(partnershipStatus);
    }
    
    query += ` ORDER BY 
      CASE WHEN partnership_status = 'untapped' THEN 0 ELSE 1 END,
      created_at DESC`;
    
    const events = await dbOperations.all(query, params);
    
    console.log(`Found ${events.length} events with current filters`);
    
    res.json({ 
      success: true, 
      events,
      counts: {
        total: events.length,
        active: events.filter(e => !e.archived).length,
        archived: events.filter(e => e.archived).length,
        untapped: events.filter(e => e.partnershipStatus === 'untapped' && !e.archived).length
      }
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// Get event categories for filter
router.get('/events/categories', async (req, res) => {
  try {
    const categories = await dbOperations.all(`
      SELECT DISTINCT category 
      FROM events 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `);
    
    res.json({ 
      success: true, 
      categories: categories.map(c => c.category) 
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Create new event
router.post('/events', async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      location,
      venue,
      contactEmail,
      contactPhone,
      organizerName,
      capacity,
      category,
      partnershipStatus,
      notes
    } = req.body;

    console.log('Creating new event:', req.body);

    if (!name) {
      return res.status(400).json({ success: false, error: 'Event name is required' });
    }

    const result = await dbOperations.run(
      `INSERT INTO events (
        event_name, description, start_date, location, venue,
        contact_email, contact_phone, organizer_name, capacity,
        category, partnership_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        name,
        description,
        startDate,
        location,
        venue,
        contactEmail,
        contactPhone,
        organizerName,
        capacity ? parseInt(capacity) : null,
        category || 'General',
        partnershipStatus || 'untapped',
        notes
      ]
    );

    console.log('Create event result:', result);

    // Fetch the created event to return
    const newEvent = await dbOperations.get(`
      SELECT 
        event_id as id,
        event_name as name,
        description,
        start_date as startDate,
        location,
        venue,
        contact_email as contactEmail,
        contact_phone as contactPhone,
        organizer_name as organizerName,
        capacity,
        category,
        partnership_status as partnershipStatus,
        notes,
        archived,
        created_at as createdAt,
        updated_at as updatedAt
      FROM events 
      WHERE event_id = ?
    `, [result.id]);

    res.json({ 
      success: true, 
      message: 'Event created successfully',
      event: newEvent
    });
  } catch (err) {
    console.error('Error creating event:', err);
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'An event with this name already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

// Archive/restore event
router.patch('/events/:eventId/archive', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { archived } = req.body;

    console.log('Archive request:', { eventId, archived });

    if (archived === undefined) {
      return res.status(400).json({ success: false, error: 'Archived status is required' });
    }

    const result = await dbOperations.run(
      'UPDATE events SET archived = ?, updated_at = datetime("now") WHERE event_id = ?',
      [archived ? 1 : 0, eventId]
    );

    console.log('Archive result:', result);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ 
      success: true, 
      message: archived ? 'Event archived successfully' : 'Event restored successfully',
      changes: result.changes
    });
  } catch (err) {
    console.error('Error archiving event:', err);
    res.status(500).json({ success: false, error: 'Failed to update event archive status' });
  }
});

// Delete event permanently
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log('Deleting event:', eventId);

    const result = await dbOperations.run(
      'DELETE FROM events WHERE event_id = ?',
      [eventId]
    );

    console.log('Delete result:', result);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ 
      success: true, 
      message: 'Event deleted permanently',
      changes: result.changes
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

// Update event details
router.put('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      name,
      description,
      startDate,
      location,
      venue,
      contactEmail,
      contactPhone,
      organizerName,
      capacity,
      category,
      partnershipStatus,
      notes
    } = req.body;

    console.log('Update event request:', { eventId, body: req.body });

    const result = await dbOperations.run(
      `UPDATE events SET 
        event_name = ?,
        description = ?,
        start_date = ?,
        location = ?,
        venue = ?,
        contact_email = ?,
        contact_phone = ?,
        organizer_name = ?,
        capacity = ?,
        category = ?,
        partnership_status = ?,
        notes = ?,
        updated_at = datetime("now")
       WHERE event_id = ?`,
      [
        name,
        description,
        startDate,
        location,
        venue,
        contactEmail,
        contactPhone,
        organizerName,
        capacity ? parseInt(capacity) : null,
        category,
        partnershipStatus,
        notes,
        eventId
      ]
    );

    console.log('Update result:', result);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ 
      success: true, 
      message: 'Event updated successfully',
      changes: result.changes
    });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

// Get single event
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await dbOperations.get(`
      SELECT 
        event_id as id,
        event_name as name,
        description,
        start_date as startDate,
        location,
        venue,
        source_url as sourceUrl,
        has_ticketing as hasTicketing,
        ticket_provider as ticketingProvider,
        partnership_status as partnershipStatus,
        notes,
        contact_email as contactEmail,
        contact_phone as contactPhone,
        organizer_name as organizerName,
        capacity,
        archived,
        category,
        created_at as createdAt,
        updated_at as updatedAt
      FROM events 
      WHERE event_id = ?
    `, [eventId]);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({ success: true, event });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch event' });
  }
});

module.exports = router;