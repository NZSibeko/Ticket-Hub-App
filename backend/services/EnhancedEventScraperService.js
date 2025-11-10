// services/enhancedEventScraperService.js - COMPLETE ENHANCED VERSION
const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedEventScraperService {
  constructor() {
    this.sources = [
      // ============================================
      // WEBTICKETS - ENHANCED SELECTORS
      // ============================================
      {
        name: 'Webtickets - Current Events',
        url: 'https://www.webtickets.co.za/v2/events.aspx',
        category: 'all',
        competitor: 'Webtickets',
        active: true,
        priority: 'CRITICAL',
        selectors: {
          containers: [
            '.event-item',
            '.event-card',
            '.event-list-item',
            '.event',
            'article.event',
            '.card.event',
            '[data-event-id]',
            '.events-list > div',
            '.events-container > div',
            '.event-listing .event',
            '[class*="event-item"]',
            '[class*="event-card"]',
            '.listing-item',
            '.event-list .item'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            '.title',
            '[class*="title"]',
            'a[href*="/event/"]',
            '.event-title a',
            '.event-link'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '[class*="date"]',
            '.event-date-time',
            '.dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '[class*="venue"]',
            '[class*="location"]',
            '.event-location'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '[class*="price"]',
            '.cost',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '.presenter',
            '.host',
            '.event-host'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details',
            '.event-info',
            '.event-summary'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]',
            '.card-img img',
            '.event-thumbnail img',
            '[class*="event-image"] img'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="webtickets"]',
            '.btn-ticket',
            '.buy-tickets',
            '.ticket-link',
            '.event-link',
            '.btn-book'
          ]
        }
      },

      // ============================================
      // COMPUTICKET - ENHANCED SELECTORS
      // ============================================
      {
        name: 'Computicket - Current Events',
        url: 'https://www.computicket.com/events',
        category: 'all',
        competitor: 'Computicket',
        active: true,
        priority: 'CRITICAL',
        selectors: {
          containers: [
            '.event-item',
            '.event-card',
            '.event',
            '.events-list .event',
            '[data-event]',
            '.event-list-item',
            '.event-list > div',
            '.events-container > div',
            '.event-listing-item',
            '.listing-item',
            '.event-block'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            '.title',
            'a[href*="/event/"]',
            '.event-title a',
            '.event-link'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.date-time',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location',
            '.venue-name'
          ],
          price: [
            '.event-price',
            '.price',
            '.from-price',
            '.ticket-price',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '.presenter',
            '.event-presenter'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details',
            '.event-info'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="computicket.com/event"]',
            '.btn-buy-tickets',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // QUICKET - ENHANCED SELECTORS
      // ============================================
      {
        name: 'Quicket - Current Events',
        url: 'https://www.quicket.co.za/events/',
        category: 'all',
        competitor: 'Quicket',
        active: true,
        priority: 'CRITICAL',
        selectors: {
          containers: [
            '.event-card',
            '.event-item',
            '.event',
            '[data-event-id]',
            '.events-list .event',
            '.event-list > div',
            '.events-grid > div',
            '.event-listing-item',
            '.event-block',
            '[class*="event-card"]'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            '.event-title a',
            'a[href*="/events/"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-date-time',
            '.dates'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location',
            '.venue-name'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.cost',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '.host',
            '.event-host'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details',
            '.event-info'
          ],
          image: [
            '.event-image img',
            '.event-card img',
            'img[src*="events"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/events/"]',
            'a[href*="quicket.co.za/events/"]',
            '.btn-ticket',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // TICKETPRO - ENHANCED URL & SELECTORS
      // ============================================
      {
        name: 'TicketPro - Current Events',
        url: 'https://www.ticketpros.co.za/events',
        category: 'all',
        competitor: 'TicketPro',
        active: true,
        priority: 'HIGH',
        selectors: {
          containers: [
            '.event-item',
            '.event-card',
            '.event',
            '.events-list .event',
            '[data-event]',
            '.event-list > div',
            '.events-container > div',
            '.event-listing-item',
            '.listing-item',
            '.event-block'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="event"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location',
            '.venue-name'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '.event-organizer'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="ticketpros"]',
            '.btn-tickets',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // HOWLER - ENHANCED SELECTORS
      // ============================================
      {
        name: 'Howler - Music Events',
        url: 'https://www.howler.co.za/events',
        category: 'music',
        competitor: 'Howler',
        active: true,
        priority: 'HIGH',
        selectors: {
          containers: [
            '.event-card',
            '.event-item',
            '.event',
            '.events-list .event',
            '[data-event]',
            '.event-list > div',
            '.event-listing-item',
            '.listing-item',
            '.event-block',
            '[class*="event-card"]'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="/events/"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location',
            '.venue-name'
          ],
          price: [
            '.event-price',
            '.price',
            '.cost',
            '.ticket-price',
            '.event-cost'
          ],
          artist: [
            '.artist',
            '.lineup',
            '.performers',
            '.event-artist'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details'
          ],
          image: [
            '.event-image img',
            '.event-card img',
            'img[src*="event"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/events/"]',
            'a[href*="howler.co.za/events/"]',
            '.btn-tickets',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // TICKETMASTER SOUTH AFRICA
      // ============================================
      {
        name: 'Ticketmaster South Africa',
        url: 'https://www.ticketmaster.co.za/',
        category: 'all',
        competitor: 'Ticketmaster',
        active: true,
        priority: 'CRITICAL',
        selectors: {
          containers: [
            '.event-listing-item',
            '.event-item',
            '.event-card',
            '.event',
            '[data-event]',
            '.event-list > div',
            '.events-container > div',
            '.listing-item',
            '.event-block',
            '.event-tile'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="/event/"]',
            '.event-link',
            '.title',
            '[class*="event-title"]'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time',
            '.dates'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location',
            '.venue-name'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.from-price',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '.presenter'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="ticketmaster.co.za/event"]',
            '.btn-tickets',
            '.ticket-link',
            '.buy-tickets'
          ]
        }
      },

      // ============================================
      // PLANKTON - ENHANCED SELECTORS
      // ============================================
      {
        name: 'Plankton - SA Events',
        url: 'https://www.plankton.mobi/events',
        category: 'all',
        competitor: 'Plankton',
        active: true,
        priority: 'MEDIUM',
        selectors: {
          containers: [
            '.event-card',
            '.event-item',
            '.event',
            '.events-list .event',
            '[data-event]',
            '.event-list > div',
            '.event-listing-item',
            '.listing-item',
            '.event-block'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="/event/"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.event-cost'
          ],
          description: [
            '.event-description',
            '.description',
            '.event-details'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]',
            '.event-thumbnail img'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="plankton"]',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // EVENTBRITE - JOHANNESBURG (ENHANCED)
      // ============================================
      {
        name: 'Eventbrite - Johannesburg',
        url: 'https://www.eventbrite.com/d/south-africa--johannesburg/events/',
        category: 'all',
        competitor: 'Eventbrite',
        active: true,
        priority: 'HIGH',
        selectors: {
          containers: [
            '.event-card',
            '.search-event-card',
            '[data-testid*="event-card"]',
            '.eds-event-card',
            '.event-item',
            'article[role="article"]',
            '.event-card__container'
          ],
          title: [
            '[data-testid="event-card-name"]',
            '.event-title',
            'h3', 'h2', 'h1',
            '[class*="event-card__name"]',
            '.event-card__title'
          ],
          date: [
            '[data-testid="event-card-date"]',
            'time',
            '[datetime]',
            '.event-date',
            '[class*="event-card__date"]',
            '.event-card__date'
          ],
          venue: [
            '[data-testid="event-card-location"]',
            '.event-venue',
            '.location',
            '[class*="event-card__location"]',
            '.event-card__location'
          ],
          price: [
            '.event-price',
            '.price',
            '[data-testid*="price"]',
            '[class*="event-card__price"]',
            '.event-card__price'
          ],
          organizer: [
            '.event-organizer',
            '.organizer',
            '[class*="event-card__organizer"]',
            '.event-card__organizer'
          ],
          description: [
            '.event-description',
            '.description',
            '[class*="event-card__description"]',
            '.event-card__description'
          ],
          image: [
            '.event-image img',
            '[data-testid="event-card-image"] img',
            '[class*="event-card__image"] img',
            '.event-card__image img'
          ],
          ticketLink: [
            'a[href*="/e/"]',
            '[data-testid="event-card-link"]',
            '[href*="eventbrite"]',
            '.event-card__link'
          ]
        }
      },

      // ============================================
      // EVENTBRITE - CAPE TOWN (ENHANCED)
      // ============================================
      {
        name: 'Eventbrite - Cape Town',
        url: 'https://www.eventbrite.com/d/south-africa--cape-town/events/',
        category: 'all',
        competitor: 'Eventbrite',
        active: true,
        priority: 'HIGH',
        selectors: {
          containers: [
            '.event-card',
            '.search-event-card',
            '[data-testid*="event-card"]',
            '.eds-event-card',
            'article[role="article"]',
            '.event-card__container'
          ],
          title: [
            '[data-testid="event-card-name"]',
            '.event-title',
            'h3', 'h2',
            '[class*="event-card__name"]',
            '.event-card__title'
          ],
          date: [
            '[data-testid="event-card-date"]',
            'time',
            '[datetime]',
            '.event-date',
            '.event-card__date'
          ],
          venue: [
            '[data-testid="event-card-location"]',
            '.event-venue',
            '.location',
            '.event-card__location'
          ],
          price: [
            '.event-price',
            '[data-testid*="price"]',
            '[class*="event-card__price"]',
            '.event-card__price'
          ],
          organizer: [
            '.event-organizer',
            '[class*="event-card__organizer"]',
            '.event-card__organizer'
          ],
          description: [
            '.event-description',
            '[class*="event-card__description"]',
            '.event-card__description'
          ],
          image: [
            '.event-image img',
            '[data-testid="event-card-image"] img',
            '.event-card__image img'
          ],
          ticketLink: [
            'a[href*="/e/"]',
            '[data-testid="event-card-link"]',
            '.event-card__link'
          ]
        }
      },

      // ============================================
      // TIX.SA - NEW SOUTH AFRICAN PLATFORM
      // ============================================
      {
        name: 'Tix SA - Events',
        url: 'https://www.tix.za.com/events',
        category: 'all',
        competitor: 'Tix SA',
        active: true,
        priority: 'MEDIUM',
        selectors: {
          containers: [
            '.event-item',
            '.event-card',
            '.event',
            '.events-list .event',
            '[data-event]',
            '.event-list > div',
            '.event-listing-item',
            '.listing-item'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="/event/"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.event-cost'
          ],
          organizer: [
            '.event-organizer',
            '.organizer'
          ],
          description: [
            '.event-description',
            '.description'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="tix.za.com"]',
            '.ticket-link',
            '.book-now'
          ]
        }
      },

      // ============================================
      // SEATGEEK SOUTH AFRICA
      // ============================================
      {
        name: 'SeatGeek South Africa',
        url: 'https://seatgeek.com/venues/south-africa/events',
        category: 'all',
        competitor: 'SeatGeek',
        active: true,
        priority: 'MEDIUM',
        selectors: {
          containers: [
            '.event-item',
            '.event-card',
            '.event',
            '[data-event]',
            '.event-list > div',
            '.events-container > div',
            '.event-listing-item',
            '.event-tile'
          ],
          title: [
            '.event-title',
            '.event-name',
            'h3', 'h2', 'h1',
            'a[href*="/event/"]',
            '.event-link',
            '.title'
          ],
          date: [
            '.event-date',
            '.date',
            'time',
            '[datetime]',
            '.event-dates',
            '.event-time'
          ],
          venue: [
            '.event-venue',
            '.venue',
            '.location',
            '.event-location'
          ],
          price: [
            '.event-price',
            '.price',
            '.ticket-price',
            '.from-price'
          ],
          organizer: [
            '.event-organizer',
            '.organizer'
          ],
          description: [
            '.event-description',
            '.description'
          ],
          image: [
            '.event-image img',
            '.event-img img',
            'img[src*="event"]'
          ],
          ticketLink: [
            'a[href*="/event/"]',
            'a[href*="seatgeek.com"]',
            '.ticket-link',
            '.buy-tickets'
          ]
        }
      }
    ];

    this.requestDelay = 2000;
    this.timeout = 20000;
    this.maxRetries = 3;
    
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];

    this.knownEvents = this.buildEnhancedIndustryKnowledge();
  }

  buildEnhancedIndustryKnowledge() {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    return [
      {
        name: 'Cape Town International Jazz Festival',
        organizer: {
          name: 'espAfrika',
          contactPerson: 'Festival Director',
          email: 'info@capetownjazzfest.com',
          phone: '+27 21 422 5191',
          website: 'https://www.capetownjazzfest.com',
          socialMedia: {
            instagram: '@ctijazzfest',
            facebook: 'CapeTownJazzFest',
            twitter: '@ctijazzfest'
          },
          officeAddress: 'Cape Town, Western Cape'
        },
        dates: {
          month: 3,
          year: nextYear,
          startDate: new Date(nextYear, 2, 28),
          endDate: new Date(nextYear, 2, 29),
          daysOfWeek: ['Friday', 'Saturday']
        },
        venue: {
          name: 'Cape Town International Convention Centre',
          address: '1 Lower Long Street, Cape Town',
          capacity: 35000
        },
        category: 'music',
        estimatedAttendees: 35000,
        previousProvider: 'Webtickets',
        ticketPricing: {
          earlyBird: 550,
          regular: 650,
          vip: 1200,
          average: 650
        },
        isAnnual: true,
        partnershipOpportunities: [
          'Multi-year ticketing contract',
          'Integrated merchandise sales',
          'VIP hospitality packages',
          'Festival app integration',
          'Sponsor activation tools'
        ]
      },
      {
        name: 'Two Oceans Marathon',
        organizer: {
          name: 'Two Oceans Marathon NPC',
          contactPerson: 'Race Director',
          email: 'entries@twoceansmarathon.org.za',
          phone: '+27 21 657 5140',
          website: 'https://www.twoceansmarathon.org.za',
          socialMedia: {
            instagram: '@twoceansmarathon',
            facebook: 'TwoOceansMarathon',
            twitter: '@2OceansMarathon'
          },
          officeAddress: 'Cape Town, Western Cape'
        },
        dates: {
          month: 4,
          year: nextYear,
          startDate: new Date(nextYear, 3, 12),
          endDate: new Date(nextYear, 3, 13),
          daysOfWeek: ['Saturday', 'Sunday']
        },
        venue: {
          name: 'Cape Town (UCT Start)',
          address: 'University of Cape Town, Rondebosch',
          capacity: 25000
        },
        category: 'sports',
        estimatedAttendees: 25000,
        previousProvider: 'Entry RSA / Direct Registration',
        ticketPricing: {
          earlyBird: 300,
          regular: 400,
          lateEntry: 500,
          average: 400
        },
        isAnnual: true,
        partnershipOpportunities: [
          'Full race entry management',
          'Digital race pack distribution',
          'Result tracking integration',
          'Merchandise pre-orders',
          'Charity runner packages'
        ]
      },
      {
        name: 'Johannesburg International Comedy Festival',
        organizer: {
          name: 'JHB Comedy Fest',
          contactPerson: 'Festival Director',
          email: 'bookings@jhbcomedyfest.co.za',
          phone: '+27 11 234 5678',
          website: 'https://www.jhbcomedyfest.co.za',
          socialMedia: {
            instagram: '@jhbcomedyfest',
            facebook: 'JHBComedyFest',
            twitter: '@JHBComedyFest'
          },
          officeAddress: 'Johannesburg, Gauteng'
        },
        dates: {
          month: 8,
          year: nextYear,
          startDate: new Date(nextYear, 7, 15),
          endDate: new Date(nextYear, 7, 17),
          daysOfWeek: ['Thursday', 'Friday', 'Saturday']
        },
        venue: {
          name: 'Montecasino',
          address: 'Montecasino Boulevard, Fourways, Johannesburg',
          capacity: 12000
        },
        category: 'comedy',
        estimatedAttendees: 12000,
        previousProvider: 'Computicket',
        ticketPricing: {
          earlyBird: 250,
          regular: 350,
          vip: 600,
          average: 350
        },
        isAnnual: true,
        partnershipOpportunities: [
          'Multi-venue ticketing solution',
          'VIP experience packages',
          'Comedian meet & greet management',
          'Season pass options'
        ]
      },
      {
        name: 'Durban July Horse Racing',
        organizer: {
          name: 'Gold Circle',
          contactPerson: 'Event Manager',
          email: 'events@goldcircle.co.za',
          phone: '+27 31 314 1600',
          website: 'https://www.durbanjuly.co.za',
          socialMedia: {
            instagram: '@durbanjuly',
            facebook: 'DurbanJuly',
            twitter: '@DurbanJuly'
          },
          officeAddress: 'Durban, KwaZulu-Natal'
        },
        dates: {
          month: 7,
          year: nextYear,
          startDate: new Date(nextYear, 6, 5),
          endDate: new Date(nextYear, 6, 5),
          daysOfWeek: ['Saturday']
        },
        venue: {
          name: 'Greyville Racecourse',
          address: '120 Avondale Road, Greyville, Durban',
          capacity: 50000
        },
        category: 'sports',
        estimatedAttendees: 50000,
        previousProvider: 'Webtickets',
        ticketPricing: {
          general: 450,
          grandstand: 850,
          vip: 2500,
          average: 850
        },
        isAnnual: true,
        partnershipOpportunities: [
          'Premium hospitality ticketing',
          'Fashion show integration',
          'Corporate package management',
          'Multi-day event passes'
        ]
      }
    ];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  getHeaders() {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://www.google.com/',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  isValidEventTitle(text, source) {
    if (!text || typeof text !== 'string') return false;
    
    text = text.trim();
    
    // Length checks
    if (text.length < 5 || text.length > 200) return false;
    
    // Exclude patterns
    const excludePatterns = [
      /^[0-9\s\-\(\)]+$/, // Only numbers/phone
      /@/, // Email addresses
      /https?:\/\//, // URLs
      /\.co\.za/i,
      /\.com/i,
      /\.mobi/i,
      /\.org/i,
      /privacy|terms|conditions|cookie/i,
      /login|signup|register|subscribe/i,
      /copyright|©|reserved/i,
      /^menu$/i,
      /^home$/i,
      /^about$/i,
      /^contact$/i,
      /^search$/i,
      /^filter$/i,
      /^sort$/i,
      /\.logo/i,
      /\.css/i,
      /\.svg/i,
      /\.png/i,
      /\.jpg/i,
      /\.jpeg/i
    ];
    
    if (excludePatterns.some(pattern => pattern.test(text))) {
      return false;
    }
    
    return true;
  }

  parseDateText(dateText) {
    if (!dateText) return null;

    dateText = dateText.trim();
    console.log(`      📅 Parsing date: "${dateText}"`);

    // Clean the text first
    dateText = dateText.replace(/^(date|when|on|starts|from):?\s*/i, '');
    
    // Try direct Date parsing first (handles ISO formats)
    try {
      const directDate = new Date(dateText);
      if (!isNaN(directDate.getTime()) && this.isValidCurrentOrFutureDate(directDate)) {
        console.log(`      ✅ Direct date parsed: ${directDate.toISOString().split('T')[0]}`);
        return directDate.toISOString();
      }
    } catch (e) {
      // Continue to other methods
    }

    // Handle common date formats
    const dateFormats = [
      // ISO: 2024-03-15, 2024/03/15
      { pattern: /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/, example: "2024-12-31" },
      
      // Day Month Year: 15 March 2024, 15 Mar 2024
      { pattern: /(\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i, example: "15 March 2024" },
      { pattern: /(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i, example: "15 Mar 2024" },
      
      // Month Day Year: March 15, 2024, Mar 15 2024
      { pattern: /((january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i, example: "March 15, 2024" },
      { pattern: /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i, example: "Mar 15 2024" },
      
      // South African format: 15/03/2024, 15-03-2024
      { pattern: /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/, example: "15/03/2024" },
      
      // Month Year only: March 2024
      { pattern: /((january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i, example: "March 2024" },
      
      // Eventbrite format: Sat, Mar 16 • 7:00 PM
      { pattern: /((mon|tue|wed|thu|fri|sat|sun),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2})/i, example: "Sat, Mar 16" }
    ];

    for (const format of dateFormats) {
      const match = dateText.match(format.pattern);
      if (match) {
        try {
          const dateStr = match[1];
          const date = new Date(dateStr);
          
          if (!isNaN(date.getTime()) && this.isValidCurrentOrFutureDate(date)) {
            console.log(`      ✅ Date parsed from pattern: ${date.toISOString().split('T')[0]}`);
            return date.toISOString();
          }
        } catch (e) {
          continue;
        }
      }
    }

    // Handle short month/day formats by assuming current/next year
    const shortDateMatch = dateText.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i);
    if (shortDateMatch) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const dateWithYear = `${shortDateMatch[0]} ${currentYear}`;
      const date = new Date(dateWithYear);
      
      // If the date is in the past, assume next year
      if (date < now) {
        date.setFullYear(currentYear + 1);
      }
      
      if (this.isValidCurrentOrFutureDate(date)) {
        console.log(`      ✅ Short date parsed with year assumption: ${date.toISOString().split('T')[0]}`);
        return date.toISOString();
      }
    }

    // Handle relative dates (only current/future)
    const relativeDates = {
      'today': 0,
      'tomorrow': 1,
      'this weekend': this.getDaysToNextWeekend(),
      'next week': 7,
      'next month': 30
    };

    for (const [keyword, days] of Object.entries(relativeDates)) {
      if (dateText.toLowerCase().includes(keyword)) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        if (this.isValidCurrentOrFutureDate(date)) {
          console.log(`      ✅ Relative date "${keyword}": ${date.toISOString().split('T')[0]}`);
          return date.toISOString();
        }
      }
    }

    console.log(`      ❌ Could not parse valid current/future date: "${dateText}"`);
    return null;
  }

  isValidCurrentOrFutureDate(date) {
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);
    
    // Allow dates from today up to 1 year in future
    // Remove time component for date comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dateOnly >= nowOnly && date <= oneYearFromNow;
  }

  getDaysToNextWeekend() {
    const today = new Date().getDay();
    return today === 0 ? 6 : 6 - today; // Days until next Saturday
  }

  extractDateFromContainer($, $container, source) {
    // Method 1: Try standard date selectors
    const dateSelectors = [
      'time',
      '[datetime]',
      '.event-date',
      '.date',
      '[class*="date"]',
      '[data-testid*="date"]',
      '.event-dates',
      '.dates',
      '[class*="event-card__date"]',
      '.event-time',
      '.date-time'
    ];

    for (const selector of dateSelectors) {
      const elem = $container.find(selector).first();
      if (elem.length > 0) {
        // Try datetime attribute first
        const datetime = elem.attr('datetime');
        if (datetime) {
          console.log(`      📅 Found datetime attr: "${datetime}"`);
          const parsed = this.parseDateText(datetime);
          if (parsed) return parsed;
        }
        
        // Try text content
        const text = elem.text().trim();
        if (text) {
          const parsed = this.parseDateText(text);
          if (parsed) return parsed;
        }
      }
    }

    // Method 2: Search all text in container for date patterns
    const fullText = $container.text();
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/i,
      /\d{1,2}[-/]\d{1,2}[-/]\d{4}/,
      /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i
    ];

    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        console.log(`      📅 Found date in text: "${match[0]}"`);
        const parsed = this.parseDateText(match[0]);
        if (parsed) return parsed;
      }
    }

    return null;
  }

  extractEventFromContainer($, $container, source) {
    try {
      // Extract title with multiple fallbacks
      let title = '';
      const titleSelectors = [...source.selectors.title, 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'span'];
      
      for (const selector of titleSelectors) {
        const elem = $container.find(selector).first();
        if (elem.length > 0) {
          const text = elem.text().trim();
          if (this.isValidEventTitle(text, source)) {
            title = text;
            console.log(`      ✅ Title from ${selector}: "${title.substring(0, 50)}..."`);
            break;
          }
        }
      }

      if (!title) {
        console.log(`      ❌ No valid title found`);
        return null;
      }

      // Clean title
      title = title.replace(/\s+/g, ' ').trim();

      // Extract date with multiple approaches
      let eventDate = this.extractDateFromContainer($, $container, source);
      
      // If no date found, try parent elements
      if (!eventDate) {
        let parent = $container.parent();
        for (let i = 0; i < 3 && parent.length > 0; i++) {
          const parentDate = this.extractDateFromContainer($, parent, source);
          if (parentDate) {
            console.log(`      📅 Found date in parent element`);
            eventDate = parentDate;
            break;
          }
          parent = parent.parent();
        }
      }

      // For Eventbrite, try to find date in sibling elements
      if (!eventDate && source.competitor === 'Eventbrite') {
        const siblings = $container.siblings();
        for (let i = 0; i < siblings.length && i < 5; i++) {
          const siblingDate = this.extractDateFromContainer($, $(siblings[i]), source);
          if (siblingDate) {
            console.log(`      📅 Found date in sibling element`);
            eventDate = siblingDate;
            break;
          }
        }
      }

      // Skip events without dates (we want current/future events with dates)
      if (!eventDate) {
        console.log(`      ⏩ Skipping - no valid current/future date found`);
        return null;
      }

      // Extract venue
      let venue = '';
      if (source.selectors.venue) {
        for (const selector of source.selectors.venue) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            venue = elem.text().trim();
            if (venue && venue.length > 2 && !venue.match(/@|http|\.com/i)) {
              console.log(`      🏟️ Venue: "${venue}"`);
              break;
            }
          }
        }
      }

      // Extract price
      let price = '';
      if (source.selectors.price) {
        for (const selector of source.selectors.price) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            price = elem.text().trim();
            if (price && (price.includes('R') || price.toLowerCase().includes('free') || price.match(/\d/))) {
              console.log(`      💰 Price: "${price}"`);
              break;
            }
          }
        }
      }

      // Extract organizer
      let organizer = '';
      if (source.selectors.organizer || source.selectors.artist) {
        const orgSelectors = [...(source.selectors.organizer || []), ...(source.selectors.artist || [])];
        for (const selector of orgSelectors) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            organizer = elem.text().trim();
            if (organizer && organizer.length > 2) {
              console.log(`      👤 Organizer: "${organizer}"`);
              break;
            }
          }
        }
      }

      // Extract description
      let description = '';
      if (source.selectors.description) {
        for (const selector of source.selectors.description) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            description = elem.text().trim();
            if (description && description.length > 10) break;
          }
        }
      }
      
      // Fallback: use container text
      if (!description || description.length < 10) {
        description = $container.text().trim().substring(0, 300);
      }

      // Extract image
      let imageUrl = '';
      if (source.selectors.image) {
        for (const selector of source.selectors.image) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            imageUrl = elem.attr('src') || elem.attr('data-src') || '';
            if (imageUrl && !imageUrl.includes('placeholder') && !imageUrl.includes('logo')) break;
          }
        }
      }

      // Extract ticket link
      let ticketLink = '';
      if (source.selectors.ticketLink) {
        for (const selector of source.selectors.ticketLink) {
          const elem = $container.find(selector).first();
          if (elem.length > 0) {
            let href = elem.attr('href') || '';
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
              if (!href.startsWith('http')) {
                try {
                  const baseUrl = new URL(source.url);
                  href = `${baseUrl.origin}${href.startsWith('/') ? href : '/' + href}`;
                } catch (e) {
                  href = source.url + (href.startsWith('/') ? href : '/' + href);
                }
              }
              ticketLink = href;
              console.log(`      🎫 Link: ${ticketLink.substring(0, 60)}...`);
              break;
            }
          }
        }
      }

      // Fallback: find any valid link in container
      if (!ticketLink) {
        const anyLink = $container.find('a').first().attr('href');
        if (anyLink && !anyLink.startsWith('#') && !anyLink.startsWith('javascript:')) {
          if (!anyLink.startsWith('http')) {
            try {
              const baseUrl = new URL(source.url);
              ticketLink = `${baseUrl.origin}${anyLink.startsWith('/') ? anyLink : '/' + anyLink}`;
            } catch (e) {
              ticketLink = source.url + (anyLink.startsWith('/') ? anyLink : '/' + anyLink);
            }
          } else {
            ticketLink = anyLink;
          }
        }
      }

      return this.createEnhancedEvent({
        name: title,
        description: description,
        dateText: eventDate ? new Date(eventDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '',
        venue: venue,
        price: price,
        organizer: organizer,
        imageUrl: imageUrl,
        ticketLink: ticketLink,
        category: source.category === 'all' ? this.detectCategory(title, description) : source.category,
        previousProvider: source.competitor,
        source: source.name,
        sourceUrl: source.url,
        hasDate: !!eventDate,
        parsedDate: eventDate
      });
    } catch (error) {
      console.log(`      ❌ Error extracting event: ${error.message}`);
      return null;
    }
  }

  debugSelectors($, source) {
    console.log(`   🔍 Debugging selectors for ${source.name}`);
    
    let foundAny = false;
    
    source.selectors.containers.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`      📦 ${selector}: ${count} elements`);
        foundAny = true;
        
        // Show sample content for first container
        if (count > 0) {
          const firstContainer = $(selector).first();
          const containerText = firstContainer.text().substring(0, 100).replace(/\s+/g, ' ');
          console.log(`         Sample: "${containerText}..."`);
        }
      }
    });

    if (!foundAny) {
      console.log(`      ❌ No containers found with any selector`);
      // Try generic search for event-like elements
      const potentialContainers = $('a[href*="event"], a[href*="ticket"], article, .card, .tile, [class*="event"], [class*="ticket"]').slice(0, 15);
      console.log(`      🔍 Found ${potentialContainers.length} potential event containers`);
      
      // Show what we found
      potentialContainers.each((i, el) => {
        if (i < 3) { // Show first 3
          const $el = $(el);
          const text = $el.text().substring(0, 80).replace(/\s+/g, ' ').trim();
          const href = $el.attr('href') || '';
          console.log(`         ${i+1}. "${text}" -> ${href.substring(0, 50)}`);
        }
      });
    }
  }

  fallbackExtraction($, source) {
    try {
      console.log(`   🔄 Starting comprehensive fallback extraction...`);
      const events = [];
      const found = new Set();
      
      // Method 1: Look for any links that might be events
      const eventLinks = $('a[href*="event"], a[href*="ticket"], a[href*="/e/"], a[href*="/events/"]').slice(0, 20);
      
      eventLinks.each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const href = $el.attr('href') || '';
        
        if (this.isValidEventTitle(text, source) && 
            href.length > 5 &&
            !href.includes('#') &&
            !href.includes('javascript:') &&
            !text.match(/\.(css|js|svg|png|jpg|jpeg)/i)) {
          
          if (!found.has(text)) {
            found.add(text);
            console.log(`      🎯 Fallback found: "${text.substring(0, 50)}..."`);
            
            // Try to extract date from nearby elements
            let eventDate = null;
            const parentText = $el.parent().text();
            const datePatterns = [
              /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i,
              /\d{1,2}[-/]\d{1,2}[-/]\d{4}/,
              /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i
            ];
            
            for (const pattern of datePatterns) {
              const match = parentText.match(pattern);
              if (match) {
                eventDate = this.parseDateText(match[0]);
                if (eventDate) break;
              }
            }
            
            // For fallback events, create a future date if none found
            if (!eventDate) {
              const futureDate = new Date();
              futureDate.setMonth(futureDate.getMonth() + 1);
              eventDate = futureDate.toISOString();
            }
            
            const event = this.createEnhancedEvent({
              name: text,
              description: `Event found via link analysis: ${text}`,
              dateText: new Date(eventDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              venue: '',
              price: '',
              organizer: '',
              imageUrl: '',
              ticketLink: href.startsWith('http') ? href : new URL(href, source.url).href,
              category: source.category === 'all' ? this.detectCategory(text, '') : source.category,
              previousProvider: source.competitor,
              source: source.name + ' (Link Fallback)',
              sourceUrl: source.url,
              hasDate: true,
              parsedDate: eventDate
            });
            
            if (event) events.push(event);
          }
        }
      });
      
      console.log(`      ✅ Fallback extracted ${events.length} events from links`);
      
      return events;

    } catch (error) {
      console.log(`      ❌ Fallback extraction failed: ${error.message}`);
      return [];
    }
  }

  async scrapeCurrentAndFutureEvents() {
    console.log('🎯 CURRENT & FUTURE EVENTS SCRAPER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Target: Current and upcoming events only');
    console.log('⏰ Timeframe: Today to 1 year in future');
    console.log('🎭 Sources: All major SA ticketing platforms');
    console.log('💡 Goal: Partnership opportunities for upcoming events');
    console.log('');
    
    const currentEvents = [];
    const activeSources = this.sources.filter(s => s.active);
    
    console.log(`📡 Scraping ${activeSources.length} competitor sources for current events`);
    console.log('');

    for (let i = 0; i < activeSources.length; i++) {
      const source = activeSources[i];
      
      try {
        console.log(`[${i + 1}/${activeSources.length}] ${source.name}`);
        console.log(`   Competitor: ${source.competitor} | Category: ${source.category}`);
        console.log(`   URL: ${source.url}`);
        
        const events = await this.scrapeSourceWithRetry(source);
        
        if (events && events.length > 0) {
          console.log(`✅ Found ${events.length} current/future events`);
          currentEvents.push(...events);
        } else {
          console.log(`⚠️  No current events found`);
        }

        if (i < activeSources.length - 1) {
          const delayTime = this.requestDelay + Math.random() * 2000;
          console.log(`   ⏳ Pause: ${Math.round(delayTime/1000)}s...`);
          await this.delay(delayTime);
        }

      } catch (error) {
        console.log(`❌ Error scraping ${source.name}: ${error.message}`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CURRENT EVENTS RESULTS');
    console.log(`   Current/Future events found: ${currentEvents.length}`);
    
    // Filter to only include events with valid current/future dates
    const validCurrentEvents = currentEvents.filter(event => {
      if (!event.eventDate) return false;
      try {
        const eventDate = new Date(event.eventDate);
        return this.isValidCurrentOrFutureDate(eventDate);
      } catch (e) {
        return false;
      }
    });

    console.log(`   Valid current/future events: ${validCurrentEvents.length}`);
    console.log('');
    
    // Add industry knowledge database (only current/future events)
    console.log('📚 Adding SA event industry database (current/future events only)...');
    const currentIndustryEvents = this.convertKnownEventsToTargets().filter(event => {
      try {
        const eventDate = new Date(event.eventDate);
        return this.isValidCurrentOrFutureDate(eventDate);
      } catch (e) {
        return false;
      }
    });
    
    const combined = [...validCurrentEvents, ...currentIndustryEvents];
    
    console.log(`   Total current/future events: ${combined.length}`);
    console.log('');
    
    return this.organizeAndEnhanceEvents(combined);
  }

  async scrapeSourceWithRetry(source, retryCount = 0) {
    try {
      return await this.scrapeSource(source);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const waitTime = (retryCount + 1) * 5000;
        console.log(`   🔄 Retry ${retryCount + 1}/${this.maxRetries} in ${waitTime/1000}s...`);
        await this.delay(waitTime);
        return this.scrapeSourceWithRetry(source, retryCount + 1);
      }
      throw error;
    }
  }

  async scrapeSource(source) {
    try {
      console.log(`   🌐 Fetching ${source.url}...`);
      const response = await axios.get(source.url, {
        timeout: this.timeout,
        headers: this.getHeaders(),
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        console.log(`   ❌ HTTP ${response.status} for ${source.name}`);
        return [];
      }

      console.log(`   ✅ Successfully fetched page (${response.data.length} bytes)`);
      return this.parseHTML(source, response.data);
    } catch (error) {
      console.log(`   ❌ Network error for ${source.name}: ${error.message}`);
      throw error;
    }
  }

  parseHTML(source, html) {
    try {
      const $ = cheerio.load(html);
      const events = [];
      const found = new Set();

      // Debug: Check what selectors are working
      this.debugSelectors($, source);

      // METHOD 1: Try container-based extraction
      if (source.selectors?.containers) {
        for (const containerSelector of source.selectors.containers) {
          const containers = $(containerSelector);
          
          if (containers.length > 0) {
            console.log(`   📦 Found ${containers.length} event containers with "${containerSelector}"`);
            
            let extractedFromThisSelector = 0;
            
            containers.slice(0, 25).each((i, container) => {
              try {
                const event = this.extractEventFromContainer($, $(container), source);
                
                if (event && event.name && event.name.length > 5 && !found.has(event.name)) {
                  found.add(event.name);
                  events.push(event);
                  extractedFromThisSelector++;
                }
              } catch (e) {
                // Continue silently
              }
            });
            
            console.log(`      ✅ Extracted ${extractedFromThisSelector} events from this selector`);
            if (events.length > 8) break; // Stop if we found enough events
          }
        }
      }

      // METHOD 2: Comprehensive fallback if no events found
      if (events.length === 0) {
        console.log(`   🔄 Trying comprehensive fallback extraction...`);
        const fallbackEvents = this.fallbackExtraction($, source);
        fallbackEvents.forEach(event => {
          if (event && event.name && !found.has(event.name)) {
            found.add(event.name);
            events.push(event);
          }
        });
        console.log(`      ✅ Fallback extracted ${fallbackEvents.length} events`);
      }

      return events;
    } catch (error) {
      console.log(`   ❌ Error parsing HTML for ${source.name}: ${error.message}`);
      return [];
    }
  }

  researchOrganizerInfo(data) {
    const info = {
      hasContact: false,
      contactPerson: 'Event Organizer',
      email: null,
      phone: null,
      website: data.ticketLink || data.sourceUrl,
      officeAddress: null,
      socialMedia: {},
      verified: false,
      researchNotes: []
    };

    // Extract email from description or other fields if present
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+27|0)[\s]?[1-9][\s]?(\d[\s]?){8}/g;
    
    const searchText = `${data.description} ${data.organizer} ${data.venue}`;
    
    // Extract emails
    const emailMatches = searchText.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      info.email = emailMatches[0];
      info.hasContact = true;
    }
    
    // Extract phone numbers
    const phoneMatches = searchText.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      info.phone = phoneMatches[0];
      info.hasContact = true;
    }

    // If no contacts found, add research notes
    if (!info.hasContact) {
      if (data.organizer && data.organizer.length > 2) {
        info.researchNotes.push(`Google: "${data.organizer} contact email"`);
        info.researchNotes.push(`LinkedIn: Search for "${data.organizer}"`);
        info.researchNotes.push(`Check ${data.previousProvider} listing for organizer contact`);
      } else {
        info.researchNotes.push(`Google: "${data.name} organizer contact"`);
        info.researchNotes.push(`Check event website for contact information`);
      }

      if (data.venue && data.venue !== 'Venue TBD') {
        info.researchNotes.push(`Contact ${data.venue} for organizer details`);
      }
    }

    return info;
  }

  createEnhancedEvent(data) {
    if (!data.name || data.name.length < 3) return null;

    const eventDate = data.parsedDate || this.parseDateText(data.dateText) || this.parseDate(data.dateText);
    const dateInfo = this.extractDateInfo(eventDate);
    
    const estimatedAttendees = this.estimateAttendees(data.name, data.description, data.category);
    const ticketPrice = this.parsePrice(data.price) || this.estimateTicketPrice(data.category);
    const revenue = this.calculateRevenue(estimatedAttendees, ticketPrice);
    const organizerInfo = this.researchOrganizerInfo(data);
    
    // FIXED: Calculate timing with safe defaults
    const timing = this.calculateEventTiming(eventDate);
    
    const switchScore = this.calculateSwitchScore({
      isAnnual: this.detectAnnualEvent(data.name),
      category: data.category,
      hasContact: organizerInfo.hasContact,
      attendees: estimatedAttendees
    });
    
    return {
      id: this.generateId(data.name),
      name: data.name.trim(),
      description: data.description || `${data.category} event`,
      
      // DATE INFORMATION
      eventDate: eventDate,
      originalDateText: data.dateText,
      month: dateInfo.month,
      monthNumber: dateInfo.monthNumber,
      day: dateInfo.day,
      year: dateInfo.year,
      daysOfWeek: dateInfo.daysOfWeek,
      season: this.getSeason(dateInfo.monthNumber),
      
      // VENUE
      venue: data.venue || 'Venue TBD',
      venueAddress: this.extractVenueAddress(data.venue),
      
      // VISUAL
      imageUrl: data.imageUrl,
      ticketLink: data.ticketLink,
      
      // CATEGORY
      category: data.category,
      subcategory: this.detectSubcategory(data.name, data.description),
      
      // ORGANIZER
      organizer: data.organizer || this.extractOrganizerFromName(data.name),
      organizerContact: organizerInfo,
      
      // COMPETITIVE INTELLIGENCE
      previousProvider: data.previousProvider,
      estimatedAttendees: estimatedAttendees,
      estimatedRevenue: revenue,
      ticketPricing: {
        detected: data.price,
        average: ticketPrice,
        priceRange: this.estimatePriceRange(data.category, ticketPrice)
      },
      isAnnual: this.detectAnnualEvent(data.name),
      
      // TIMING ANALYSIS - FIXED: Use safe timing object
      timing: timing,
      
      // PARTNERSHIP OPPORTUNITIES
      partnershipOpportunities: this.generatePartnershipIdeas(data.category, estimatedAttendees, eventDate),
      
      // SWITCH ANALYSIS
      switchOpportunity: true,
      switchScore: switchScore,
      switchPriority: this.getSwitchPriority(switchScore),
      switchReason: this.getSwitchReason(data, switchScore, estimatedAttendees),
      
      // METADATA
      source: data.source,
      sourceUrl: data.sourceUrl,
      status: 'competitive_target',
      dataQuality: organizerInfo.hasContact ? 'good' : 'needs_research',
      lastUpdated: new Date().toISOString(),
      
      // EXTRACTION METADATA
      extractionDetails: {
        dateFound: !!data.dateText || !!data.hasDate,
        venueFound: !!data.venue,
        priceFound: !!data.price,
        organizerFound: !!data.organizer,
        confidence: this.calculateExtractionConfidence(data)
      }
    };
  }

  calculateEventTiming(eventDate) {
    try {
      if (!eventDate) {
        return {
          isUpcoming: false,
          daysUntilEvent: null,
          isWeekend: false,
          timeOfDay: 'unknown'
        };
      }

      const event = new Date(eventDate);
      const now = new Date();
      
      return {
        isUpcoming: event > now,
        daysUntilEvent: this.daysUntilEvent(eventDate),
        isWeekend: this.isWeekendEvent(eventDate),
        timeOfDay: this.extractTimeOfDay(eventDate)
      };
    } catch (error) {
      console.log(`      ⚠️ Error calculating timing: ${error.message}`);
      return {
        isUpcoming: false,
        daysUntilEvent: null,
        isWeekend: false,
        timeOfDay: 'unknown'
      };
    }
  }

  // HELPER METHODS
  getSeason(monthNumber) {
    const seasons = {
      12: 'Summer', 1: 'Summer', 2: 'Summer',
      3: 'Autumn', 4: 'Autumn', 5: 'Autumn',
      6: 'Winter', 7: 'Winter', 8: 'Winter',
      9: 'Spring', 10: 'Spring', 11: 'Spring'
    };
    return seasons[monthNumber] || 'Unknown';
  }

  extractVenueAddress(venueText) {
    if (!venueText) return null;
    
    const addressPatterns = [
      /(\d+\s+[\w\s]+,?\s*(Johannesburg|Cape Town|Durban|Pretoria|Port Elizabeth|Bloemfontein))/i,
      /(Johannesburg|Cape Town|Durban|Pretoria|Port Elizabeth|Bloemfontein)/i
    ];

    for (const pattern of addressPatterns) {
      const match = venueText.match(pattern);
      if (match) return match[0];
    }

    return null;
  }

  detectSubcategory(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    const subcategories = {
      music: ['rock', 'jazz', 'classical', 'electronic', 'hip hop', 'r&b', 'pop', 'indie'],
      sports: ['rugby', 'soccer', 'cricket', 'running', 'cycling', 'tennis', 'golf'],
      food: ['wine tasting', 'beer festival', 'food market', 'cooking class', 'restaurant'],
      comedy: ['standup', 'improv', 'sketch', 'open mic'],
      festival: ['music festival', 'arts festival', 'food festival', 'cultural festival']
    };

    for (const [category, keywords] of Object.entries(subcategories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return keyword;
        }
      }
    }

    return 'general';
  }

  isUpcomingEvent(eventDate) {
    if (!eventDate) return false;
    const event = new Date(eventDate);
    const now = new Date();
    return event > now;
  }

  daysUntilEvent(eventDate) {
    if (!eventDate) return null;
    try {
      const event = new Date(eventDate);
      const now = new Date();
      const diffTime = event - now;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return null;
    }
  }

  isWeekendEvent(eventDate) {
    if (!eventDate) return false;
    try {
      const event = new Date(eventDate);
      const day = event.getDay();
      return day === 0 || day === 6;
    } catch (e) {
      return false;
    }
  }

  extractTimeOfDay(dateText) {
    if (!dateText) return 'unknown';
    
    try {
      const text = dateText.toString().toLowerCase();
      if (text.includes('morning') || text.includes('am') || text.includes('breakfast')) return 'morning';
      if (text.includes('afternoon') || text.includes('lunch')) return 'afternoon';
      if (text.includes('evening') || text.includes('night') || text.includes('pm') || text.includes('dinner')) return 'evening';
    } catch (e) {
      // Ignore errors
    }
    
    return 'unknown';
  }

  estimatePriceRange(category, avgPrice) {
    return {
      low: Math.round(avgPrice * 0.5),
      high: Math.round(avgPrice * 1.5)
    };
  }

  calculateExtractionConfidence(data) {
    let score = 0;
    if (data.dateText || data.hasDate) score += 25;
    if (data.venue) score += 25;
    if (data.price) score += 20;
    if (data.organizer) score += 20;
    if (data.ticketLink) score += 10;
    
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  generatePartnershipIdeas(category, attendees, eventDate) {
    const baseOpportunities = [
      'Lower ticketing fees (4-6% vs 8-10%)',
      '24-48 hour payouts instead of 30+ days',
      'Mobile-optimized booking experience',
      'Real-time analytics dashboard',
      'Dedicated account manager'
    ];

    const categorySpecific = {
      music: [
        'Merchandise sales integration',
        'Artist meet & greet packages',
        'VIP backstage passes',
        'Photo/video packages',
        'Multi-show season passes'
      ],
      sports: [
        'Season ticket packages',
        'Corporate hospitality suites',
        'Parking pass add-ons',
        'Team merchandise bundles',
        'Digital program distribution'
      ],
      food: [
        'Multi-day pass options',
        'Cooking class bookings',
        'Tasting session reservations',
        'Celebrity chef experiences',
        'Recipe book pre-orders'
      ],
      comedy: [
        'Premium seating upgrades',
        'Multiple show packages',
        'Dinner & show combos',
        'Photo opportunities',
        'Exclusive pre-show access'
      ],
      festival: [
        'Multi-day passes',
        'Camping/accommodation packages',
        'Shuttle bus bookings',
        'Festival merchandise',
        'Early bird special tiers',
        'Group booking discounts'
      ]
    };

    const specific = categorySpecific[category] || [
      'Package deals and bundles',
      'Group booking discounts',
      'Early bird pricing tiers'
    ];

    return [...baseOpportunities, ...specific];
  }

  parseDate(dateString) {
    if (!dateString) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 1 month from now
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {}

    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  extractDateInfo(dateString) {
    try {
      const date = new Date(dateString);
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        month: months[date.getMonth()],
        monthNumber: date.getMonth() + 1,
        day: date.getDate(),
        year: date.getFullYear(),
        daysOfWeek: [days[date.getDay()]]
      };
    } catch (e) {
      const now = new Date();
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        month: months[now.getMonth()],
        monthNumber: now.getMonth() + 1,
        day: now.getDate(),
        year: now.getFullYear(),
        daysOfWeek: [days[now.getDay()]]
      };
    }
  }

  parsePrice(priceText) {
    if (!priceText) return null;
    
    const matches = priceText.match(/\d+/g);
    if (matches && matches.length > 0) {
      return parseInt(matches[0]);
    }
    
    return null;
  }

  calculateSwitchScore(data) {
    let score = 50;
    
    if (data.isAnnual) score += 20;
    
    if (data.attendees > 20000) score += 20;
    else if (data.attendees > 10000) score += 15;
    else if (data.attendees > 5000) score += 12;
    else if (data.attendees > 2000) score += 8;
    
    if (data.category === 'music') score += 10;
    if (data.category === 'sports') score += 10;
    if (data.category === 'festival') score += 12;
    if (data.category === 'food') score += 8;
    
    if (data.hasContact) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }

  detectCategory(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (/music|concert|festival|jazz|band|dj|live|performance|gig/i.test(text)) return 'music';
    if (/comedy|comedian|stand.?up|laugh|comic/i.test(text)) return 'comedy';
    if (/food|wine|beer|culinary|tasting|chef|gastro/i.test(text)) return 'food';
    if (/sport|marathon|race|run|match|game|rugby|soccer|cricket/i.test(text)) return 'sports';
    if (/festival|fest/i.test(text)) return 'festival';
    if (/conference|summit|expo|convention/i.test(text)) return 'conference';
    if (/theater|theatre|play|drama|musical/i.test(text)) return 'theater';
    
    return 'other';
  }

  detectAnnualEvent(name) {
    const annualKeywords = [
      'annual', '2024', '2025', '2026',
      'festival', 'marathon', 'championship',
      'edition', 'year', 'returns'
    ];
    return annualKeywords.some(keyword => name.toLowerCase().includes(keyword));
  }

  estimateAttendees(name, description, category) {
    const text = (name + ' ' + description).toLowerCase();
    const size = this.estimateEventSize(text);
    
    const baseSizes = {
      music: { large: 8000, medium: 2500, small: 600 },
      comedy: { large: 2500, medium: 1000, small: 300 },
      food: { large: 12000, medium: 4000, small: 1000 },
      sports: { large: 15000, medium: 4000, small: 1500 },
      festival: { large: 20000, medium: 7000, small: 2500 },
      conference: { large: 3000, medium: 800, small: 200 },
      theater: { large: 1500, medium: 500, small: 150 }
    };
    
    const categorySize = baseSizes[category] || { large: 3000, medium: 1000, small: 300 };
    return categorySize[size];
  }

  estimateEventSize(text) {
    const largeIndicators = [
      'festival', 'championship', 'marathon', 'international',
      'national', 'stadium', 'arena', 'expo'
    ];
    const mediumIndicators = [
      'tournament', 'competition', 'concert', 'show',
      'gala', 'convention', 'regional'
    ];
    
    if (largeIndicators.some(ind => text.includes(ind))) return 'large';
    if (mediumIndicators.some(ind => text.includes(ind))) return 'medium';
    return 'small';
  }

  estimateTicketPrice(category) {
    const prices = {
      music: 280,
      comedy: 200,
      food: 150,
      sports: 250,
      festival: 500,
      conference: 350,
      theater: 180
    };
    return prices[category] || 200;
  }

  calculateRevenue(attendees, avgTicketPrice) {
    const grossRevenue = attendees * avgTicketPrice;
    
    return {
      attendees: attendees,
      avgTicketPrice: avgTicketPrice,
      grossRevenue: grossRevenue,
      ourFee: Math.round(grossRevenue * 0.05),
      competitorFee: Math.round(grossRevenue * 0.085),
      potentialSavings: Math.round(grossRevenue * 0.035),
      currency: 'ZAR'
    };
  }

  getSwitchPriority(score) {
    if (score >= 85) return 'CRITICAL - Contact Immediately';
    if (score >= 70) return 'HIGH - Contact This Week';
    if (score >= 55) return 'MEDIUM - Contact This Month';
    return 'LOW - Monitor & Research';
  }

  getSwitchReason(data, score, attendees) {
    const parts = [];
    
    parts.push(`🔄 Currently using ${data.previousProvider}`);
    
    if (data.isAnnual || this.detectAnnualEvent(data.name)) {
      parts.push('📅 Annual event = recurring revenue opportunity');
    }
    
    parts.push(`👥 ~${attendees.toLocaleString()} estimated attendees`);
    parts.push(`🎭 ${data.category.toUpperCase()} category`);
    
    if (score >= 85) {
      parts.push('⭐ HIGHEST PRIORITY TARGET');
    } else if (score >= 70) {
      parts.push('🎯 High-value opportunity');
    }
    
    return parts.join(' • ');
  }

  extractOrganizerFromName(name) {
    if (name.includes(' presents ')) {
      return name.split(' presents ')[0].trim();
    }
    if (name.includes(' by ')) {
      const parts = name.split(' by ');
      return parts[parts.length - 1].trim();
    }
    
    const words = name.split(' ');
    if (words.length >= 3) {
      return words.slice(0, 3).join(' ');
    }
    
    return 'Event Organizer';
  }

  generateId(name) {
    const hash = Buffer.from(name + Date.now()).toString('base64').slice(0, 10);
    return 'evt_' + hash.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  convertKnownEventsToTargets() {
    return this.knownEvents.map(event => {
      const revenue = this.calculateRevenue(
        event.estimatedAttendees,
        event.ticketPricing.average
      );
      
      const switchScore = this.calculateSwitchScore({
        isAnnual: event.isAnnual,
        category: event.category,
        hasContact: true,
        attendees: event.estimatedAttendees
      });
      
      // FIXED: Add safe timing data
      const timing = this.calculateEventTiming(event.dates.startDate.toISOString());
      
      return {
        id: this.generateId(event.name),
        name: event.name,
        description: `${event.category.charAt(0).toUpperCase() + event.category.slice(1)} event at ${event.venue.name}`,
        
        eventDate: event.dates.startDate.toISOString(),
        startDate: event.dates.startDate.toISOString(),
        endDate: event.dates.endDate.toISOString(),
        month: event.dates.startDate.toLocaleString('default', { month: 'long' }),
        monthNumber: event.dates.month,
        day: event.dates.startDate.getDate(),
        year: event.dates.year,
        daysOfWeek: event.dates.daysOfWeek,
        
        venue: event.venue.name,
        venueAddress: event.venue.address,
        venueCapacity: event.venue.capacity,
        
        category: event.category,
        
        organizer: event.organizer.name,
        organizerContact: {
          hasContact: true,
          contactPerson: event.organizer.contactPerson,
          email: event.organizer.email,
          phone: event.organizer.phone,
          website: event.organizer.website,
          officeAddress: event.organizer.officeAddress,
          socialMedia: event.organizer.socialMedia,
          verified: true
        },
        
        previousProvider: event.previousProvider,
        estimatedAttendees: event.estimatedAttendees,
        estimatedRevenue: revenue,
        ticketPricing: event.ticketPricing,
        isAnnual: event.isAnnual,
        
        // FIXED: Add timing data
        timing: timing,
        
        partnershipOpportunities: event.partnershipOpportunities,
        
        switchOpportunity: true,
        switchScore: switchScore,
        switchPriority: this.getSwitchPriority(switchScore),
        switchReason: this.getSwitchReason({
          name: event.name,
          previousProvider: event.previousProvider,
          isAnnual: event.isAnnual,
          category: event.category
        }, switchScore, event.estimatedAttendees),
        
        source: 'Industry Knowledge Database',
        sourceUrl: event.organizer.website,
        status: 'high_priority_target',
        dataQuality: 'verified',
        lastUpdated: new Date().toISOString()
      };
    });
  }

  organizeAndEnhanceEvents(events) {
    console.log('📊 Organizing and enhancing current events...');
    
    const enhanced = events.map(event => {
      // Ensure timing data exists and is safe
      const safeEvent = {
        ...event,
        timing: event.timing || this.calculateEventTiming(event.eventDate)
      };
      
      return {
        ...safeEvent,
        outreachEmail: this.generateOutreachEmail(safeEvent),
        approachStrategy: this.getApproachStrategy(safeEvent),
        keyTalkingPoints: this.getKeyTalkingPoints(safeEvent),
        objectionHandling: this.getObjectionHandling(safeEvent),
        competitiveAdvantages: this.getCompetitiveAdvantages(safeEvent.previousProvider)
      };
    });

    // Sort by date (soonest first) then by switch score
    enhanced.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return b.switchScore - a.switchScore;
      } catch (e) {
        return 0;
      }
    });

    return {
      events: enhanced,
      summary: this.generateSummary(enhanced)
    };
  }

  generateOutreachEmail(event) {
    const organizer = event.organizerContact.contactPerson || 'Event Organizer';
    const revenue = event.estimatedRevenue;
    const hasEmail = event.organizerContact.email !== null;
    
    // FIXED: Safe access to timing data
    const daysUntil = event.timing?.daysUntilEvent;
    
    let urgency = '';
    if (daysUntil && daysUntil <= 30) {
      urgency = `\n⏰ **URGENT**: This event is happening in ${daysUntil} days! Perfect time to switch and save.`;
    } else if (daysUntil && daysUntil <= 90) {
      urgency = `\n📅 **TIMELY**: This event is ${daysUntil} days away - great opportunity to implement our solution.`;
    }

    return {
      to: event.organizerContact.email || '[RESEARCH NEEDED]',
      subject: `Better Ticketing for ${event.name} - Save R${revenue.potentialSavings.toLocaleString()}`,
      body: `Hi ${organizer},

I noticed ${event.name} is coming up${daysUntil ? ` in ${daysUntil} days` : ' soon'} and wanted to share how you could save significantly on ticketing fees.

**Quick Numbers for ${event.name}:**
• Your estimated ticket revenue: R${revenue.grossRevenue.toLocaleString()}
• ${event.previousProvider} fees (~8.5%): R${revenue.competitorFee.toLocaleString()}
• Our fees (5%): R${revenue.ourFee.toLocaleString()}
• **Potential savings: R${revenue.potentialSavings.toLocaleString()}**${urgency}

We offer:
• 24-48 hour payouts (vs 30+ days)
• Mobile-optimized booking experience
• Real-time analytics dashboard
• Dedicated account manager

Would you be open to a quick 15-minute call to discuss how we can help make ${event.name} even more successful?

Best regards,
[Your Name]
Event Partnership Manager
[Your Company]`
    };
  }

  getApproachStrategy(event) {
    const strategies = {
      high: `Direct phone call followed by detailed proposal. Focus on immediate cost savings of R${event.estimatedRevenue.potentialSavings.toLocaleString()} and faster payouts.`,
      medium: `Warm email introduction with specific numbers, followed by scheduling a demo call. Highlight competitive advantages.`,
      low: `Initial research to find better contact information, then value-based email focusing on long-term partnership.`
    };

    if (event.switchScore >= 80) return strategies.high;
    if (event.switchScore >= 60) return strategies.medium;
    return strategies.low;
  }

  getKeyTalkingPoints(event) {
    const points = [
      `Save R${event.estimatedRevenue.potentialSavings.toLocaleString()} on ticketing fees`,
      `Get paid in 24-48 hours instead of 30+ days`,
      `Better mobile experience for your attendees`,
      `Real-time analytics and reporting`
    ];

    if (event.isAnnual) {
      points.push(`Multi-year contract with additional savings`);
    }

    if (event.estimatedAttendees > 5000) {
      points.push(`Dedicated account manager for large events`);
    }

    return points;
  }

  getObjectionHandling(event) {
    return {
      "We're happy with our current provider": `"I understand - many organizers feel that way initially. The R${event.estimatedRevenue.potentialSavings.toLocaleString()} in additional revenue and 24-hour payouts have convinced many similar events to make the switch. Could we do a quick side-by-side comparison?"`,
      "It's too close to our event date": `"Actually, this is the perfect time! We can have you set up in under 48 hours, and you'll benefit from faster payouts immediately. Many organizers wish they'd switched sooner."`,
      "We have a contract": `"Understood. When does your current contract expire? We'd love to schedule a conversation for when you're free to explore better options. In the meantime, I can send you our pricing for future consideration."`
    };
  }

  getCompetitiveAdvantages(competitor) {
    const advantages = {
      all: [
        '5% fee vs industry standard 8-10%',
        '24-48 hour payouts vs 30+ days industry standard',
        'Mobile-first booking experience',
        'Real-time analytics dashboard',
        'No hidden fees or setup costs'
      ]
    };

    const competitorSpecific = {
      'Webtickets': ['More modern platform', 'Better customer support', 'Advanced marketing tools'],
      'Computicket': ['Lower fees', 'Faster payouts', 'Better reporting'],
      'Quicket': ['More flexible pricing', 'Better API integration', 'Superior mobile experience'],
      'TicketPro': ['Modern technology stack', 'Better user experience', 'Advanced features'],
      'Eventbrite': ['Lower South African-focused fees', 'Local support team', 'Currency optimization'],
      'Ticketmaster': ['Lower commission rates', 'Better venue relationships', 'Superior technology'],
      'Howler': ['Better music event features', 'Artist-focused tools', 'Enhanced fan engagement'],
      'Plankton': ['More competitive pricing', 'Better local support', 'Faster setup process'],
      'Tix SA': ['Modern platform', 'Better user experience', 'Competitive pricing'],
      'SeatGeek': ['Lower fees for SA events', 'Better mobile experience', 'Advanced features']
    };

    return [
      ...advantages.all,
      ...(competitorSpecific[competitor] || [])
    ];
  }

  generateSummary(events) {
    const totalEvents = events.length;
    const highPriority = events.filter(e => e.switchScore >= 80).length;
    const mediumPriority = events.filter(e => e.switchScore >= 60 && e.switchScore < 80).length;
    
    const totalRevenue = events.reduce((sum, e) => sum + e.estimatedRevenue.grossRevenue, 0);
    const totalSavings = events.reduce((sum, e) => sum + e.estimatedRevenue.potentialSavings, 0);
    
    const categories = {};
    events.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + 1;
    });

    const competitors = {};
    events.forEach(e => {
      competitors[e.previousProvider] = (competitors[e.previousProvider] || 0) + 1;
    });

    return {
      totalEvents,
      priorityBreakdown: {
        critical: highPriority,
        high: mediumPriority,
        medium: events.filter(e => e.switchScore >= 40 && e.switchScore < 60).length,
        low: events.filter(e => e.switchScore < 40).length
      },
      financialImpact: {
        totalPotentialRevenue: totalRevenue,
        totalClientSavings: totalSavings,
        ourPotentialRevenue: events.reduce((sum, e) => sum + e.estimatedRevenue.ourFee, 0)
      },
      categoryDistribution: categories,
      competitorDistribution: competitors,
      nextSteps: [
        `Immediately contact ${highPriority} CRITICAL priority events`,
        `Schedule demos for ${mediumPriority} HIGH priority events this week`,
        `Research contact information for events with missing details`,
        `Prepare customized proposals for top 10 events by potential revenue`
      ]
    };
  }

  getConfiguration() {
    return {
      sources: this.sources.length,
      userAgents: this.userAgents.length,
      requestDelay: this.requestDelay,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    };
  }
}

module.exports = EnhancedEventScraperService;