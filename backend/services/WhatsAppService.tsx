// backend/services/WhatsAppService.js - COMPLETE & SIMPLE
const axios = require('axios');
const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ WhatsApp Cloud API initialized (FREE TIER)');
  }

  // 🔐 VERIFY WEBHOOK (Meta requirement)
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'tickethub_whatsapp';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified');
      return challenge;
    }
    throw new Error('Webhook verification failed');
  }

  // 📨 SEND MESSAGE (Simple text)
  async sendMessage(to, message) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        }
      );
      
      console.log(`✅ WhatsApp sent to ${to}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ WhatsApp send error:', error.response?.data || error.message);
      throw new Error(`WhatsApp send failed: ${error.message}`);
    }
  }

  // 📞 SEND TEMPLATE MESSAGE (For initiating conversations)
  async sendTemplateMessage(to, templateName, language = 'en_US', components = []) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            components: components
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.messages[0]?.id
      };
      
    } catch (error) {
      console.error('Template send error:', error.response?.data);
      throw error;
    }
  }

  // 📱 PROCESS INCOMING MESSAGES (Webhook handler)
  async processIncomingWebhook(webhookData) {
    try {
      if (webhookData.object !== 'whatsapp_business_account') {
        return { success: false, error: 'Invalid webhook object' };
      }

      const entries = webhookData.entry || [];
      const processedMessages = [];

      for (const entry of entries) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const message = change.value?.messages?.[0];
            const contact = change.value?.contacts?.[0];

            if (message) {
              const processed = await this.processSingleMessage(message, contact);
              processedMessages.push(processed);
            }
          }
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

  // 🔍 PROCESS SINGLE MESSAGE
  async processSingleMessage(message, contact) {
    const messageData = {
      id: message.id,
      from: message.from,
      timestamp: new Date(message.timestamp * 1000).toISOString(),
      type: message.type,
      platform: 'whatsapp',
      customer_name: contact?.profile?.name || `User ${message.from}`,
      business_phone_id: message.business_phone_id
    };

    // Extract content based on message type
    switch (message.type) {
      case 'text':
        messageData.content = message.text.body;
        break;
      case 'image':
        messageData.content = message.image.caption || '[Image]';
        messageData.media_id = message.image.id;
        break;
      case 'audio':
        messageData.content = '[Audio message]';
        messageData.media_id = message.audio.id;
        break;
      case 'video':
        messageData.content = message.video.caption || '[Video]';
        messageData.media_id = message.video.id;
        break;
      case 'document':
        messageData.content = message.document.filename || '[Document]';
        messageData.media_id = message.document.id;
        break;
      case 'interactive':
        messageData.content = '[Interactive message]';
        messageData.interactive = message.interactive;
        break;
      default:
        messageData.content = `[${message.type} message]`;
    }

    return messageData;
  }

  // 📊 GET MESSAGE MEDIA (Download images/files)
  async getMediaUrl(mediaId) {
    try {
      const response = await this.client.get(`/${mediaId}`);
      return response.data.url;
    } catch (error) {
      console.error('Media URL error:', error.message);
      return null;
    }
  }

  // 📥 DOWNLOAD MEDIA
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });
      
      return {
        data: response.data,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length']
      };
      
    } catch (error) {
      console.error('Media download error:', error.message);
      return null;
    }
  }

  // 🔔 MARK MESSAGE AS READ
  async markAsRead(messageId) {
    try {
      await this.client.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        }
      );
      return true;
    } catch (error) {
      console.error('Mark as read error:', error.message);
      return false;
    }
  }

  // 📞 GET BUSINESS PROFILE
  async getBusinessProfile() {
    try {
      const response = await this.client.get(
        `/${this.phoneNumberId}/whatsapp_business_profile`
      );
      return response.data;
    } catch (error) {
      console.error('Business profile error:', error.message);
      return null;
    }
  }
}

module.exports = WhatsAppService;