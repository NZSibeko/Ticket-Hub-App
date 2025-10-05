const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');
const { v4: uuidv4 } = require('uuid');
const { dbOperations } = require('../database');

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, eventId, customerId } = req.body;

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        eventId,
        customerId
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment and create ticket
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, eventId, customerId, price, currency } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Create ticket
    const ticketId = uuidv4();
    const ticketCode = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const qrCode = `QR-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;

    await dbOperations.run(
      `INSERT INTO tickets (ticket_id, event_id, customer_id, ticket_code, qr_code, 
       price, currency, ticket_status, payment_status, payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PURCHASED', 'COMPLETED', ?)`,
      [ticketId, eventId, customerId, ticketCode, qrCode, price, currency, paymentIntentId]
    );

    // Create payment record
    const paymentId = uuidv4();
    await dbOperations.run(
      `INSERT INTO payments (payment_id, ticket_id, customer_id, amount, currency, 
       payment_method, payment_status, transaction_id)
       VALUES (?, ?, ?, ?, ?, 'stripe', 'COMPLETED', ?)`,
      [paymentId, ticketId, customerId, price, currency, paymentIntentId]
    );

    // Update event attendees
    await dbOperations.run(
      'UPDATE events SET current_attendees = current_attendees + 1 WHERE event_id = ?',
      [eventId]
    );

    const ticket = await dbOperations.get(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticketId]
    );

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Process refund
router.post('/refund', async (req, res) => {
  try {
    const { ticketId } = req.body;

    // Get ticket and payment info
    const ticket = await dbOperations.get(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticketId]
    );

    if (!ticket || !ticket.payment_id) {
      return res.status(404).json({ error: 'Ticket or payment not found' });
    }

    // Create refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: ticket.payment_id
    });

    // Update ticket status
    await dbOperations.run(
      'UPDATE tickets SET ticket_status = ?, payment_status = ? WHERE ticket_id = ?',
      ['REFUNDED', 'REFUNDED', ticketId]
    );

    // Update event attendees
    await dbOperations.run(
      'UPDATE events SET current_attendees = current_attendees - 1 WHERE event_id = ?',
      [ticket.event_id]
    );

    res.json({ success: true, refund });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;