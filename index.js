import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

// index.js (root of Ticket-hub-app)
const express = require('express');
const EnhancedEventScraperService = require('./backend/services/EnhancedEventScraperService');

const app = express();
const scraper = new EnhancedEventScraperService();

// Your existing middleware & routes...
app.use(express.json());
// ... your other routes

// NEW ROUTE: Trigger full scrape
app.get('/api/scrape/run', async (req, res) => {
  try {
    console.log('Manual scrape triggered via API...');
    const result = await scraper.runFullScrape();
    res.json({ success: true, message: 'Scrape completed', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: Auto-run daily at 3 AM
const scheduleDailyScrape = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(3, 0, 0, 0);
  const msUntil3AM = tomorrow - now;

  setTimeout(async () => {
    console.log('Daily automated scrape started...');
    await scraper.runFullScrape();
    scheduleDailyScrape(); // Reschedule for next day
  }, msUntil3AM);
};

// Uncomment to enable auto daily scrape
// scheduleDailyScrape();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`→ Trigger scrape: GET /api/scrape/run`);
});