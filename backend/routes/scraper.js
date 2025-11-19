// backend/routes/scraper.js
const express = require('express');
const router = express.Router();
const EnhancedEventScraperService = require('../services/EnhancedEventScraperService');

const scraper = new EnhancedEventScraperService();

router.get('/run-full-scrape', async (req, res) => {
  try {
    const result = await scraper.scrapeAllEvents();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;