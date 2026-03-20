const express = require('express');
const router = express.Router();

// Simple health check endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ticket Hub API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database health check
router.get('/database', async (req, res) => {
  try {
    const { dbOperations } = require('../database');
    const result = await dbOperations.get('SELECT 1 as test');
    res.json({
      success: true,
      message: 'Database connection is healthy',
      database: result ? 'Connected' : 'Error'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;