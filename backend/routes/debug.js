// backend/routes/debug.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Debug endpoint to test database connection
router.get('/database-test', async (req, res) => {
  try {
    console.log('🔍 Debug: Testing database connection...');
    
    // Test basic query
    const testQuery = await dbOperations.get('SELECT 1 as test_value');
    
    // Get table counts
    const eventsCount = await dbOperations.get('SELECT COUNT(*) as count FROM events');
    const usersCount = await dbOperations.get('SELECT COUNT(*) as count FROM admins');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        testQuery,
        counts: {
          events: eventsCount.count,
          admins: usersCount.count
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error.message
    });
  }
});

// Get database status
router.get('/status', async (req, res) => {
  try {
    const tables = [
      'events', 'admins', 'event_managers', 
      'event_organizers', 'support_staff', 'customers',
      'tickets', 'user_activity_logs'
    ];
    
    const counts = {};
    
    for (const table of tables) {
      try {
        const result = await dbOperations.get(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result ? result.count : 0;
      } catch (err) {
        counts[table] = 'Table not found';
      }
    }
    
    res.json({
      success: true,
      database: 'SQLite',
      tables: counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;