// backend/services/EnhancedEventScraperService.js - FINAL 13-MONTH SCRAPER (Nov 2025 – Dec 2026)
const axios = require('axios');
const cheerio = require('cheerio');
const { dbOperations } = require('../database');

class EnhancedEventScraperService {
  constructor() {
    this.isRunning = false;
    this.delayMs = 12000;

    this.sources = [
      'https://allevents.in/cape-town',
      'https://allevents.in/johannesburg',
      'https://allevents.in/durban',
      'https://allevents.in/pretoria',
      'https://allevents.in/bloemfontein',
      'https://allevents.in/port-elizabeth',

      'https://www.capetownmagazine.com/events',
      'https://www.capetownetc.com/events/',
      'https://www.capetownmagazine.com/whats-on',

      'https://www.songkick.com/metro-areas/32788-south-africa-cape-town',
      'https://www.songkick.com/metro-areas/32789-south-africa-johannesburg',

      'https://psymedia.co.za/events/',
      'https://whatsonincapetown.com/',
      'https://www.joburg.co.za/things-to-do/',
    ];
  }

  delay(ms = this.delayMs) {
    return new Promise(r => setTimeout(r, ms));
  }

  async runFullScrape() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('13-MONTH SCRAPER STARTED – NOV 2025 TO DEC 2026');

    const today = new Date();
    const thirteenMonthsLater = new Date(today);
    thirteenMonthsLater.setMonth(today.getMonth() + 13); // Up to December 2026

    const TICKETING_DOMAINS = [
      'quicket.co.za', 'webtickets.co.za', 'computicket.com', 'howler.co.za',
      'ticketpro.co.za', 'eventbrite.com', 'nutickets.co.za', 'tix.africa',
      'plankton.mobi', 'ticketmaster', 'tickets'
    ];

    const JUNK_WORDS = [
      'find events', 'view all', 'more events', 'register', 'book now', 'buy tickets',
      'get tickets', 'sponsored', 'advert', 'login', 'sign up', 'subscribe', 'newsletter',
      'privacy policy', 'terms', 'contact us', 'about us', 'home', 'calendar', 'search'
    ];

    let totalSaved = 0;

    for (const url of this.sources) {
      try {
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
            'Accept-Language': 'en-ZA,en;q=0.9',
          },
          timeout: 40000
        });

        const $ = cheerio.load(data);
        let saved = 0;

        $('a').each((i, el) => {
          if (saved >= 100) return;

          const href = $(el).attr('href');
          if (!href) return;

          const fullUrl = this.absUrl(href, url);

          if (TICKETING_DOMAINS.some(d => fullUrl.toLowerCase().includes(d))) return;

          let title = $(el).text().trim();
          if (!title || title.length < 15) return;

          title = title.split('\n')[0].split('|')[0].split(' - ')[0].split('–')[0].trim();
          if (title.length < 15) return;

          if (JUNK_WORDS.some(w => title.toLowerCase().includes(w))) return;

          const text = $(el).text() + ' ' + $(el).parent().text() + ' ' + $(el).parents().slice(0, 7).text();

          const dateMatch = text.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20(25|26)|\d{4}-\d{2}-\d{2}/i);
          if (!dateMatch) return;

          const eventDate = this.parseDate(dateMatch[0]);
          if (!eventDate || eventDate < today || eventDate > thirteenMonthsLater) return;

          if (!text.match(/Cape Town|Johannesburg|Durban|Pretoria|Stellenbosch|Paarl|Franschhoek|Knysna|Bloemfontein|Gqeberha|Sandton|Rosebank|Montecasino|Sun Arena|CTICC|Durban ICC|South Africa/i)) return;

          const venue = text.match(/(?:at |@ |Venue: |Location: )(.*?)([,\n]|$)/i)?.[1]?.trim() || 'South Africa';

          this.upsertEvent({
            name: title.substring(0, 200),
            description: text.substring(0, 500),
            venue: venue.substring(0, 150),
            startDate: eventDate.toISOString().split('T')[0],
            sourceUrl: fullUrl,
            hasTicketing: 0,
            partnershipStatus: 'untapped',
            notes: '13-MONTH SCRAPER – NOV 2025 TO DEC 2026'
          });

          saved++;
          totalSaved++;
        });

        console.log(`SUCCESS → ${url} → ${saved} real events saved (up to Dec 2026)`);

      } catch (err) {
        console.log(`Blocked or down: ${url}`);
      }

      await this.delay();
    }

    this.isRunning = false;
    console.log(`\n13-MONTH SCRAPER DONE → ${totalSaved} REAL EVENTS SAVED (Nov 2025 – Dec 2026)`);
  }

  async upsertEvent(data) {
    const query = `
      INSERT OR REPLACE INTO events (
        event_name, description, start_date, location, source_url,
        has_ticketing, partnership_status, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 'untapped', ?, datetime('now'))
    `;

    try {
      await dbOperations.run(query, [
        data.name,
        data.description,
        data.startDate,
        data.venue,
        data.sourceUrl,
        data.notes
      ]);
    } catch (err) {
      // Silent
    }
  }

  absUrl(url, base) {
    try { return new URL(url, base).href; } catch { return url; }
  }

  parseDate(str) {
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const match = str.match(/(\d{1,2})\s+([A-Za-z]{3,})[a-z]*\s+(\d{4})/i);
    if (match) {
      const d = new Date(match[3], months[match[2].toLowerCase().substr(0,3)], match[1]);
      return isNaN(d.getTime()) ? null : d;
    }
    try {
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  startAutoScrape() {
    this.runFullScrape();
    setInterval(() => this.runFullScrape(), 6 * 60 * 60 * 1000);
    console.log('13-MONTH SCRAPER AUTO-ENABLED (Nov 2025 – Dec 2026)');
  }
}

module.exports = EnhancedEventScraperService;