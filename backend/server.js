    const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Mock Data
let events = [
  {
    event_id: '1',
    event_name: 'Summer Music Festival',
    event_description: 'Annual summer music festival featuring various artists',
    start_date: '2025-11-15T10:00:00',
    end_date: '2025-11-16T22:00:00',
    location: 'Central Park, New York',
    event_status: 'VALIDATED',
    current_attendees: 150,
    max_attendees: 200,
    price: 50
  },
  {
    event_id: '2',
    event_name: 'Tech Conference 2025',
    event_description: 'Latest trends in technology and innovation',
    start_date: '2025-12-20T09:00:00',
    end_date: '2025-12-21T18:00:00',
    location: 'Convention Center',
    event_status: 'VALIDATED',
    current_attendees: 80,
    max_attendees: 100,
    price: 75
  },
  {
    event_id: '3',
    event_name: 'Food & Wine Expo',
    event_description: 'Culinary delights and wine tastings from around the world',
    start_date: '2025-11-01T12:00:00',
    end_date: '2025-11-01T20:00:00',
    location: 'Grand Hotel Ballroom',
    event_status: 'VALIDATED',
    current_attendees: 45,
    max_attendees: 150,
    price: 35
  }
];

let customers = [];
let tickets = [];

// Generate ticket code
const generateTicketCode = () => {
  return `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// Generate QR code (mock)
const generateQRCode = () => {
  return `QR-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
};

// Routes

// Get all events
app.get('/zi_events', (req, res) => {
  try {
    // Filter by date if needed
    const { $filter, $orderby } = req.query;
    let filteredEvents = [...events];

    // Simple date filtering (you can enhance this)
    if ($filter && $filter.includes('end_date ge')) {
      const today = new Date().toISOString().split('T')[0];
      filteredEvents = events.filter(e => e.end_date >= today);
    }

    res.json({ d: { results: filteredEvents } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event
app.get('/zi_events/:id', (req, res) => {
  const event = events.find(e => e.event_id === req.params.id);
  if (event) {
    res.json({ d: event });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

// Customer registration
app.post('/zi_customer_faces', (req, res) => {
  try {
    const customer = {
      customer_id: Date.now().toString(),
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      account_status: 'ACTIVE',
      profile_picture: null
    };
    customers.push(customer);
    res.json({ d: customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer login (get customer by ID)
app.get('/zi_customer_faces', (req, res) => {
  const { $filter } = req.query;
  
  if ($filter && $filter.includes('customer_id')) {
    // Extract customer_id from filter
    const match = $filter.match(/customer_id eq '([^']+)'/);
    if (match) {
      const customerId = match[1];
      const customer = customers.find(c => c.customer_id === customerId);
      
      if (customer) {
        res.json({ d: { results: [customer] } });
      } else {
        // Create demo user for any login attempt
        const demoCustomer = {
          customer_id: customerId,
          first_name: 'Demo',
          last_name: 'User',
          email: `${customerId}@demo.com`,
          phone_number: '+1234567890',
          account_status: 'ACTIVE'
        };
        customers.push(demoCustomer);
        res.json({ d: { results: [demoCustomer] } });
      }
    } else {
      res.json({ d: { results: [] } });
    }
  } else {
    res.json({ d: { results: customers } });
  }
});

// Purchase ticket
app.post('/zi_tickets', (req, res) => {
  try {
    const ticket = {
      ticket_id: Date.now().toString(),
      event_id: req.body.event_id,
      customer_id: req.body.customer_id,
      ticket_code: generateTicketCode(),
      qr_code: generateQRCode(),
      ticket_status: 'PURCHASED',
      purchase_date: new Date().toISOString(),
      price: req.body.price || 50,
      currency: req.body.currency || 'USD',
      validation_date: null
    };

    // Update event attendees
    const event = events.find(e => e.event_id === req.body.event_id);
    if (event) {
      event.current_attendees += 1;
    }

    tickets.push(ticket);
    res.json({ d: ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer tickets
app.get('/zi_tickets', (req, res) => {
  const { $filter, $expand } = req.query;
  
  if ($filter && $filter.includes('customer_id')) {
    const match = $filter.match(/customer_id eq '([^']+)'/);
    if (match) {
      const customerId = match[1];
      let customerTickets = tickets.filter(t => t.customer_id === customerId);
      
      // Expand event data if requested
      if ($expand && $expand.includes('_event')) {
        customerTickets = customerTickets.map(ticket => ({
          ...ticket,
          _event: events.find(e => e.event_id === ticket.event_id)
        }));
      }
      
      res.json({ d: { results: customerTickets } });
    } else {
      res.json({ d: { results: [] } });
    }
  } else {
    res.json({ d: { results: tickets } });
  }
});

// Validate ticket (scan)
app.post('/zi_tickets/:id/validate', (req, res) => {
  const ticket = tickets.find(t => t.ticket_id === req.params.id || t.ticket_code === req.params.id);
  
  if (ticket) {
    if (ticket.ticket_status === 'VALIDATED') {
      res.status(400).json({ error: 'Ticket already validated' });
    } else {
      ticket.ticket_status = 'VALIDATED';
      ticket.validation_date = new Date().toISOString();
      res.json({ d: ticket });
    }
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock backend is running' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Mock backend server running on http://localhost:${PORT}`);
  console.log(`Test it: http://localhost:${PORT}/health`);
});