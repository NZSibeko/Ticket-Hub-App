// backend/services/TwitterService.js - COMPLETE & SIMPLE
const axios = require('axios');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

class TwitterService {
  constructor() {
    // Twitter API v2 credentials
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.environmentName = process.env.TWITTER_ENVIRONMENT_NAME || 'development';
    
    // API URLs
    this.apiVersion = '2';
    this.baseURL = `https://api.twitter.com/${this.apiVersion}`;
    
    // OAuth 1.0a setup for v1.1 endpoints
    this.oauth = OAuth({
      consumer: {
        key: this.apiKey,
        secret: this.apiSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function: (baseString, key) => {
        return crypto
          .createHmac('sha1', key)
          .update(baseString)
          .digest('base64');
      }
    });
    
    console.log('✅ Twitter/X API initialized (FREE TIER)');
  }

  // 🔐 GET OAUTH HEADER
  getOAuthHeader(url, method, data = {}) {
    const request = {
      url: url,
      method: method,
      data: data
    };
    
    const token = {
      key: this.accessToken,
      secret: this.accessTokenSecret
    };
    
    return this.oauth.toHeader(this.oauth.authorize(request, token));
  }

  // 📨 SEND DIRECT MESSAGE
  async sendDirectMessage(recipientId, message) {
    try {
      const url = `${this.baseURL}/dm_conversations/with/${recipientId}/messages`;
      
      const response = await axios.post(
        url,
        {
          text: message
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'TicketHubSupport'
          }
        }
      );
      
      console.log(`✅ Twitter DM sent to ${recipientId}: ${message.substring(0, 50)}...`);
      return {
        success: true,
        messageId: response.data.data.dm_conversation_id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Twitter DM send error:', error.response?.data || error.message);
      throw new Error(`Twitter DM failed: ${error.message}`);
    }
  }

  // 🔄 SEND MESSAGE WITH QUICK REPLY (Buttons)
  async sendMessageWithQuickReply(recipientId, message, options) {
    try {
      const url = `${this.baseURL}/dm_conversations/with/${recipientId}/messages`;
      
      const quickReply = {
        type: 'options',
        options: options.map(option => ({
          label: option.label,
          description: option.description || '',
          metadata: option.metadata || ''
        }))
      };
      
      const response = await axios.post(
        url,
        {
          text: message,
          quick_reply: quickReply
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        messageId: response.data.data.dm_conversation_id
      };
      
    } catch (error) {
      console.error('Quick reply error:', error.response?.data);
      throw error;
    }
  }

  // 📱 PROCESS INCOMING DIRECT MESSAGES (Account Activity API)
  async processDirectMessageEvent(event) {
    try {
      if (event.type !== 'message_create') {
        return null;
      }

      const messageData = event.message_create;
      const senderId = messageData.sender_id;
      const recipientId = messageData.target.recipient_id;
      
      // Get message text
      let text = '';
      if (messageData.message_data) {
        text = messageData.message_data.text || '';
        
        // Handle attachments
        if (messageData.message_data.attachment) {
          text += ' [Attachment]';
        }
        
        // Handle quick reply responses
        if (messageData.message_data.quick_reply_response) {
          text += ` [Quick Reply: ${messageData.message_data.quick_reply_response.metadata}]`;
        }
      }

      const processedMessage = {
        platform: 'twitter',
        type: 'direct_message',
        messageId: event.id,
        senderId: senderId,
        recipientId: recipientId,
        text: text,
        timestamp: new Date(parseInt(event.created_timestamp)).toISOString(),
        rawEvent: event
      };

      return processedMessage;

    } catch (error) {
      console.error('DM processing error:', error);
      return null;
    }
  }

  // 👤 GET USER BY ID
  async getUserById(userId) {
    try {
      const url = `${this.baseURL}/users/${userId}?user.fields=profile_image_url,description,name,username`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      });
      
      return {
        id: response.data.data.id,
        name: response.data.data.name,
        username: response.data.data.username,
        description: response.data.data.description,
        profileImage: response.data.data.profile_image_url
      };
      
    } catch (error) {
      console.error('Get user error:', error.message);
      return { id: userId, name: 'Twitter User' };
    }
  }

  // 🔍 SEARCH USERS BY USERNAME
  async searchUsers(query, maxResults = 10) {
    try {
      const url = `${this.baseURL}/users/by?usernames=${query}&user.fields=profile_image_url,description`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      });
      
      return response.data.data || [];
      
    } catch (error) {
      console.error('Search users error:', error.message);
      return [];
    }
  }

  // 📨 SEND WELCOME MESSAGE (First-time DM)
  async sendWelcomeMessage(recipientId) {
    try {
      const message = `👋 Welcome to TicketHub Support!\n\nI'm here to help you with:\n• Ticket purchases\n• Event information\n• Order status\n• General inquiries\n\nHow can I assist you today?`;
      
      return await this.sendDirectMessage(recipientId, message);
      
    } catch (error) {
      console.error('Welcome message error:', error.message);
      throw error;
    }
  }

  // 📊 GET MESSAGE HISTORY
  async getMessageHistory(userId, maxResults = 50) {
    try {
      const url = `${this.baseURL}/dm_conversations/with/${userId}/messages?max_results=${maxResults}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      });
      
      return response.data.data || [];
      
    } catch (error) {
      console.error('Message history error:', error.message);
      return [];
    }
  }

  // 🏷️ CREATE WELCOME MESSAGE RULE (Account Activity API)
  async createWelcomeMessageRule() {
    try {
      const url = `https://api.twitter.com/1.1/direct_messages/welcome_messages/rules/new.json`;
      
      const welcomeMessageId = await this.createWelcomeMessage();
      
      const requestData = {
        welcome_message_rule: {
          welcome_message_id: welcomeMessageId
        }
      };
      
      const authHeader = this.getOAuthHeader(url, 'POST', requestData);
      
      const response = await axios.post(url, requestData, {
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Welcome message rule created');
      return response.data;
      
    } catch (error) {
      console.error('Create welcome rule error:', error.response?.data || error.message);
      return null;
    }
  }

  // 📝 CREATE WELCOME MESSAGE
  async createWelcomeMessage() {
    try {
      const url = `https://api.twitter.com/1.1/direct_messages/welcome_messages/new.json`;
      
      const requestData = {
        welcome_message: {
          name: 'TicketHub Welcome',
          message_data: {
            text: "👋 Welcome to TicketHub Support! How can I help you today?",
            quick_reply: {
              type: 'options',
              options: [
                {
                  label: 'Buy Tickets',
                  description: 'Find and purchase event tickets'
                },
                {
                  label: 'Order Status',
                  description: 'Check my ticket order'
                },
                {
                  label: 'Support',
                  description: 'Get help with an issue'
                }
              ]
            }
          }
        }
      };
      
      const authHeader = this.getOAuthHeader(url, 'POST', requestData);
      
      const response = await axios.post(url, requestData, {
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.welcome_message.id;
      
    } catch (error) {
      console.error('Create welcome message error:', error.response?.data || error.message);
      return null;
    }
  }

  // 🔔 SET UP ACCOUNT ACTIVITY WEBHOOK
  async setupAccountActivityWebhook(webhookUrl) {
    try {
      // Register webhook
      const registerUrl = `https://api.twitter.com/1.1/account_activity/all/${this.environmentName}/webhooks.json`;
      
      const requestData = {
        url: webhookUrl,
        // Twitter requires CRC verification
      };
      
      const authHeader = this.getOAuthHeader(registerUrl, 'POST', requestData);
      
      const response = await axios.post(registerUrl, requestData, {
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Twitter webhook registered:', response.data);
      
      // Subscribe to all events
      const subscribeUrl = `https://api.twitter.com/1.1/account_activity/all/${this.environmentName}/subscriptions.json`;
      const subscribeHeader = this.getOAuthHeader(subscribeUrl, 'POST');
      
      await axios.post(subscribeUrl, {}, {
        headers: subscribeHeader
      });
      
      console.log('✅ Subscribed to Twitter events');
      
      return response.data;
      
    } catch (error) {
      console.error('Twitter webhook setup error:', error.response?.data || error.message);
      throw error;
    }
  }

  // 🔄 PROCESS ACCOUNT ACTIVITY WEBHOOK
  async processAccountActivityWebhook(webhookData) {
    try {
      // Check for CRC challenge (Twitter verification)
      if (webhookData.crc_token) {
        const hmac = crypto
          .createHmac('sha256', this.apiSecret)
          .update(webhookData.crc_token)
          .digest('base64');
        
        return {
          response_token: `sha256=${hmac}`
        };
      }

      // Process actual events
      if (webhookData.direct_message_events) {
        const processedMessages = [];
        
        for (const event of webhookData.direct_message_events) {
          const processed = await this.processDirectMessageEvent(event);
          if (processed) processedMessages.push(processed);
        }
        
        return {
          success: true,
          processed: processedMessages.length,
          messages: processedMessages
        };
      }
      
      // Process tweet events if needed
      if (webhookData.tweet_create_events) {
        console.log('Tweet events received:', webhookData.tweet_create_events.length);
      }
      
      return { success: true, message: 'Webhook processed' };
      
    } catch (error) {
      console.error('Twitter webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TwitterService;