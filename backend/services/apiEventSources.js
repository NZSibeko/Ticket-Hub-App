// services/apiEventSources.js - RECOMMENDED APPROACH FOR REAL DATA
// This uses public APIs instead of web scraping for more reliable data

const axios = require('axios');

class APIEventSources {
  constructor() {
    // Store API keys in environment variables
    this.apiKeys = {
      eventbrite: process.env.EVENTBRITE_API_KEY || '',
      facebook: process.env.FACEBOOK_ACCESS_TOKEN || '',
      meetup: process.env.MEETUP_API_KEY || '',
      ticketmaster: process.env.TICKETMASTER_API_KEY || ''
    };
  }

  // EVENTBRITE API - Most reliable source for SA events
  async getEventbriteEvents() {
    if (!this.apiKeys.eventbrite) {
      console.log('⚠️  Eventbrite API key not set');
      return [];
    }

    try {
      console.log('🎟️  Fetching Eventbrite events...');
      
      const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
        headers: {
          'Authorization': `Bearer ${this.apiKeys.eventbrite}`
        },
        params: {
          'location.address': 'South Africa',
          'location.within': '500km',
          'start_date.range_start': new Date().toISOString(),
          'start_date.range_end': new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          'expand': 'venue,organizer,ticket_availability',
          'page_size': 50
        }
      });

      const events = response.data.events.map(event => ({
        id: `eb_${event.id}`,
        name: event.name.text,
        description: event.description.text || event.summary || 'Event details',
        date: event.start.utc,
        endDate: event.end.utc,
        location: event.venue?.address?.localized_address_display || 'South Africa',
        city: event.venue?.address?.city || 'Various',
        province: this.mapProvinceFromCity(event.venue?.address?.city),
        category: this.categorizeEvent(event.category_id),
        organizer: event.organizer?.name || 'Event Organizer',
        contacts: {
          emails: [],
          phones: [],
          websites: [event.url],
          social: {}
        },
        estimatedAttendance: event.capacity || 500,
        ticketPriceRange: this.extractPriceRange(event),
        hasTicketing: true, // Eventbrite events already have ticketing
        ticketProvider: 'Eventbrite',
        source: 'Eventbrite API',
        sourceUrl: event.url,
        status: 'active',
        lastUpdated: new Date().toISOString()
      }));

      console.log(`✅ Eventbrite: ${events.length} events`);
      return events;

    } catch (error) {
      console.error('❌ Eventbrite API error:', error.message);
      return [];
    }
  }

  // FACEBOOK GRAPH API - Great for local events
  async getFacebookEvents() {
    if (!this.apiKeys.facebook) {
      console.log('⚠️  Facebook API key not set');
      return [];
    }

    try {
      console.log('📘 Fetching Facebook events...');
      
      // Search for event pages and posts mentioning SA events
      const locations = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'];
      const allEvents = [];

      for (const location of locations) {
        try {
          const response = await axios.get('https://graph.facebook.com/v18.0/search', {
            params: {
              q: `${location} event`,
              type: 'event',
              fields: 'id,name,description,start_time,end_time,place,ticket_uri,cover,event_times',
              access_token: this.apiKeys.facebook,
              limit: 25
            }
          });

          if (response.data.data) {
            const events = response.data.data.map(event => ({
              id: `fb_${event.id}`,
              name: event.name,
              description: event.description || 'Check Facebook for details',
              date: event.start_time,
              endDate: event.end_time,
              location: event.place?.name || location,
              city: location,
              province: this.mapProvinceFromCity(location),
              category: this.categorizeEvent(event.name),
              organizer: event.place?.name || 'Facebook Event',
              contacts: {
                emails: this.extractEmailsFromDescription(event.description),
                phones: this.extractPhonesFromDescription(event.description),
                websites: event.ticket_uri ? [event.ticket_uri] : [],
                social: {
                  facebook: `https://facebook.com/events/${event.id}`
                }
              },
              estimatedAttendance: 1000,
              ticketPriceRange: 'TBA',
              hasTicketing: !!event.ticket_uri,
              ticketProvider: event.ticket_uri ? 'External' : 'None',
              source: 'Facebook Events',
              sourceUrl: `https://facebook.com/events/${event.id}`,
              imageUrl: event.cover?.source,
              status: 'potential',
              lastUpdated: new Date().toISOString()
            }));

            allEvents.push(...events);
          }
        } catch (locError) {
          console.error(`❌ Facebook error for ${location}:`, locError.message);
        }

        // Rate limiting
        await this.delay(1000);
      }

      console.log(`✅ Facebook: ${allEvents.length} events`);
      return allEvents;

    } catch (error) {
      console.error('❌ Facebook API error:', error.message);
      return [];
    }
  }

  // MEETUP API - Great for community events
  async getMeetupEvents() {
    if (!this.apiKeys.meetup) {
      console.log('⚠️  Meetup API key not set');
      return [];
    }

    try {
      console.log('🤝 Fetching Meetup events...');
      
      // Major SA cities coordinates
      const cities = [
        { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
        { name: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
        { name: 'Durban', lat: -29.8587, lon: 31.0218 },
        { name: 'Pretoria', lat: -25.7479, lon: 28.2293 }
      ];

      const allEvents = [];

      for (const city of cities) {
        try {
          const response = await axios.get('https://api.meetup.com/find/upcoming_events', {
            headers: {
              'Authorization': `Bearer ${this.apiKeys.meetup}`
            },
            params: {
              lat: city.lat,
              lon: city.lon,
              radius: 50, // 50 miles
              fields: 'group_photo,featured_photo,event_hosts',
              page: 20
            }
          });

          if (response.data.events) {
            const events = response.data.events.map(event => ({
              id: `mu_${event.id}`,
              name: event.name,
              description: event.description || event.plain_text_description || 'Meetup event',
              date: new Date(event.time).toISOString(),
              endDate: event.duration ? new Date(event.time + event.duration).toISOString() : null,
              location: event.venue?.name || event.group?.localized_location || city.name,
              city: city.name,
              province: this.mapProvinceFromCity(city.name),
              category: this.categorizeEvent(event.name),
              organizer: event.group?.name || 'Meetup Group',
              contacts: {
                emails: [],
                phones: [],
                websites: [event.link],
                social: {
                  meetup: event.link
                }
              },
              estimatedAttendance: event.yes_rsvp_count || event.rsvp_limit || 50,
              ticketPriceRange: event.fee?.amount ? `R${event.fee.amount}` : 'Free',
              hasTicketing: false, // Most Meetups don't use formal ticketing
              ticketProvider: 'None',
              source: 'Meetup',
              sourceUrl: event.link,
              imageUrl: event.featured_photo?.photo_link || event.group?.group_photo?.photo_link,
              status: 'potential',
              partnershipOpportunity: true,
              lastUpdated: new Date().toISOString()
            }));

            allEvents.push(...events);
          }
        } catch (cityError) {
          console.error(`❌ Meetup error for ${city.name}:`, cityError.message);
        }

        await this.delay(1000);
      }

      console.log(`✅ Meetup: ${allEvents.length} events`);
      return allEvents;

    } catch (error) {
      console.error('❌ Meetup API error:', error.message);
      return [];
    }
  }

  // GOOGLE CALENDAR PUBLIC EVENTS
  async getGoogleCalendarEvents() {
    // Note: Requires Google Calendar API setup
    // This is a placeholder - implement when you get API key
    console.log('📅 Google Calendar API not implemented yet');
    return [];
  }

  // AGGREGATE ALL SOURCES
  async getAllEvents() {
    console.log('🚀 Fetching events from all API sources...');
    
    const [
      eventbriteEvents,
      facebookEvents,
      meetupEvents
    ] = await Promise.all([
      this.getEventbriteEvents(),
      this.getFacebookEvents(),
      this.getMeetupEvents()
    ]);

    const allEvents = [
      ...eventbriteEvents,
      ...facebookEvents,
      ...meetupEvents
    ];

    console.log(`\n📊 Total events from APIs: ${allEvents.length}`);
    console.log(`   - Eventbrite: ${eventbriteEvents.length}`);
    console.log(`   - Facebook: ${facebookEvents.length}`);
    console.log(`   - Meetup: ${meetupEvents.length}`);

    // Filter for unticketed opportunities
    const unticketed = allEvents.filter(e => !e.hasTicketing || e.ticketProvider === 'None');
    console.log(`🎯 Unticketed opportunities: ${unticketed.length}`);

    return this.enhanceEvents(allEvents);
  }

  // ENHANCE EVENTS WITH PARTNERSHIP DATA
  enhanceEvents(events) {
    return events.map(event => {
      const partnershipScore = this.calculatePartnershipScore(event);
      const daysUntil = Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        ...event,
        partnershipScore,
        partnershipOpportunity: !event.hasTicketing || event.ticketProvider === 'None',
        partnershipReason: this.generatePartnershipReason(event),
        urgency: this.calculateUrgency(daysUntil),
        potentialValue: this.assessPotentialValue(event, partnershipScore),
        aiSuggestions: {
          approach: this.generateApproachStrategy(event),
          emailTemplate: this.generateEmailTemplate(event),
          timing: this.getTimingRecommendation(daysUntil)
        }
      };
    }).sort((a, b) => b.partnershipScore - a.partnershipScore);
  }

  // HELPER METHODS

  calculatePartnershipScore(event) {
    let score = 0;

    // Has NO ticketing = HIGH priority
    if (!event.hasTicketing || event.ticketProvider === 'None') score += 40;

    // Contact info
    if (event.contacts?.emails?.length > 0) score += 20;
    if (event.contacts?.phones?.length > 0) score += 15;
    if (event.contacts?.social?.facebook || event.contacts?.social?.instagram) score += 10;

    // Event size
    if (event.estimatedAttendance > 5000) score += 20;
    else if (event.estimatedAttendance > 1000) score += 10;

    // Location
    const majorCities = ['cape town', 'johannesburg', 'durban', 'pretoria'];
    if (majorCities.some(city => event.city?.toLowerCase().includes(city))) score += 10;

    return Math.min(score, 100);
  }

  generatePartnershipReason(event) {
    const reasons = [];

    if (!event.hasTicketing || event.ticketProvider === 'None') {
      reasons.push('🎯 NO TICKETING - PRIME OPPORTUNITY');
    }

    if (event.contacts?.emails?.length > 0) {
      reasons.push(`✉️ ${event.contacts.emails.length} email(s)`);
    }

    if (event.estimatedAttendance > 1000) {
      reasons.push(`👥 ${event.estimatedAttendance.toLocaleString()} attendees`);
    }

    if (event.source === 'Meetup') {
      reasons.push('🤝 Community event - often need ticketing');
    }

    return reasons.join(' • ');
  }

  calculateUrgency(daysUntil) {
    if (daysUntil < 14) return 'URGENT';
    if (daysUntil < 30) return 'HIGH';
    if (daysUntil < 60) return 'MEDIUM';
    return 'LOW';
  }

  assessPotentialValue(event, score) {
    if (score >= 70) return 'VERY HIGH';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  generateApproachStrategy(event) {
    return `Contact ${event.organizer} via ${event.source} emphasizing our platform's ability to handle ${event.estimatedAttendance?.toLocaleString() || 'hundreds of'} attendees with professional ticketing, analytics, and marketing support.`;
  }

  generateEmailTemplate(event) {
    const daysUntil = Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    
    return `
Subject: Ticketing Partnership for ${event.name}

Hi ${event.organizer},

I noticed your upcoming event "${event.name}" on ${new Date(event.date).toLocaleDateString()}.

We provide comprehensive ticketing solutions for ${event.category} events:
• Zero upfront costs (${daysUntil < 30 ? '8%' : '10%'} commission)
• Professional platform with real-time analytics
• Mobile tickets with QR codes
• Marketing to our ${event.estimatedAttendance > 1000 ? 'thousands' : 'hundreds'} of followers

${daysUntil < 30 ? 'We can have you set up within 48 hours.' : 'Perfect timing to discuss ticketing solutions.'}

Available for a quick call this week?

Best regards
    `.trim();
  }

  getTimingRecommendation(daysUntil) {
    if (daysUntil < 14) return '⚡ URGENT: Contact immediately';
    if (daysUntil < 30) return '🔥 HIGH: Reach out within 24-48 hours';
    if (daysUntil < 60) return '✅ OPTIMAL: Perfect timing for partnership';
    return '📅 GOOD: Build relationship now';
  }

  // Utility methods

  mapProvinceFromCity(city) {
    const cityLower = (city || '').toLowerCase();
    
    if (cityLower.includes('cape town') || cityLower.includes('stellenbosch')) return 'western cape';
    if (cityLower.includes('johannesburg') || cityLower.includes('pretoria') || cityLower.includes('sandton')) return 'gauteng';
    if (cityLower.includes('durban')) return 'kwazulu-natal';
    if (cityLower.includes('port elizabeth')) return 'eastern cape';
    
    return 'Various';
  }

  categorizeEvent(text) {
    const lower = (text || '').toLowerCase();
    
    if (/music|jazz|concert|band|dj|festival/.test(lower)) return 'music';
    if (/sport|marathon|race|cycle|run|fitness/.test(lower)) return 'sports';
    if (/art|gallery|exhibition|theatre|dance/.test(lower)) return 'arts';
    if (/food|wine|beer|culinary|restaurant/.test(lower)) return 'food';
    if (/business|conference|seminar|workshop|networking/.test(lower)) return 'business';
    if (/tech|technology|startup|developer/.test(lower)) return 'technology';
    
    return 'lifestyle';
  }

  extractPriceRange(event) {
    if (event.is_free) return 'Free';
    
    if (event.ticket_classes) {
      const prices = event.ticket_classes
        .map(tc => tc.cost?.display)
        .filter(Boolean);
      
      if (prices.length > 0) {
        return `${prices[0]} - ${prices[prices.length - 1]}`;
      }
    }
    
    return 'TBA';
  }

  extractEmailsFromDescription(text) {
    if (!text) return [];
    
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex);
    
    return matches ? [...new Set(matches)] : [];
  }

  extractPhonesFromDescription(text) {
    if (!text) return [];
    
    const phoneRegex = /(?:\+27|0)\s?(\d{2})\s?(\d{3})\s?(\d{4})/g;
    const matches = text.match(phoneRegex);
    
    return matches ? [...new Set(matches)] : [];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// HOW TO GET API KEYS:

/*
1. EVENTBRITE API (FREE - Best option!)
   - Go to: https://www.eventbrite.com/platform/api
   - Sign up for free account
   - Create an app
   - Get your API key
   - Add to .env: EVENTBRITE_API_KEY=your_key_here

2. FACEBOOK GRAPH API
   - Go to: https://developers.facebook.com
   - Create app
   - Add "Events" permission
   - Get access token
   - Add to .env: FACEBOOK_ACCESS_TOKEN=your_token_here

3. MEETUP API
   - Go to: https://www.meetup.com/api/
   - Sign up for API access
   - Get OAuth credentials
   - Add to .env: MEETUP_API_KEY=your_key_here

4. TICKETMASTER API (Optional)
   - Go to: https://developer.ticketmaster.com
   - Register for free
   - Get API key
   - Add to .env: TICKETMASTER_API_KEY=your_key_here
*/

// USAGE EXAMPLE:

/*
// In your routes/eventPlanner.js
const APIEventSources = require('../services/apiEventSources');
const apiSources = new APIEventSources();

router.get('/events-from-apis', authenticate, async (req, res) => {
  try {
    const events = await apiSources.getAllEvents();
    
    res.json({
      success: true,
      events: events,
      total: events.length,
      sources: {
        'API Sources': events.length
      },
      usingRealData: true
    });
  } catch (error) {
    console.error('API fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
*/

module.exports = APIEventSources;