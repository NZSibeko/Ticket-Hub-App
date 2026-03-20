const admin = require('firebase-admin');
const cron = require('node-cron');
const { dbOperations } = require('../database');

// Initialize Firebase Admin (you'll need to add your service account JSON)
// admin.initializeApp({
//   credential: admin.credential.cert(require('./firebase-service-account.json'))
// });

// Store device tokens in database (add this table to database.js)
// CREATE TABLE device_tokens (
//   token_id TEXT PRIMARY KEY,
//   customer_id TEXT,
//   device_token TEXT UNIQUE,
//   platform TEXT,
//   created_at TEXT DEFAULT CURRENT_TIMESTAMP
// )

const NotificationService = {
  // Send notification to single user
  async sendToUser(customerId, notification) {
    try {
      const tokens = await dbOperations.all(
        'SELECT device_token FROM device_tokens WHERE customer_id = ?',
        [customerId]
      );

      if (tokens.length === 0) return;

      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        tokens: tokens.map(t => t.device_token)
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('Notification sent:', response.successCount, 'success');
      return response;
    } catch (error) {
      console.error('Notification error:', error);
    }
  },

  // Send event reminder
  async sendEventReminder(eventId) {
    try {
      const event = await dbOperations.get(
        'SELECT * FROM events WHERE event_id = ?',
        [eventId]
      );

      const tickets = await dbOperations.all(
        'SELECT DISTINCT customer_id FROM tickets WHERE event_id = ? AND ticket_status != "REFUNDED"',
        [eventId]
      );

      for (const ticket of tickets) {
        await this.sendToUser(ticket.customer_id, {
          title: 'Event Reminder',
          body: `${event.event_name} is starting soon! Don't forget to attend.`,
          data: {
            type: 'event_reminder',
            eventId: event.event_id
          }
        });
      }
    } catch (error) {
      console.error('Event reminder error:', error);
    }
  },

  // Send ticket purchase confirmation
  async sendTicketConfirmation(customerId, ticketCode, eventName) {
    return this.sendToUser(customerId, {
      title: 'Ticket Purchased!',
      body: `Your ticket for ${eventName} has been confirmed. Ticket code: ${ticketCode}`,
      data: {
        type: 'ticket_confirmation',
        ticketCode
      }
    });
  },

  // Schedule event reminders (run this as a cron job)
  scheduleReminders() {
    // Check every hour for events starting in 24 hours
    cron.schedule('0 * * * *', async () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);

      const events = await dbOperations.all(
        `SELECT * FROM events 
         WHERE start_date BETWEEN datetime('now') AND datetime('now', '+25 hours')
         AND event_status = 'VALIDATED'`
      );

      for (const event of events) {
        await this.sendEventReminder(event.event_id);
      }
    });

    console.log('Notification scheduler started');
  },

  // Register device token
  async registerDevice(customerId, deviceToken, platform) {
    try {
      const tokenId = require('uuid').v4();
      await dbOperations.run(
        'INSERT OR REPLACE INTO device_tokens (token_id, customer_id, device_token, platform) VALUES (?, ?, ?, ?)',
        [tokenId, customerId, deviceToken, platform]
      );
    } catch (error) {
      console.error('Device registration error:', error);
    }
  }
};

module.exports = NotificationService;