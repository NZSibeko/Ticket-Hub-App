const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Configure email transporter (use Gmail, SendGrid, or other SMTP)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

const EmailService = {
  // Generate QR code as base64
  async generateQRCode(data) {
    try {
      return await QRCode.toDataURL(data);
    } catch (error) {
      console.error('QR Code generation error:', error);
      return null;
    }
  },

  // Send ticket confirmation email
  async sendTicketEmail(customerEmail, ticketData, eventData) {
    try {
      const qrCodeImage = await this.generateQRCode(ticketData.ticket_code);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Your Ticket for ${eventData.event_name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #6200ee; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .ticket-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .qr-code { text-align: center; padding: 20px; }
              .qr-code img { max-width: 250px; }
              .details { margin: 15px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .button { display: inline-block; padding: 12px 30px; background: #6200ee; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Your Ticket is Ready!</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                <p>Thank you for your purchase! Your ticket for <strong>${eventData.event_name}</strong> has been confirmed.</p>
                
                <div class="ticket-box">
                  <h2 style="text-align: center; color: #6200ee;">Event Details</h2>
                  <div class="details">
                    <div class="details-row">
                      <span class="label">Event:</span>
                      <span class="value">${eventData.event_name}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Date:</span>
                      <span class="value">${new Date(eventData.start_date).toLocaleString()}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Location:</span>
                      <span class="value">${eventData.location}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Ticket Code:</span>
                      <span class="value" style="font-weight: bold; color: #6200ee;">${ticketData.ticket_code}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Price:</span>
                      <span class="value">$${ticketData.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div class="qr-code">
                    <h3>Scan QR Code at Entry</h3>
                    <img src="${qrCodeImage}" alt="QR Code" />
                    <p style="color: #666; font-size: 14px;">Show this QR code at the event entrance</p>
                  </div>
                </div>

                <div style="text-align: center;">
                  <a href="http://localhost:3000" class="button">View in App</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  <strong>Important:</strong><br>
                  • Keep this email safe as proof of purchase<br>
                  • Arrive 15 minutes early for entry<br>
                  • Contact support if you have any questions
                </p>
              </div>
              <div class="footer">
                <p>Event Ticketing System</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Ticket email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  },

  // Send event reminder email
  async sendReminderEmail(customerEmail, eventData) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Reminder: ${eventData.event_name} is Tomorrow!`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6200ee;">Don't Forget!</h2>
              <p>This is a friendly reminder that <strong>${eventData.event_name}</strong> is happening soon!</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date:</strong> ${new Date(eventData.start_date).toLocaleString()}</p>
                <p><strong>Location:</strong> ${eventData.location}</p>
              </div>
              <p>We look forward to seeing you there!</p>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Reminder email error:', error);
      return false;
    }
  },

  // Send welcome email
  async sendWelcomeEmail(customerEmail, customerName) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: 'Welcome to Event Ticketing System!',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #6200ee; color: white; padding: 30px; text-align: center; border-radius: 10px;">
                <h1>Welcome, ${customerName}!</h1>
              </div>
              <div style="padding: 30px;">
                <p>Thank you for joining Event Ticketing System!</p>
                <p>You can now:</p>
                <ul>
                  <li>Browse upcoming events</li>
                  <li>Purchase tickets securely</li>
                  <li>Manage your bookings</li>
                  <li>Get event reminders</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:3000" style="display: inline-block; padding: 12px 30px; background: #6200ee; color: white; text-decoration: none; border-radius: 5px;">
                    Explore Events
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Welcome email error:', error);
      return false;
    }
  }
};

module.exports = EmailService;