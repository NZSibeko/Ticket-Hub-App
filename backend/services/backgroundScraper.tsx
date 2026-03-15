// services/backgroundScraper.js - UPDATED WITH PAST EVENTS HANDLING AND TIME PERIOD SUPPORT
const path = require("path");

class BackgroundScraper {
  scraper;
  isRunning;
  lastRun;
  nextRun;
  cache;
  pastCache;
  config;
  scrapeInterval;

  constructor() {
    try {
      // Try different possible paths for the scraper service
      let EnhancedEventScraperService;

      try {
        // Load with consistent filename casing to match 'EnhancedEventScraperService.js'
        EnhancedEventScraperService = require("./EnhancedEventScraperService");
      } catch (e) {
        try {
          EnhancedEventScraperService = require("./EnhancedEventScraperService.js");
        } catch (e2) {
          try {
            EnhancedEventScraperService = require("../services/EnhancedEventScraperService");
          } catch (e3) {
            console.log(
              "❌ Could not load EnhancedEventScraperService from any path",
            );
            console.log("📁 Current directory:", __dirname);
            throw new Error("EnhancedEventScraperService module not found");
          }
        }
      }

      this.scraper = new EnhancedEventScraperService();
      console.log("✅ EnhancedEventScraperService loaded successfully");
    } catch (error) {
      console.log(
        "❌ Failed to initialize EnhancedEventScraperService:",
        error.message,
      );
      // Create a mock scraper for fallback
      this.scraper = this.createMockScraper();
    }

    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.cache = {
      events: [],
      lastUpdated: null,
      summary: {},
    };
    this.pastCache = []; // NEW: Cache for past events

    // Aggressive settings for commercial use
    this.config = {
      interval: 2 * 60 * 60 * 1000, // 2 hours
      retryAttempts: 5,
      requestDelay: 2000,
      cacheTimeout: 30 * 60 * 1000, // 30 minutes
    };

    this.scrapeInterval = null;
  }

  // Fallback mock scraper if the real one fails to load
  createMockScraper() {
    console.log("🔄 Using mock scraper as fallback");
    return {
      scrapeEvents: async () => {
        console.log(
          "🎭 Mock scraper: No real data available. Returning empty event list.",
        );
        return {
          events: [],
          summary: {
            totalEvents: 0,
            categoryDistribution: {},
          },
          error: "No real event data available. Scraper not loaded.",
        };
      },
      getConfiguration: () => ({
        sources: 0,
        userAgents: 0,
        requestDelay: 0,
        timeout: 0,
        maxRetries: 0,
      }),
    };
  }

  async start() {
    if (this.isRunning) {
      console.log("⚠️  Scraper already running");
      return;
    }

    console.log("🚀 Starting background scraper");
    console.log("🎯 Configuration:");
    console.log(
      `   - ${this.config.interval / (60 * 60 * 1000)} hour intervals between scrapes`,
    );
    console.log(`   - ${this.config.retryAttempts} retry attempts`);
    console.log(`   - ${this.config.requestDelay}ms request delay`);

    this.isRunning = true;

    // Run initial scrape
    await this.runScraping();

    // Set up interval
    this.scrapeInterval = setInterval(() => {
      this.runScraping();
    }, this.config.interval);

    this.nextRun = new Date(Date.now() + this.config.interval);
    console.log(
      `⏰ Next scrape in ${this.config.interval / (60 * 1000)} minutes`,
    );

    return true;
  }

  stop() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
    }
    this.isRunning = false;
    console.log("🛑 Background scraper stopped");
  }

  async runScraping() {
    if (this.isRunning) {
      console.log("🔄 Running scheduled scrape...");
      // NEW: Move past events from current cache to pastCache before new scrape
      const now = new Date();
      const movedPast = this.cache.events.filter(
        (e) => new Date(e.eventDate) < now,
      );
      this.pastCache = Array.from(
        new Map(
          [...this.pastCache, ...movedPast].map((e) => [e.id, e]),
        ).values(),
      );
      this.cache.events = this.cache.events.filter(
        (e) => new Date(e.eventDate) >= now,
      );
      return await this.scrapeEvents();
    }
  }

  async scrapeEvents() {
    try {
      console.log("🚀 Starting scheduled event scraping...");
      console.log("📡 Calling scraper.scrapeEvents()..."); // UPDATED: Renamed

      const result = await this.scraper.scrapeEvents(); // UPDATED: Renamed

      if (result && result.events) {
        // NEW: Add new events to cache, filter upcoming
        const now = new Date();
        const newUpcoming = result.events.filter(
          (e) => new Date(e.eventDate) >= now,
        );
        const newPast = result.events.filter(
          (e) => new Date(e.eventDate) < now,
        );

        // Merge unique upcoming
        this.cache.events = Array.from(
          new Map(
            [...this.cache.events, ...newUpcoming].map((e) => [e.id, e]),
          ).values(),
        );

        // Add any new past (though unlikely)
        this.pastCache = Array.from(
          new Map(
            [...this.pastCache, ...newPast].map((e) => [e.id, e]),
          ).values(),
        );

        this.cache.summary = result.summary;
        this.cache.lastUpdated = new Date();
        this.lastRun = new Date();

        console.log(
          `✅ Scraping completed: ${result.events.length} events found`,
        );
        console.log(`📊 Summary:`, result.summary);

        return {
          success: true,
          events: result.events,
          summary: result.summary,
          timestamp: this.lastRun,
        };
      } else {
        console.log("⚠️  No events found in scraping result");
        return {
          success: false,
          error: "No events found",
          timestamp: new Date(),
        };
      }
    } catch (error) {
      console.log(`❌ Scraping failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  async manualScrape() {
    console.log("🎯 Manual scraping triggered...");
    return await this.scrapeEvents();
  }

  getCachedEvents(timePeriod = "upcoming") {
    // UPDATED: Added timePeriod param
    const now = Date.now();
    const cacheAge = this.cache.lastUpdated
      ? now - this.cache.lastUpdated.getTime()
      : Infinity;

    if (cacheAge < this.config.cacheTimeout) {
      if (timePeriod === "upcoming" && this.cache.events.length > 0) {
        console.log(
          `📊 Returning ${this.cache.events.length} cached upcoming events (${Math.round(cacheAge / 1000)}s old)`,
        );
        return {
          events: this.cache.events,
          summary: this.cache.summary,
          source: "cache",
          cached: true,
          lastUpdated: this.cache.lastUpdated,
        };
      } else if (timePeriod === "past" && this.pastCache.length > 0) {
        console.log(`📊 Returning ${this.pastCache.length} cached past events`);
        return {
          events: this.pastCache,
          summary: {}, // Summary for past can be computed if needed
          source: "cache",
          cached: true,
          lastUpdated: this.cache.lastUpdated,
        };
      } else if (timePeriod === "all") {
        const allEvents = [...this.pastCache, ...this.cache.events];
        console.log(`📊 Returning ${allEvents.length} cached events (all)`);
        return {
          events: allEvents,
          summary: this.cache.summary,
          source: "cache",
          cached: true,
          lastUpdated: this.cache.lastUpdated,
        };
      }
    }

    console.log(
      "🔄 Cache expired or empty for requested period, need fresh scrape",
    );
    return null;
  }

  getConfiguration() {
    return {
      ...this.config,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      cacheSize: this.cache.events.length,
      pastCacheSize: this.pastCache.length, // NEW
      cacheAge: this.cache.lastUpdated
        ? Date.now() - this.cache.lastUpdated.getTime()
        : null,
    };
  }

  getStatus() {
    try {
      const config = this.getConfiguration();

      return {
        isRunning: this.isRunning,
        lastRun: this.lastRun,
        nextRun: this.nextRun,
        cache: {
          eventCount: this.cache.events.length,
          pastEventCount: this.pastCache.length, // NEW
          lastUpdated: this.cache.lastUpdated,
          summary: this.cache.summary,
        },
        configuration: config,
        scraper: {
          type: this.scraper.constructor.name,
          hasRealScraper: !this.scraper.isMock,
        },
      };
    } catch (error) {
      console.log(`❌ Error getting scraper status: ${error.message}`);
      return {
        isRunning: false,
        error: error.message,
        cache: {
          eventCount: 0,
          lastUpdated: null,
        },
      };
    }
  }

  async getEvents(timePeriod = "upcoming", forceRefresh = false) {
    // UPDATED: Added timePeriod param
    // Return cached events if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedEvents(timePeriod);
      if (cached) {
        return cached;
      }
    }

    // If no cache or force refresh, try to scrape
    console.log("🔄 Cache empty or refresh requested, scraping...");
    try {
      const result = await this.scrapeEvents();
      if (result.success) {
        return this.getCachedEvents(timePeriod); // After scrape, return filtered
      }
    } catch (error) {
      console.log(`❌ Fresh scrape failed: ${error.message}`);
    }

    // If all else fails, return mock data
    console.log("🔄 Returning mock data as fallback");
    return {
      events: [
        {
          id: "fallback_1",
          name: "Fallback Event 1",
          description: "This is fallback data because scraping failed",
          eventDate: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          venue: "Unknown Venue",
          category: "other",
          estimatedAttendees: 1000,
          previousProvider: "Unknown",
          source: "Fallback Data",
        },
        {
          id: "fallback_2",
          name: "Fallback Event 2",
          description: "This is fallback data because scraping failed",
          eventDate: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          venue: "Unknown Venue",
          category: "other",
          estimatedAttendees: 500,
          previousProvider: "Unknown",
          source: "Fallback Data",
        },
      ],
      summary: {
        totalEvents: 2,
        categoryDistribution: { other: 2 },
      },
      source: "fallback",
      cached: false,
      error: "Using fallback data - scraper not available",
      lastUpdated: new Date(),
    };
  }
}

module.exports = BackgroundScraper;
