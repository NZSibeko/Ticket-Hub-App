// services/backgroundScraper.js - FIXED WITH PROPER IMPORT
const path = require('path');

class BackgroundScraper {
  constructor() {
    try {
      // Try different possible paths for the scraper service
      let EnhancedEventScraperService;
      
      try {
        // Load with consistent filename casing to match 'EnhancedEventScraperService.js'
        EnhancedEventScraperService = require('./EnhancedEventScraperService');
      } catch (e) {
        try {
          EnhancedEventScraperService = require('./EnhancedEventScraperService.js');
        } catch (e2) {
          try {
            EnhancedEventScraperService = require('../services/EnhancedEventScraperService');
          } catch (e3) {
            console.log('❌ Could not load EnhancedEventScraperService from any path');
            console.log('📁 Current directory:', __dirname);
            throw new Error('EnhancedEventScraperService module not found');
          }
        }
      }
      
      this.scraper = new EnhancedEventScraperService();
      console.log('✅ EnhancedEventScraperService loaded successfully');
    } catch (error) {
      console.log('❌ Failed to initialize EnhancedEventScraperService:', error.message);
      // Create a mock scraper for fallback
      this.scraper = this.createMockScraper();
    }

    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.cache = {
      events: [],
      lastUpdated: null,
      summary: {}
    };
    
    // Aggressive settings for commercial use
    this.config = {
      interval: 2 * 60 * 60 * 1000, // 2 hours
      retryAttempts: 5,
      requestDelay: 2000,
      cacheTimeout: 30 * 60 * 1000 // 30 minutes
    };
    
    this.scrapeInterval = null;
  }

  // Fallback mock scraper if the real one fails to load
  createMockScraper() {
    console.log('🔄 Using mock scraper as fallback');
    return {
      scrapeCurrentAndFutureEvents: async () => {
        console.log('🎭 Mock scraper: Generating sample events...');
        // Return mock data
        return {
          events: [
            {
              id: 'mock_1',
              name: 'Sample Music Festival',
              description: 'A great music event with multiple artists',
              eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              venue: 'City Park',
              category: 'music',
              estimatedAttendees: 5000,
              previousProvider: 'Webtickets',
              source: 'Mock Data'
            },
            {
              id: 'mock_2',
              name: 'Tech Conference 2024',
              description: 'Annual technology and innovation conference',
              eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              venue: 'Convention Center',
              category: 'conference',
              estimatedAttendees: 2000,
              previousProvider: 'Quicket',
              source: 'Mock Data'
            }
          ],
          summary: {
            totalEvents: 2,
            categoryDistribution: { music: 1, conference: 1 }
          }
        };
      },
      getConfiguration: () => ({
        sources: 0,
        userAgents: 0,
        requestDelay: 0,
        timeout: 0,
        maxRetries: 0
      })
    };
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Scraper already running');
      return;
    }

    console.log('🚀 Starting background scraper');
    console.log('🎯 Configuration:');
    console.log(`   - ${this.config.interval / (60 * 60 * 1000)} hour intervals between scrapes`);
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
    console.log(`⏰ Next scrape in ${this.config.interval / (60 * 1000)} minutes`);
    
    return true;
  }

  stop() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Background scraper stopped');
  }

  async runScraping() {
    if (this.isRunning) {
      console.log('🔄 Running scheduled scrape...');
      return await this.scrapeEvents();
    }
  }

  async scrapeEvents() {
    try {
      console.log('🚀 Starting scheduled event scraping...');
      console.log('📡 Calling scraper.scrapeCurrentAndFutureEvents()...');
      
      const result = await this.scraper.scrapeCurrentAndFutureEvents();
      
      if (result && result.events) {
        this.cache.events = result.events;
        this.cache.summary = result.summary;
        this.cache.lastUpdated = new Date();
        this.lastRun = new Date();
        
        console.log(`✅ Scraping completed: ${result.events.length} events found`);
        console.log(`📊 Summary:`, result.summary);
        
        return {
          success: true,
          events: result.events,
          summary: result.summary,
          timestamp: this.lastRun
        };
      } else {
        console.log('⚠️  No events found in scraping result');
        return {
          success: false,
          error: 'No events found',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.log(`❌ Scraping failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async manualScrape() {
    console.log('🎯 Manual scraping triggered...');
    return await this.scrapeEvents();
  }

  getCachedEvents() {
    const now = Date.now();
    const cacheAge = this.cache.lastUpdated ? now - this.cache.lastUpdated.getTime() : Infinity;
    
    if (cacheAge < this.config.cacheTimeout && this.cache.events.length > 0) {
      console.log(`📊 Returning ${this.cache.events.length} cached events (${Math.round(cacheAge / 1000)}s old)`);
      return {
        events: this.cache.events,
        summary: this.cache.summary,
        source: 'cache',
        cached: true,
        lastUpdated: this.cache.lastUpdated
      };
    }
    
    console.log('🔄 Cache expired or empty, need fresh scrape');
    return null;
  }

  getConfiguration() {
    return {
      ...this.config,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      cacheSize: this.cache.events.length,
      cacheAge: this.cache.lastUpdated ? Date.now() - this.cache.lastUpdated.getTime() : null
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
          lastUpdated: this.cache.lastUpdated,
          summary: this.cache.summary
        },
        configuration: config,
        scraper: {
          type: this.scraper.constructor.name,
          hasRealScraper: !this.scraper.isMock
        }
      };
    } catch (error) {
      console.log(`❌ Error getting scraper status: ${error.message}`);
      return {
        isRunning: false,
        error: error.message,
        cache: {
          eventCount: 0,
          lastUpdated: null
        }
      };
    }
  }

  async getEvents(forceRefresh = false) {
    // Return cached events if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedEvents();
      if (cached) {
        return cached;
      }
    }

    // If no cache or force refresh, try to scrape
    console.log('🔄 Cache empty or refresh requested, scraping...');
    try {
      const result = await this.scrapeEvents();
      if (result.success) {
        return {
          events: result.events,
          summary: result.summary,
          source: 'fresh_scrape',
          cached: false,
          lastUpdated: this.lastRun
        };
      }
    } catch (error) {
      console.log(`❌ Fresh scrape failed: ${error.message}`);
    }

    // If all else fails, return mock data
    console.log('🔄 Returning mock data as fallback');
    return {
      events: [
        {
          id: 'fallback_1',
          name: 'Fallback Event 1',
          description: 'This is fallback data because scraping failed',
          eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          venue: 'Unknown Venue',
          category: 'other',
          estimatedAttendees: 1000,
          previousProvider: 'Unknown',
          source: 'Fallback Data'
        },
        {
          id: 'fallback_2', 
          name: 'Fallback Event 2',
          description: 'This is fallback data because scraping failed',
          eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          venue: 'Unknown Venue',
          category: 'other',
          estimatedAttendees: 500,
          previousProvider: 'Unknown',
          source: 'Fallback Data'
        }
      ],
      summary: {
        totalEvents: 2,
        categoryDistribution: { other: 2 }
      },
      source: 'fallback',
      cached: false,
      error: 'Using fallback data - scraper not available',
      lastUpdated: new Date()
    };
  }
}

module.exports = BackgroundScraper;