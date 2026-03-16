const express = require('express');
const router = express.Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? require('stripe')(stripeSecret) : null;
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { dbOperations } = require('../database');

const NODE_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = NODE_ENV === 'production';
// Enable test mode only when explicitly requested and not in production.
const TEST_MODE = !IS_PRODUCTION && String(process.env.PAYMENT_TEST_MODE || '').toLowerCase() === 'true';

console.log(`💳 Payment system initialized in ${TEST_MODE ? 'TEST' : 'PRODUCTION'} mode`);

const isMissingTableError = (error, tableName) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('no such table') && message.includes(String(tableName || '').toLowerCase());
};

const getTicketTypeSafely = async ({ ticketTypeId, ticketType, eventId }) => {
  try {
    if (ticketTypeId) {
      return await dbOperations.get(
        'SELECT * FROM event_ticket_types WHERE ticket_type_id = ? AND event_id = ?',
        [ticketTypeId, eventId]
      );
    }

    if (ticketType) {
      return await dbOperations.get(
        'SELECT * FROM event_ticket_types WHERE type = ? AND event_id = ?',
        [ticketType, eventId]
      );
    }

    return null;
  } catch (error) {
    if (isMissingTableError(error, 'event_ticket_types')) {
      console.warn('⚠️ event_ticket_types table missing; falling back to event-level ticket defaults');
      return null;
    }
    throw error;
  }
};

const updateTicketTypeInventorySafely = async ({ quantity, ticketTypeId }) => {
  if (!ticketTypeId) return { skipped: true };

  try {
    await dbOperations.run(
      'UPDATE event_ticket_types SET available_quantity = available_quantity - ? WHERE ticket_type_id = ?',
      [quantity, ticketTypeId]
    );
    return { skipped: false };
  } catch (error) {
    if (isMissingTableError(error, 'event_ticket_types')) {
      console.warn('⚠️ event_ticket_types table missing; skipping inventory update');
      return { skipped: true };
    }
    throw error;
  }
};

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    console.log('🔐 Create payment intent request:', req.body);
    
    const { amount, currency, eventId, customerId, ticketTypeId, quantity = 1 } = req.body;

    // Validation
    if (!amount || !currency || !eventId || !customerId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'currency', 'eventId', 'customerId']
      });
    }

    // TEST MODE: Skip Stripe, create a test payment intent
    if (TEST_MODE) {
      const paymentIntentId = `test_pi_${uuidv4()}`;
      const clientSecret = `test_secret_${uuidv4()}`;

      console.log('✅ TEST MODE: Payment intent created', {
        paymentIntentId,
        amount,
        currency,
        quantity
      });

      return res.json({
        success: true,
        clientSecret,
        paymentIntentId,
        testMode: true
      });
    }

    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe is not configured',
        details: 'Set STRIPE_SECRET_KEY to process live payments.'
      });
    }

    // PRODUCTION MODE: Use real Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        eventId,
        customerId,
        ticketTypeId: ticketTypeId || 'general',
        quantity: quantity.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      testMode: false
    });
  } catch (error) {
    console.error('❌ Payment intent error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to create payment intent'
    });
  }
});

// Confirm payment and create ticket - FIXED
router.post('/confirm-payment', async (req, res) => {
  try {
    console.log('🔐 Confirm payment request:', req.body);
    
    const { 
      paymentIntentId, 
      eventId, 
      customerId, 
      ticketTypeId,
      ticketType, 
      quantity = 1, 
      price,
      totalAmount,
      currency 
    } = req.body;

    // Validation
    if (!paymentIntentId || !eventId || !customerId || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['paymentIntentId', 'eventId', 'customerId', 'price']
      });
    }

    // TEST MODE: Skip Stripe verification
    if (TEST_MODE) {
      console.log('✅ TEST MODE: Simulating payment confirmation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      // PRODUCTION MODE: Verify payment with Stripe
      if (!stripe) {
        return res.status(500).json({
          error: 'Stripe is not configured',
          details: 'Set STRIPE_SECRET_KEY to verify payments.'
        });
      }
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({ error: 'Payment not completed' });
        }
      } catch (stripeError) {
        console.error('❌ Stripe verification failed:', stripeError);
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    // Get event
    const event = await dbOperations.get(
      'SELECT * FROM events WHERE event_id = ?',
      [eventId]
    );

    if (!event) {
      console.error('❌ Event not found:', eventId);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get ticket type - use ticketTypeId if provided, otherwise find by type name
    let ticketTypeData = await getTicketTypeSafely({ ticketTypeId, ticketType, eventId });

    // If no ticket type found, create a default one
    if (!ticketTypeData) {
      console.log('⚠️ Ticket type not found, using event default');
      const eventCapacity = Number(event.max_attendees || event.capacity || 0);
      const currentAttendees = Number(event.current_attendees || 0);
      ticketTypeData = {
        ticket_type_id: null,
        event_id: eventId,
        type: ticketType || 'general',
        price: price,
        quantity: eventCapacity,
        available_quantity: Math.max(0, eventCapacity - currentAttendees)
      };
    }

    // Check availability
    if (ticketTypeData.available_quantity < quantity) {
      return res.status(400).json({ 
        error: 'Not enough tickets available',
        available: ticketTypeData.available_quantity
      });
    }

    // Get customer details
    console.log('📋 Fetching customer:', customerId);
    const customer = await dbOperations.get(
      'SELECT * FROM customers WHERE customer_id = ?',
      [customerId]
    );

    if (!customer) {
      console.error('❌ Customer not found:', customerId);
      return res.status(404).json({ error: 'Customer not found' });
    }

    const tickets = [];

    // Create multiple tickets based on quantity
    for (let i = 0; i < quantity; i++) {
      const ticketId = uuidv4();
      const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const qrCode = `QR-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;

      console.log('🎫 Creating ticket:', { ticketId, ticketCode });

      // Insert ticket into database
      try {
        await dbOperations.run(
          `INSERT INTO tickets (
            ticket_id, event_id, customer_id, ticket_code, qr_code,
            ticket_type, quantity, unit_price, total_amount, price, currency,
            status, ticket_status, payment_status, payment_id,
            purchase_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'ACTIVE', 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
          [
            ticketId,
            eventId,
            customerId,
            ticketCode,
            qrCode,
            ticketTypeData.type,
            1,
            price,
            price,
            price,
            currency || 'ZAR',
            paymentIntentId
          ]
        );
        console.log('✅ Ticket inserted into database');
      } catch (dbError) {
        console.error('❌ Failed to insert ticket:', dbError);
        return res.status(500).json({ error: 'Failed to create ticket in database' });
      }

      const ticket = await dbOperations.get(
        'SELECT * FROM tickets WHERE ticket_id = ?',
        [ticketId]
      );

      tickets.push(ticket);
    }

    // Create payment record
    const paymentId = uuidv4();
    try {
      await dbOperations.run(
        `INSERT INTO payments (
          payment_id, ticket_id, customer_id, amount, currency,
          payment_method, status, payment_status, transaction_id, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', 'COMPLETED', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          paymentId, 
          tickets[0].ticket_id,
          customerId, 
          totalAmount || (price * quantity), 
          currency || 'ZAR', 
          TEST_MODE ? 'test' : 'stripe', 
          paymentIntentId
        ]
      );
      console.log('✅ Payment record created');
    } catch (dbError) {
      console.error('❌ Failed to create payment record:', dbError);
      // Continue anyway - ticket was created
    }

    // Update ticket type available quantity
    try {
      const inventoryUpdate = await updateTicketTypeInventorySafely({
        quantity,
        ticketTypeId: ticketTypeData.ticket_type_id,
      });
      if (inventoryUpdate.skipped) {
        console.log('ℹ️ Ticket type inventory update skipped');
      } else {
        console.log('✅ Ticket type quantity updated');
      }
    } catch (dbError) {
      console.error('⚠️ Failed to update ticket type quantity:', dbError);
      // Continue anyway
    }

    // Update event attendees
    try {
      await dbOperations.run(
        'UPDATE events SET current_attendees = current_attendees + ? WHERE event_id = ?',
        [quantity, eventId]
      );
      console.log('✅ Event attendees updated');
    } catch (dbError) {
      console.error('⚠️ Failed to update attendees:', dbError);
      // Continue anyway
    }

    // Generate QR code data for the first ticket
    let qrCodeUrl;
    try {
      const qrCodeData = JSON.stringify({
        ticketId: tickets[0].ticket_id,
        ticketCode: tickets[0].ticket_code,
        eventId: eventId,
        customerId: customerId,
        eventName: event.event_name,
        customerName: `${customer.first_name} ${customer.last_name}`,
        purchaseDate: new Date().toISOString()
      });

      qrCodeUrl = await QRCode.toDataURL(qrCodeData);
      console.log('✅ QR code generated');
    } catch (qrError) {
      console.error('⚠️ Failed to generate QR code:', qrError);
      qrCodeUrl = null;
    }

    console.log(`✅ ${TEST_MODE ? 'TEST' : 'PRODUCTION'}: ${quantity} ticket(s) created successfully`);

    res.json({ 
      success: true, 
      testMode: TEST_MODE,
      tickets: tickets,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process payment',
      message: error.message,
      details: TEST_MODE ? error.stack : undefined
    });
  }
});

// Get customer tickets - FIXED
router.get('/tickets/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('📋 Fetching tickets for customer:', customerId);

    if (!customerId || customerId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Valid customer ID is required'
      });
    }

    const tickets = await dbOperations.all(
      `SELECT 
        t.ticket_id,
        t.event_id,
        t.customer_id,
        t.ticket_code,
        t.qr_code,
        t.ticket_status,
        t.purchase_date,
        t.validation_date,
        t.price,
        t.currency,
        t.payment_status,
        COALESCE(t.ticket_type, 'general') as ticket_type,
        e.event_name, 
        e.start_date as event_date, 
        e.end_date, 
        e.location, 
        e.event_image as image_url
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.customer_id = ?
       ORDER BY t.purchase_date DESC`,
      [customerId]
    );

    console.log(`✅ Found ${tickets.length} tickets for customer ${customerId}`);

    res.json({
      success: true,
      tickets: tickets
    });
  } catch (error) {
    console.error('❌ Get tickets error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tickets',
      details: error.message 
    });
  }
});

// AI ticket verification (fraud-aware)
router.post('/tickets/verify', async (req, res) => {
  try {
    const { ticket_code, event_id, validator_id, source } = req.body || {};
    const ticketCode = String(ticket_code || '').trim();

    if (!ticketCode) {
      return res.json({ success: false, error: 'Ticket code is required', decision: { status: 'fraud', label: 'Missing ticket code', riskScore: 95, flags: ['Missing ticket code'] } });
    }

    const ticket = await dbOperations.get(
      `SELECT t.*, e.event_name, e.start_date as event_date, e.location,
              c.first_name, c.last_name
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.ticket_code = ?`,
      [ticketCode]
    );

    if (!ticket) {
      return res.json({
        success: false,
        error: 'Ticket not found',
        decision: { status: 'fraud', label: 'Ticket not found', riskScore: 98, flags: ['Ticket code not in registry'] }
      });
    }

    const flags = [];
    let status = 'approved';
    let label = 'Entry approved';
    let riskScore = 5;

    if (ticket.ticket_status === 'VALIDATED') {
      status = 'duplicate';
      label = 'QR already used';
      riskScore = 72;
      flags.push('Ticket already validated');
    }

    if (ticket.ticket_status === 'CANCELLED' || ticket.ticket_status === 'REFUNDED') {
      status = 'fraud';
      label = 'Ticket invalidated';
      riskScore = 90;
      flags.push('Ticket cancelled/refunded');
    }

    if (event_id && String(event_id) !== String(ticket.event_id)) {
      status = status === 'approved' ? 'review' : status;
      label = status === 'review' ? 'Event mismatch' : label;
      riskScore = Math.max(riskScore, 60);
      flags.push('Event mismatch');
    }

    if (status === 'approved') {
      await dbOperations.run(
        'UPDATE tickets SET ticket_status = ?, validation_date = CURRENT_TIMESTAMP WHERE ticket_code = ?',
        ['VALIDATED', ticketCode]
      );
    }

    try {
      await dbOperations.run(
        `INSERT INTO ticket_scans (ticket_code, event_id, validator_id, source, status, scanned_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [ticketCode, ticket.event_id, validator_id || null, source || 'scanner', status]
      );
    } catch (scanError) {
      // table might not exist yet; ignore
    }

    return res.json({
      success: status === 'approved',
      ticket: {
        ...ticket,
        ticket_status: status === 'approved' ? 'VALIDATED' : ticket.ticket_status,
        validation_date: status === 'approved' ? new Date() : ticket.validation_date,
      },
      decision: { status, label, riskScore, flags }
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify ticket' });
  }
});

// Validate ticket (legacy scanner)
router.post('/tickets/:ticketCode/validate', async (req, res) => {
  try {
    const { ticketCode } = req.params;

    const ticket = await dbOperations.get(
      `SELECT t.*, e.event_name, e.start_date as event_date, e.location,
              c.first_name, c.last_name
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.ticket_code = ?`,
      [ticketCode]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.ticket_status === 'VALIDATED') {
      return res.status(400).json({ 
        error: 'Ticket already used',
        validatedAt: ticket.validation_date
      });
    }

    if (ticket.ticket_status === 'CANCELLED' || ticket.ticket_status === 'REFUNDED') {
      return res.status(400).json({ error: 'Ticket has been cancelled' });
    }

    await dbOperations.run(
      'UPDATE tickets SET ticket_status = ?, validation_date = CURRENT_TIMESTAMP WHERE ticket_code = ?',
      ['VALIDATED', ticketCode]
    );

    console.log('✅ Ticket validated:', ticketCode);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        ticket_status: 'VALIDATED',
        validation_date: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({ error: 'Failed to validate ticket' });
  }
});

// Process refund
router.post('/refund', async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await dbOperations.get(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticketId]
    );

    if (!ticket || !ticket.payment_id) {
      return res.status(404).json({ error: 'Ticket or payment not found' });
    }

    if (TEST_MODE) {
      console.log('✅ TEST MODE: Simulating refund...');
    } else {
      if (!stripe) {
        return res.status(500).json({
          error: 'Stripe is not configured',
          details: 'Set STRIPE_SECRET_KEY to process refunds.'
        });
      }
      const refund = await stripe.refunds.create({
        payment_intent: ticket.payment_id
      });
    }

    await dbOperations.run(
      'UPDATE tickets SET ticket_status = ?, payment_status = ? WHERE ticket_id = ?',
      ['REFUNDED', 'REFUNDED', ticketId]
    );

    await dbOperations.run(
      'UPDATE events SET current_attendees = current_attendees - 1 WHERE event_id = ?',
      [ticket.event_id]
    );

    res.json({ 
      success: true, 
      testMode: TEST_MODE,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('❌ Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
