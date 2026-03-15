// @ts-nocheck
// routes/eventPlanner.js - UPDATED WITH SEARCH AND DELETE
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const { scrapeLiveTicketIntel } = require('../services/livePlannerTicketScraper');
const debugEventPlannerLogs = process.env.DEBUG_EVENT_PLANNER_LOGS === 'true';
const LIVE_PLANNER_LIST_SCRAPE_LIMIT = Number(process.env.PLANNER_LIVE_SCRAPE_LIMIT || 6);

const isLiveScrapeEnabled = (req) => {
  const rawLiveFlag = String(req.query.live ?? 'false').toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(rawLiveFlag);
};

const shouldAttemptLiveScrape = (event) => {
  const partnershipStatus = String(event?.partnershipStatus || '').toLowerCase();
  const hasSourceUrl = typeof event?.sourceUrl === 'string' && event.sourceUrl.trim().length > 0;

  return hasSourceUrl && partnershipStatus !== 'partnered';
};

const parseTicketTypes = (rawTicketTypes) => {
  if (!rawTicketTypes) return [];

  if (Array.isArray(rawTicketTypes)) {
    return rawTicketTypes.filter(Boolean);
  }

  if (typeof rawTicketTypes === 'string') {
    try {
      const parsed = JSON.parse(rawTicketTypes);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      if (debugEventPlannerLogs) {
        console.warn('Failed to parse planner ticket types:', error.message);
      }
    }
  }

  return [];
};

const getSourceLabel = (event) => {
  if (typeof event.ticketingProvider === 'string' && event.ticketingProvider.trim()) {
    return event.ticketingProvider.trim();
  }

  if (typeof event.sourceUrl === 'string' && event.sourceUrl.trim()) {
    try {
      const parsedUrl = new URL(event.sourceUrl);
      return parsedUrl.hostname.replace(/^www\./i, '');
    } catch (error) {
      return event.sourceUrl;
    }
  }

  return null;
};

const buildTicketIntelligence = (event) => {
  const ticketTypes = parseTicketTypes(event.rawTicketTypes || event.ticketTypes).map((ticket, index) => {
    const rawPrice = Number(ticket?.price ?? ticket?.amount ?? ticket?.cost);
    const rawQuantity = Number(
      ticket?.quantity ??
      ticket?.available_quantity ??
      ticket?.available ??
      ticket?.capacity
    );

    return {
      id: ticket?.ticket_type_id || ticket?.id || `${event.id}-ticket-${index}`,
      name: ticket?.name || ticket?.type || `Ticket ${index + 1}`,
      price: Number.isFinite(rawPrice) ? rawPrice : null,
      quantity: Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : null,
    };
  });

  const validPrices = ticketTypes
    .map(ticket => ticket.price)
    .filter(price => Number.isFinite(price) && price >= 0);

  const fallbackPrice = Number(event.price);
  const minPrice = validPrices.length
    ? Math.min(...validPrices)
    : Number.isFinite(fallbackPrice) && fallbackPrice >= 0
      ? fallbackPrice
      : null;
  const maxPrice = validPrices.length ? Math.max(...validPrices) : minPrice;
  const inventory = ticketTypes.reduce((total, ticket) => total + (ticket.quantity || 0), 0);
  const sourceLabel = getSourceLabel(event);

  return {
    sourceLabel,
    totalTypes: ticketTypes.length,
    minPrice,
    maxPrice,
    inventory: inventory > 0 ? inventory : null,
    currency: event.currency || 'ZAR',
    hasStructuredTickets: ticketTypes.length > 0,
    hasTicketSignal: Boolean(ticketTypes.length || minPrice !== null || event.hasTicketing),
    types: ticketTypes,
    liveStatus: 'stored',
    scrapeMode: 'stored',
    parseConfidence: ticketTypes.length > 0 ? 72 : minPrice !== null ? 56 : 24,
    extractedFields: [
      'source',
      ...(ticketTypes.length > 0 ? ['ticketTypes'] : []),
      ...(minPrice !== null ? ['priceRange'] : []),
      ...(inventory > 0 ? ['inventory'] : []),
    ],
  };
};

const enrichPlannerEvent = async (event, options = {}) => {
  const ticketIntelligence = buildTicketIntelligence(event);
  const baseEvent = {
    ...event,
    ticketTypes: ticketIntelligence.types,
    ticketIntelligence,
  };

  if (!options.live) {
    return baseEvent;
  }

  const liveTicketIntelligence = await scrapeLiveTicketIntel(event, ticketIntelligence, {
    force: Boolean(options.force),
  });

  if (options.persist) {
    await persistLiveTicketIntelligence(event.id, liveTicketIntelligence);
  }

  return {
    ...baseEvent,
    ticketTypes: liveTicketIntelligence.types,
    ticketIntelligence: liveTicketIntelligence,
  };
};

const persistLiveTicketIntelligence = async (eventId, ticketIntelligence) => {
  if (!eventId || !ticketIntelligence) {
    return;
  }

  const serializedTicketTypes = JSON.stringify(Array.isArray(ticketIntelligence.types) ? ticketIntelligence.types : []);
  const persistedPrice = Number.isFinite(ticketIntelligence.minPrice) ? ticketIntelligence.minPrice : null;
  const hasTicketing = ticketIntelligence.hasTicketSignal ? 1 : 0;

  await dbOperations.run(
    `UPDATE events
     SET ticket_types = ?,
         price = ?,
         currency = ?,
         has_ticketing = ?,
         updated_at = datetime('now')
     WHERE event_id = ?`,
    [
      serializedTicketTypes,
      persistedPrice,
      ticketIntelligence.currency || 'ZAR',
      hasTicketing,
      eventId,
    ]
  );
};

// Get all events for event manager with search
router.get('/events', async (req, res) => {
  try {
    const { search, category, partnershipStatus } = req.query;
    
    if (debugEventPlannerLogs) {
      console.log('Fetching events with filters:', { search, category, partnershipStatus });
    }
    
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
        ticket_types as rawTicketTypes,
        price,
        currency,
        max_attendees as maxAttendees,
        status,
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
    
    const rawEvents = await dbOperations.all(query, params);
    const liveEnabled = isLiveScrapeEnabled(req);
    let liveScrapeCount = 0;

    const events = await Promise.all(rawEvents.map((event) => {
      const shouldLiveScrapeEvent =
        liveEnabled &&
        liveScrapeCount < LIVE_PLANNER_LIST_SCRAPE_LIMIT &&
        shouldAttemptLiveScrape(event);

      if (shouldLiveScrapeEvent) {
        liveScrapeCount += 1;
      }

      return enrichPlannerEvent(event, {
        live: shouldLiveScrapeEvent,
        persist: false,
      });
    }));
    
    if (debugEventPlannerLogs) {
      console.log(`Found ${events.length} events with current filters`);
    }
    
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
        ticket_types as rawTicketTypes,
        price,
        currency,
        max_attendees as maxAttendees,
        status,
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

    const enrichedEvent = await enrichPlannerEvent(event, {
      live: isLiveScrapeEnabled(req) && shouldAttemptLiveScrape(event),
      force: String(req.query.force ?? 'false').toLowerCase() === 'true',
      persist: isLiveScrapeEnabled(req) && shouldAttemptLiveScrape(event),
    });

    res.json({ success: true, event: enrichedEvent });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch event' });
  }
});

router.post('/events/:eventId/live-refresh', async (req, res) => {
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
        ticket_types as rawTicketTypes,
        price,
        currency,
        max_attendees as maxAttendees,
        status,
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

    const refreshedEvent = await enrichPlannerEvent(event, {
      live: true,
      force: true,
      persist: true,
    });

    res.json({
      success: true,
      event: refreshedEvent,
    });
  } catch (err) {
    console.error('Error refreshing live planner event:', err);
    res.status(500).json({ success: false, error: 'Failed to refresh live ticket data' });
  }
});

module.exports = router;
