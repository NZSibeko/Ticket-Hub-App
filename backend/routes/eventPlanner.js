// backend/routes/eventPlanner.js - COMPLETE MERGED VERSION
// Authentication is handled by server.js middleware (authenticateToken, requireEventManager)
const express = require('express');
const router = express.Router();

// Mock data cache
let cachedEvents = null;
let lastFetch = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Enhanced mock event data generator with partnership data from first file
const generateMockEvents = () => {
  return [
    {
      id: 'mock_1',
      name: 'Cape Town Jazz Festival',
      title: 'Cape Town Jazz Festival',
      description: 'Annual jazz celebration with international artists.',
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      time: '7:00 PM',
      location: 'CTICC, Cape Town',
      venue: 'CTICC',
      city: 'Cape Town',
      province: 'Western Cape',
      category: 'Music',
      ageGroup: 'all',
      organizer: 'Cape Town Jazz Org',
      contacts: {
        emails: ['info@ctjazzfest.co.za'],
        phones: ['+27 21 123 4567'],
        websites: ['https://ctjazzfest.co.za'],
        social: {
          facebook: 'facebook.com/ctjazzfest'
        }
      },
      estimatedAttendance: 10000,
      attendees: 10000,
      price: 600,
      capacity: 12000,
      available: 2000,
      ticketPriceRange: 'R300 - R900',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 90,
      partnershipOpportunity: true,
      partnershipReason: '🎯 MAJOR FESTIVAL • 🎵 Music event • 💥 10,000 attendees',
      urgency: 'MEDIUM',
      potentialValue: 'very high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=1',
      tags: ['Music', 'Festival', 'Popular'],
      rating: '4.8',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock_2',
      name: 'Joburg Food Market',
      title: 'Joburg Food Market',
      description: 'Weekly food market with local vendors and live music.',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      time: '10:00 AM',
      location: '44 Stanley, Johannesburg',
      venue: '44 Stanley',
      city: 'Johannesburg',
      province: 'Gauteng',
      category: 'Food',
      ageGroup: 'all',
      organizer: 'Urban Markets SA',
      contacts: {
        emails: ['markets@urbanmarkets.co.za'],
        phones: ['+27 11 234 5678'],
        websites: [],
        social: {
          instagram: 'instagram.com/joburgfoodmarket'
        }
      },
      estimatedAttendance: 2000,
      attendees: 2000,
      price: 0,
      capacity: 3000,
      available: 1000,
      ticketPriceRange: 'Free entry',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 70,
      partnershipOpportunity: true,
      partnershipReason: '🎯 WEEKLY EVENT • 🍕 Food vendors • 📈 Growing audience',
      urgency: 'HIGH',
      potentialValue: 'medium',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=2',
      tags: ['Food', 'Weekly', 'Trending'],
      rating: '4.5',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock_3',
      name: 'Durban July Fashion Show',
      title: 'Durban July Fashion Show',
      description: 'Exclusive fashion event during Durban July horse racing.',
      date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      time: '2:00 PM',
      location: 'Greyville Racecourse, Durban',
      venue: 'Greyville Racecourse',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      category: 'Entertainment',
      ageGroup: 'adults',
      organizer: 'Durban Fashion Week',
      contacts: {
        emails: ['fashion@durbanjuly.co.za'],
        phones: ['+27 31 345 6789'],
        websites: ['https://durbanfashionweek.co.za'],
        social: {
          instagram: 'instagram.com/durbanfashion'
        }
      },
      estimatedAttendance: 1500,
      attendees: 1500,
      price: 1000,
      capacity: 2000,
      available: 500,
      ticketPriceRange: 'R500 - R1500',
      hasTicketing: true,
      ticketProvider: 'Current system',
      source: 'Sample Data',
      partnershipScore: 80,
      partnershipOpportunity: true,
      partnershipReason: '🎯 HIGH-END EVENT • 👗 Fashion audience • 💰 Premium pricing',
      urgency: 'LOW',
      potentialValue: 'high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=3',
      tags: ['Entertainment', 'Fashion', 'Premium'],
      rating: '4.7',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock_4',
      name: 'Pretoria Tech Summit',
      title: 'Pretoria Tech Summit',
      description: 'Annual technology and innovation conference for startups.',
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      time: '9:00 AM',
      location: 'CSIR Convention Centre, Pretoria',
      venue: 'CSIR Convention Centre',
      city: 'Pretoria',
      province: 'Gauteng',
      category: 'Technology',
      ageGroup: 'all',
      organizer: 'Tech Innovation SA',
      contacts: {
        emails: ['info@techsummit.co.za'],
        phones: ['+27 12 456 7890'],
        websites: ['https://techsummit.co.za'],
        social: {
          linkedin: 'linkedin.com/company/techsummitsa',
          twitter: 'twitter.com/techsummitsa'
        }
      },
      estimatedAttendance: 3000,
      attendees: 3000,
      price: 1500,
      capacity: 4000,
      available: 1000,
      ticketPriceRange: 'R800 - R2500',
      hasTicketing: false,
      ticketProvider: 'Manual registration',
      source: 'Sample Data',
      partnershipScore: 85,
      partnershipOpportunity: true,
      partnershipReason: '🎯 TECH CONFERENCE • 💼 Corporate audience • 🚀 Startup focus',
      urgency: 'MEDIUM',
      potentialValue: 'high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=4',
      tags: ['Technology', 'Business', 'Conference'],
      rating: '4.6',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock_5',
      name: 'Cape Winelands Marathon',
      title: 'Cape Winelands Marathon',
      description: 'Scenic marathon through the beautiful Cape Winelands.',
      date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      time: '6:00 AM',
      location: 'Stellenbosch Winelands',
      venue: 'Stellenbosch Winelands',
      city: 'Stellenbosch',
      province: 'Western Cape',
      category: 'Sports',
      ageGroup: 'all',
      organizer: 'Winelands Athletics Club',
      contacts: {
        emails: ['admin@winelandsmarathon.co.za'],
        phones: ['+27 21 567 8901'],
        websites: ['https://winelandsmarathon.co.za'],
        social: {
          facebook: 'facebook.com/winelandsmarathon',
          instagram: 'instagram.com/winelandsmarathon'
        }
      },
      estimatedAttendance: 8000,
      attendees: 8000,
      price: 400,
      capacity: 10000,
      available: 2000,
      ticketPriceRange: 'R250 - R600',
      hasTicketing: true,
      ticketProvider: 'Basic system',
      source: 'Sample Data',
      partnershipScore: 75,
      partnershipOpportunity: true,
      partnershipReason: '🎯 SCENIC MARATHON • 🏃‍♂️ 8,000 runners • 🍷 Wine region event',
      urgency: 'LOW',
      potentialValue: 'high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=5',
      tags: ['Sports', 'Marathon', 'Popular'],
      rating: '4.9',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock_6',
      name: 'Soweto Music Festival',
      title: 'Soweto Music Festival',
      description: 'Celebrating local artists and cultural heritage.',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time: '5:00 PM',
      location: 'Orlando Stadium, Soweto',
      venue: 'Orlando Stadium',
      city: 'Johannesburg',
      province: 'Gauteng',
      category: 'Music',
      ageGroup: 'all',
      organizer: 'Soweto Arts Council',
      contacts: {
        emails: ['info@sowetomusicfest.co.za'],
        phones: ['+27 11 678 9012'],
        websites: ['https://sowetomusicfest.co.za'],
        social: {
          facebook: 'facebook.com/sowetomusicfest'
        }
      },
      estimatedAttendance: 15000,
      attendees: 15000,
      price: 350,
      capacity: 20000,
      available: 5000,
      ticketPriceRange: 'R200 - R500',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 88,
      partnershipOpportunity: true,
      partnershipReason: '🎯 LARGE FESTIVAL • 🎵 Local artists • 💥 15,000 attendees',
      urgency: 'HIGH',
      potentialValue: 'very high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=6',
      tags: ['Music', 'Cultural', 'Festival'],
      rating: '4.7',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock-7',
      name: 'Port Elizabeth Arts Festival',
      title: 'Port Elizabeth Arts Festival',
      description: 'An exciting arts event showcasing local and international talent.',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      time: '3:00 PM',
      location: 'PE Opera House',
      venue: 'Opera House',
      city: 'Port Elizabeth',
      province: 'Eastern Cape',
      category: 'Arts',
      ageGroup: 'all',
      organizer: 'PE Arts Council',
      contacts: {
        emails: ['info@pearts.co.za'],
        phones: ['+27 41 234 5678'],
        websites: ['https://pearts.co.za'],
        social: {
          facebook: 'facebook.com/pearts'
        }
      },
      estimatedAttendance: 1200,
      attendees: 1200,
      price: 250,
      capacity: 1500,
      available: 300,
      ticketPriceRange: 'R150 - R350',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 65,
      partnershipOpportunity: true,
      partnershipReason: '🎯 ARTS EVENT • 🎨 Cultural focus • 📈 Regional appeal',
      urgency: 'HIGH',
      potentialValue: 'medium',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=7',
      tags: ['Arts', 'Cultural', 'Trending'],
      rating: '4.3',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock-8',
      name: 'Johannesburg Business Expo',
      title: 'Johannesburg Business Expo',
      description: 'Major business networking and trade exhibition.',
      date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
      time: '8:00 AM',
      location: 'Sandton Convention Centre',
      venue: 'Convention Centre',
      city: 'Johannesburg',
      province: 'Gauteng',
      category: 'Business',
      ageGroup: 'adults',
      organizer: 'JHB Business Forum',
      contacts: {
        emails: ['expo@jhbbusiness.co.za'],
        phones: ['+27 11 890 1234'],
        websites: ['https://jhbbusinessexpo.co.za'],
        social: {
          linkedin: 'linkedin.com/company/jhbbusinessexpo'
        }
      },
      estimatedAttendance: 5000,
      attendees: 5000,
      price: 800,
      capacity: 6000,
      available: 1000,
      ticketPriceRange: 'R500 - R1200',
      hasTicketing: true,
      ticketProvider: 'Quicket',
      source: 'Sample Data',
      partnershipScore: 78,
      partnershipOpportunity: false,
      partnershipReason: '⚠️ Already using Quicket',
      urgency: 'LOW',
      potentialValue: 'medium',
      status: 'tracked',
      image: 'https://picsum.photos/400/300?random=8',
      tags: ['Business', 'Networking', 'Popular'],
      rating: '4.5',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock-9',
      name: 'Durban Comedy Night',
      title: 'Durban Comedy Night',
      description: 'Stand-up comedy featuring South African comedians.',
      date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
      time: '8:00 PM',
      location: 'Durban ICC',
      venue: 'ICC Arena',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      category: 'Entertainment',
      ageGroup: 'adults',
      organizer: 'Laugh Out Loud Productions',
      contacts: {
        emails: ['bookings@lolcomedy.co.za'],
        phones: ['+27 31 456 7890'],
        websites: ['https://lolcomedy.co.za'],
        social: {
          instagram: 'instagram.com/lolcomedysa'
        }
      },
      estimatedAttendance: 800,
      attendees: 800,
      price: 300,
      capacity: 1000,
      available: 200,
      ticketPriceRange: 'R200 - R400',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 72,
      partnershipOpportunity: true,
      partnershipReason: '🎯 COMEDY EVENT • 😂 Entertainment • 🎤 Growing market',
      urgency: 'MEDIUM',
      potentialValue: 'medium',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=9',
      tags: ['Entertainment', 'Comedy', 'Popular'],
      rating: '4.6',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'mock-10',
      name: 'Cape Town Food & Wine Festival',
      title: 'Cape Town Food & Wine Festival',
      description: 'Premier culinary event featuring top chefs and wineries.',
      date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
      time: '11:00 AM',
      location: 'V&A Waterfront',
      venue: 'Waterfront Pavilion',
      city: 'Cape Town',
      province: 'Western Cape',
      category: 'Food',
      ageGroup: 'adults',
      organizer: 'CT Culinary Association',
      contacts: {
        emails: ['info@ctfoodwine.co.za'],
        phones: ['+27 21 789 0123'],
        websites: ['https://ctfoodwine.co.za'],
        social: {
          instagram: 'instagram.com/ctfoodwine',
          facebook: 'facebook.com/ctfoodwine'
        }
      },
      estimatedAttendance: 4500,
      attendees: 4500,
      price: 550,
      capacity: 5000,
      available: 500,
      ticketPriceRange: 'R350 - R750',
      hasTicketing: false,
      ticketProvider: 'None',
      source: 'Sample Data',
      partnershipScore: 82,
      partnershipOpportunity: true,
      partnershipReason: '🎯 PREMIUM FOOD EVENT • 🍷 Wine focus • 💰 High value',
      urgency: 'LOW',
      potentialValue: 'high',
      status: 'potential',
      image: 'https://picsum.photos/400/300?random=10',
      tags: ['Food', 'Wine', 'Premium'],
      rating: '4.8',
      lastUpdated: new Date().toISOString()
    }
  ];
};

// GET /events - Get all events with comprehensive filtering (MERGED from both files)
router.get('/events', async (req, res) => {
  try {
    console.log('📡 GET /events - Query params:', req.query);
    
    const { category, ageGroup, search, sortBy, refresh, location, minPrice, maxPrice, date } = req.query;
    
    // Check cache
    const now = Date.now();
    if (!cachedEvents || !lastFetch || (now - lastFetch) > CACHE_DURATION || refresh === 'true') {
      console.log('🔄 Cache expired or empty, generating fresh mock data');
      cachedEvents = generateMockEvents();
      lastFetch = now;
    } else {
      console.log('✅ Using cached events');
    }

    // Ensure cachedEvents is not null
    let events = [...cachedEvents] || [];
    let filteredEvents = [...events];
    
    // Apply filters - support all filter types from both files
    if (category && category !== 'all') {
      filteredEvents = filteredEvents.filter(e => 
        e.category.toLowerCase() === category.toLowerCase()
      );
      console.log(`🔍 Filtered by category '${category}': ${filteredEvents.length} events`);
    }
    
    if (ageGroup && ageGroup !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.ageGroup === ageGroup);
      console.log(`🔍 Filtered by age group '${ageGroup}': ${filteredEvents.length} events`);
    }
    
    if (location) {
      filteredEvents = filteredEvents.filter(e => 
        e.location?.toLowerCase().includes(location.toLowerCase()) ||
        e.city?.toLowerCase().includes(location.toLowerCase()) ||
        e.venue?.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(e => 
        e.name?.toLowerCase().includes(searchLower) ||
        e.title?.toLowerCase().includes(searchLower) ||
        e.location?.toLowerCase().includes(searchLower) ||
        e.organizer?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower)
      );
      console.log(`🔍 Filtered by search '${search}': ${filteredEvents.length} events`);
    }
    
    if (minPrice) {
      filteredEvents = filteredEvents.filter(e => e.price >= parseFloat(minPrice));
    }
    
    if (maxPrice) {
      filteredEvents = filteredEvents.filter(e => e.price <= parseFloat(maxPrice));
    }
    
    if (date) {
      const filterDate = new Date(date).toDateString();
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.date).toDateString() === filterDate
      );
    }
    
    // Apply sorting - support all sort types from both files
    if (sortBy) {
      switch (sortBy) {
        case 'date':
          filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
          break;
        case 'potential':
          const potentialOrder = { 'very high': 4, 'high': 3, 'medium': 2, 'low': 1 };
          filteredEvents.sort((a, b) => 
            (potentialOrder[b.potentialValue] || 0) - (potentialOrder[a.potentialValue] || 0)
          );
          break;
        case 'attendance':
          filteredEvents.sort((a, b) => (b.estimatedAttendance || b.attendees || 0) - (a.estimatedAttendance || a.attendees || 0));
          break;
        case 'name':
          filteredEvents.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
          break;
        case 'price':
          filteredEvents.sort((a, b) => a.price - b.price);
          break;
        case 'popularity':
          filteredEvents.sort((a, b) => (b.attendees || b.estimatedAttendance || 0) - (a.attendees || a.estimatedAttendance || 0));
          break;
      }
      console.log(`📊 Sorted by: ${sortBy}`);
    }
    
    // Generate statistics
    const sources = {};
    events.forEach(event => {
      sources[event.source] = (sources[event.source] || 0) + 1;
    });
    
    console.log(`✅ Returning ${filteredEvents.length} events (filtered from ${events.length})`);
    
    res.json({
      success: true,
      events: filteredEvents,
      total: events.length,
      filtered: filteredEvents.length,
      sources: sources,
      usingRealData: false,
      cached: lastFetch ? true : false,
      lastUpdated: new Date(lastFetch).toISOString(),
      message: `Found ${filteredEvents.length} event opportunities`
    });
    
  } catch (error) {
    console.error('❌ Error in GET /events:', error);
    
    // Return mock data on error
    const mockEvents = generateMockEvents();
    res.status(200).json({
      success: true,
      events: mockEvents,
      total: mockEvents.length,
      filtered: mockEvents.length,
      sources: { 'Sample Data': mockEvents.length },
      usingRealData: false,
      cached: false,
      lastUpdated: new Date().toISOString(),
      message: 'Using sample data due to error',
      error: error.message
    });
  }
});

// GET /events/:id - Get single event details (MERGED from both files)
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📡 GET /events/:id - Event ID:', id);
    
    // Ensure cache exists
    if (!cachedEvents) {
      cachedEvents = generateMockEvents();
      lastFetch = Date.now();
    }
    
    const event = cachedEvents.find(e => e.id === id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      event: event
    });
    
  } catch (error) {
    console.error('❌ Error in GET /events/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event details'
    });
  }
});

// GET /events/:id/insights - Get AI insights for event (FROM FIRST FILE)
router.get('/events/:id/insights', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🤖 Generating insights for event: ${id}`);
    
    // Ensure cache exists
    if (!cachedEvents) {
      cachedEvents = generateMockEvents();
      lastFetch = Date.now();
    }
    
    const event = cachedEvents.find(e => e.id === id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    // Generate comprehensive insights
    const insights = generateAIInsights(event);
    
    res.json({
      success: true,
      event: event,
      insights: insights
    });
    
  } catch (error) {
    console.error('❌ Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights'
    });
  }
});

// POST /events/:id/contact - Log contact attempt (FROM FIRST FILE)
router.post('/events/:id/contact', async (req, res) => {
  try {
    const { id } = req.params;
    const { contactMethod, notes, followUpDate } = req.body;
    
    console.log(`📞 Contact logged for event ${id}: ${contactMethod}`);
    
    res.json({
      success: true,
      message: 'Contact logged successfully',
      contactLog: {
        eventId: id,
        contactMethod,
        notes,
        followUpDate,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error logging contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log contact'
    });
  }
});

// GET /categories - Get all categories (FROM SECOND FILE)
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 1, name: 'Music', icon: 'musical-notes', count: 150 },
      { id: 2, name: 'Sports', icon: 'basketball', count: 120 },
      { id: 3, name: 'Arts', icon: 'color-palette', count: 80 },
      { id: 4, name: 'Food', icon: 'restaurant', count: 95 },
      { id: 5, name: 'Technology', icon: 'laptop', count: 110 },
      { id: 6, name: 'Business', icon: 'briefcase', count: 75 },
      { id: 7, name: 'Entertainment', icon: 'film', count: 130 }
    ];
    
    res.json({
      success: true,
      categories: categories
    });
    
  } catch (error) {
    console.error('❌ Error in GET /categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// POST /events/favorite - Toggle favorite (FROM SECOND FILE)
router.post('/events/favorite', async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user?.managerId || req.user?.id;
    
    console.log(`📌 Toggle favorite - User: ${userId}, Event: ${eventId}`);
    
    // Mock response - in production, this would update database
    res.json({
      success: true,
      isFavorite: true,
      message: 'Event added to favorites'
    });
    
  } catch (error) {
    console.error('❌ Error in POST /events/favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update favorite status'
    });
  }
});

// GET /stats - Get dashboard stats (FROM SECOND FILE)
router.get('/stats', async (req, res) => {
  try {
    // Ensure cache exists
    if (!cachedEvents) {
      cachedEvents = generateMockEvents();
      lastFetch = Date.now();
    }
    
    const now = new Date();
    const upcomingEvents = cachedEvents.filter(e => new Date(e.date) > now);
    const pastEvents = cachedEvents.filter(e => new Date(e.date) <= now);
    const totalAttendees = cachedEvents.reduce((sum, e) => sum + (e.attendees || 0), 0);
    const avgRating = (cachedEvents.reduce((sum, e) => sum + parseFloat(e.rating || 0), 0) / cachedEvents.length).toFixed(1);
    
    // Count by category
    const categoryCounts = {};
    cachedEvents.forEach(e => {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });
    
    const popularCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const stats = {
      totalEvents: cachedEvents.length,
      upcomingEvents: upcomingEvents.length,
      pastEvents: pastEvents.length,
      totalAttendees: totalAttendees,
      averageRating: parseFloat(avgRating),
      popularCategories: popularCategories
    };
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Error in GET /stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// GET /scraper-status - Get scraper status (FROM FIRST FILE)
router.get('/scraper-status', async (req, res) => {
  try {
    const status = {
      isRunning: false,
      lastScrapeTime: lastFetch ? new Date(lastFetch).toISOString() : null,
      eventsInCache: cachedEvents ? cachedEvents.length : 0,
      nextScrapeTime: lastFetch ? new Date(lastFetch + CACHE_DURATION).toISOString() : null,
      cacheExpiresIn: lastFetch ? Math.max(0, Math.floor((CACHE_DURATION - (Date.now() - lastFetch)) / 1000)) : 0,
      status: 'Ready',
      message: 'Using mock data - cache system active',
      sources: cachedEvents ? cachedEvents.reduce((acc, event) => {
        acc[event.source] = (acc[event.source] || 0) + 1;
        return acc;
      }, {}) : {}
    };
    
    res.json({
      success: true,
      status: status
    });
    
  } catch (error) {
    console.error('❌ Error getting scraper status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scraper status'
    });
  }
});

// POST /scrape-now - Manual trigger scraping (FROM FIRST FILE)
router.post('/scrape-now', async (req, res) => {
  try {
    console.log('🎯 Manual data refresh triggered by user');
    
    // Regenerate mock data
    cachedEvents = generateMockEvents();
    lastFetch = Date.now();
    
    res.json({
      success: true,
      message: 'Data refreshed successfully',
      eventsFound: cachedEvents.length,
      estimatedTime: 'Instant',
      lastUpdated: new Date(lastFetch).toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error triggering manual refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data: ' + error.message
    });
  }
});

// GET /debug/scraper-test - Debug endpoint (FROM FIRST FILE)
router.get('/debug/scraper-test', async (req, res) => {
  try {
    console.log('🧪 Testing data generation...');
    
    const startTime = Date.now();
    const events = generateMockEvents();
    const duration = Date.now() - startTime;
    
    const sources = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      scraperWorking: true,
      duration: `${duration}ms`,
      eventsCount: events.length,
      hasRealData: false,
      dataSample: events.slice(0, 3),
      sources: sources,
      cacheStatus: {
        hasCachedEvents: cachedEvents !== null,
        cachedCount: cachedEvents ? cachedEvents.length : 0,
        lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null
      }
    });
  } catch (error) {
    res.json({
      success: false,
      scraperWorking: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// HELPER FUNCTIONS (FROM FIRST FILE)

function generateAIInsights(event) {
  const daysUntil = Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
  
  return {
    approachStrategy: `
      Contact ${event.organizer} to discuss ticketing partnership:
      1. Our platform handles ${event.estimatedAttendance?.toLocaleString() || event.attendees?.toLocaleString() || 'thousands of'} attendees
      2. Commission-based pricing (no upfront costs)
      3. Real-time analytics and reporting
      4. Mobile ticket delivery with QR codes
      
      ${event.contacts?.emails?.length > 0 ? 
        `Primary contact: ${event.contacts.emails[0]}` : 
        'Find contact via website or social media'}
    `.trim(),
    
    partnershipPotential: [
      `📊 Estimated attendance: ${(event.estimatedAttendance || event.attendees)?.toLocaleString() || 'Significant'} attendees`,
      `🎯 Event category: ${event.category}`,
      `📍 Location: ${event.city}, ${event.province}`,
      `💰 Ticket range: ${event.ticketPriceRange}`,
      `🎫 Current ticketing: ${event.hasTicketing ? event.ticketProvider : '⭐ NO TICKETING SYSTEM'}`
    ],
    
    suggestedOffer: {
      commission: daysUntil < 30 ? '8%' : '10-12%',
      features: [
        'Real-time sales dashboard',
        'Mobile ticket delivery',
        '24/7 customer support',
        'Marketing promotion',
        'Fraud prevention',
        'Analytics reporting'
      ],
      additional: daysUntil < 30 ? 
        'Expedited setup available' : 
        'Standard 2-week implementation'
    },
    
    timingRecommendation: event.urgency === 'HIGH' ?
      '⚡ CONTACT IMMEDIATELY - Event within 30 days' :
      event.urgency === 'MEDIUM' ?
      '✅ GOOD TIMING - Contact within 1-2 weeks' :
      '📅 EARLY STAGE - Build relationship over time',
    
    keyContacts: [
      event.organizer,
      event.contacts?.emails?.[0] ? `Email: ${event.contacts.emails[0]}` : null,
      event.contacts?.phones?.[0] ? `Phone: ${event.contacts.phones[0]}` : null,
      event.contacts?.websites?.[0] ? `Website: ${event.contacts.websites[0]}` : null
    ].filter(Boolean),
    
    competitiveAnalysis: event.hasTicketing ?
      `Currently using ${event.ticketProvider}. Offer better rates and features.` :
      '🎯 NO EXISTING TICKETING - Perfect opportunity for partnership!',
    
    nextSteps: [
      '1. Send introductory email',
      '2. Follow up with phone call',
      '3. Schedule demo meeting',
      '4. Prepare custom proposal',
      '5. Negotiate partnership terms'
    ],
    
    eventMetrics: {
      partnershipScore: event.partnershipScore || 0,
      potentialValue: event.potentialValue || 'medium',
      urgency: event.urgency || 'MEDIUM',
      estimatedRevenue: event.price > 0 ? `R${((event.estimatedAttendance || event.attendees || 0) * event.price * 0.1).toLocaleString()}` : 'Variable'
    }
  };
}

module.exports = router;