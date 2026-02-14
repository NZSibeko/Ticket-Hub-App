const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Get organizer dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get organizer's events count
    const eventsResult = await dbOperations.get(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM events 
       WHERE created_by = ? OR organizer_id = ?`,
      [userId, userId]
    );
    
    // Get ticket sales
    const salesResult = await dbOperations.get(
      `SELECT COUNT(*) as total_tickets, 
              SUM(total_amount) as total_revenue
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE (e.created_by = ? OR e.organizer_id = ?) AND t.status = 'confirmed'`,
      [userId, userId]
    );
    
    res.json({
      success: true,
      data: {
        stats: {
          totalEvents: eventsResult?.total || 0,
          activeEvents: eventsResult?.active || 0,
          pendingEvents: eventsResult?.pending || 0,
          totalTickets: salesResult?.total_tickets || 0,
          totalRevenue: salesResult?.total_revenue || 0
        },
        recentActivity: [],
        upcomingEvents: []
      }
    });
  } catch (error) {
    console.error('[ORGANIZER] Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// Get organizer's events
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const events = await dbOperations.all(
      `SELECT * FROM events WHERE created_by = ? OR organizer_id = ? ORDER BY created_at DESC`,
      [userId, userId]
    );
    
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

// Create event (organizer specific)
router.post('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const userName = req.user.name;
    const { event_name, description, start_date, end_date, location, venue, category, capacity, price } = req.body;
    
    // Insert event with organizer info
    const result = await dbOperations.run(
      `INSERT INTO events (event_name, event_description, start_date, end_date, location, venue, category, capacity, price, status, created_by, created_by_email, created_by_name, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [event_name, description, start_date, end_date, location, venue, category, capacity, price, userId, userEmail, userName, userId]
    );
    
    res.json({
      success: true,
      data: {
        event_id: result.id,
        message: 'Event created successfully and is pending approval'
      }
    });
  } catch (error) {
    console.error('[ORGANIZER] Create event error:', error);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

module.exports = router;