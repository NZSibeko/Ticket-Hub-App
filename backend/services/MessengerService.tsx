// backend/services/MessengerService.js - COMPLETE & SIMPLE
const axios = require('axios');

class MessengerService {
  constructor() {
    this.pageId = process.env.MESSENGER_PAGE_ID;
    this.accessToken = process.env.MESSENGER_ACCESS_TOKEN;
    this.apiVersion = process.env.MESSENGER_API_VERSION || 'v18.0';
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Messenger API initialized (FREE)');
  }

  // 🔐 VERIFY WEBHOOK (Facebook requirement)
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || 'tickethub_messenger';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Messenger webhook verified');
      return challenge;
    }
    throw new Error('Webhook verification failed');
  }

  // 📨 SEND MESSAGE (Simple text)
  async sendMessage(recipientId, message) {
    try {
      const response = await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: { text: message }
        }
      );
      
      console.log(`✅ Messenger sent to ${recipientId}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: response.data.message_id,
        recipientId: recipientId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Messenger send error:', error.response?.data || error.message);
      throw new Error(`Messenger send failed: ${error.message}`);
    }
  }

  // 📋 SEND QUICK REPLIES (Interactive)
  async sendQuickReplies(recipientId, text, replies) {
    try {
      const quickReplies = replies.map(reply => ({
        content_type: 'text',
        title: reply.title,
        payload: reply.payload
      }));

      const response = await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: {
            text: text,
            quick_replies: quickReplies
          }
        }
      );

      return {
        success: true,
        messageId: response.data.message_id
      };

    } catch (error) {
      console.error('Quick replies error:', error.response?.data);
      throw error;
    }
  }

  // 📎 SEND ATTACHMENT (Image/File)
  async sendAttachment(recipientId, type, url) {
    try {
      const response = await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: {
            attachment: {
              type: type, // image, audio, video, file
              payload: { url: url, is_reusable: true }
            }
          }
        }
      );

      return {
        success: true,
        messageId: response.data.message_id
      };

    } catch (error) {
      console.error('Attachment send error:', error.response?.data);
      throw error;
    }
  }

  // 📱 PROCESS INCOMING MESSAGES
  async processIncomingWebhook(webhookData) {
    try {
      if (webhookData.object !== 'page') {
        return { success: false, error: 'Invalid webhook object' };
      }

      const entries = webhookData.entry || [];
      const processedMessages = [];

      for (const entry of entries) {
        for (const messagingEvent of entry.messaging || []) {
          const processed = await this.processMessagingEvent(messagingEvent);
          if (processed) processedMessages.push(processed);
        }
      }

      return {
        success: true,
        processed: processedMessages.length,
        messages: processedMessages
      };

    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔍 PROCESS MESSAGING EVENT
  async processMessagingEvent(event) {
    const messageData = {
      platform: 'messenger',
      senderId: event.sender.id,
      timestamp: new Date(event.timestamp).toISOString(),
      recipientId: event.recipient.id
    };

    // Message received
    if (event.message) {
      messageData.type = 'message';
      messageData.messageId = event.message.mid;
      messageData.text = event.message.text;
      
      if (event.message.attachments) {
        messageData.attachments = event.message.attachments;
      }
      
      if (event.message.quick_reply) {
        messageData.quickReply = event.message.quick_reply;
      }
    }
    
    // Postback (button clicks)
    else if (event.postback) {
      messageData.type = 'postback';
      messageData.payload = event.postback.payload;
      messageData.title = event.postback.title;
    }
    
    // Message delivered
    else if (event.delivery) {
      messageData.type = 'delivery';
      messageData.messageIds = event.delivery.mids;
    }
    
    // Message read
    else if (event.read) {
      messageData.type = 'read';
      messageData.watermark = event.read.watermark;
    }
    
    // Message echo (bot sent message)
    else if (event.message && event.message.is_echo) {
      messageData.type = 'echo';
      messageData.isEcho = true;
    }
    
    // Message unsent
    else if (event.message && event.message.is_unsent) {
      messageData.type = 'unsent';
    }

    return messageData;
  }

  // 👤 GET USER PROFILE
  async getUserProfile(userId) {
    try {
      const response = await this.client.get(
        `/${userId}?fields=first_name,last_name,profile_pic,gender,locale,timezone`
      );
      
      return {
        id: userId,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        profilePic: response.data.profile_pic,
        gender: response.data.gender,
        locale: response.data.locale,
        timezone: response.data.timezone
      };
      
    } catch (error) {
      console.error('User profile error:', error.message);
      return { id: userId, firstName: 'Facebook User' };
    }
  }

  // 🔔 MARK MESSAGE AS READ
  async markAsRead(recipientId) {
    try {
      await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          sender_action: 'mark_seen'
        }
      );
      return true;
    } catch (error) {
      console.error('Mark as read error:', error.message);
      return false;
    }
  }

  // ⏳ TYPING INDICATOR
  async sendTypingIndicator(recipientId, on = true) {
    try {
      await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          sender_action: on ? 'typing_on' : 'typing_off'
        }
      );
      return true;
    } catch (error) {
      console.error('Typing indicator error:', error.message);
      return false;
    }
  }

  // 🏷️ SEND GENERIC TEMPLATE (Cards)
  async sendGenericTemplate(recipientId, elements) {
    try {
      const response = await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: elements
              }
            }
          }
        }
      );

      return {
        success: true,
        messageId: response.data.message_id
      };

    } catch (error) {
      console.error('Generic template error:', error.response?.data);
      throw error;
    }
  }

  // 📞 SEND BUTTON TEMPLATE
  async sendButtonTemplate(recipientId, text, buttons) {
    try {
      const response = await this.client.post(
        `/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: text,
                buttons: buttons
              }
            }
          }
        }
      );

      return {
        success: true,
        messageId: response.data.message_id
      };

    } catch (error) {
      console.error('Button template error:', error.response?.data);
      throw error;
    }
  }
}

module.exports = MessengerService;