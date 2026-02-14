const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Webhook verification for different platforms
router.get('/webhooks/:platform', (req, res) => {
  const { platform } = req.params;
  const { 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  
  const expectedToken = process.env[`${platform.toUpperCase()}_VERIFY_TOKEN`];
  
  if (token === expectedToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Invalid verification token' });
  }
});

// Handle incoming webhook messages
router.post('/webhooks/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const db = req.app.locals.db;
    const io = req.app.locals.io;
    
    // Verify webhook signature
    if (!verifyWebhookSignature(req, platform)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const webhookData = req.body;
    
    // Process based on platform
    let messageData;
    
    switch (platform) {
      case 'whatsapp':
        messageData = processWhatsAppWebhook(webhookData);
        break;
      case 'facebook':
        messageData = processFacebookWebhook(webhookData);
        break;
      case 'instagram':
        messageData = processInstagramWebhook(webhookData);
        break;
      case 'twitter':
        messageData = processTwitterWebhook(webhookData);
        break;
      case 'tiktok':
        messageData = processTikTokWebhook(webhookData);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    if (!messageData) {
      return res.status(200).json({ success: true, message: 'Webhook processed, no action needed' });
    }
    
    // Check if conversation exists
    let conversation = await db.get(
      `SELECT * FROM conversations 
       WHERE customer_id = ? 
       AND platform = ? 
       AND status = 'active'
       ORDER BY last_activity DESC LIMIT 1`,
      [messageData.customer_id, platform]
    );
    
    // If no active conversation, create one and assign to agent
    if (!conversation) {
      conversation = await createNewConversation(db, messageData, platform);
      
      // Notify available agents via WebSocket
      if (io) {
        io.emit('new_conversation', conversation);
      }
    }
    
    // Save message to database
    const messageId = uuidv4();
    await db.run(
      `INSERT INTO messages (
        message_id, conversation_id, sender_id, 
        sender_name, sender_type, content, 
        timestamp, platform, is_read, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        conversation.conversation_id,
        messageData.customer_id,
        messageData.customer_name,
        'customer',
        messageData.content,
        new Date().toISOString(),
        platform,
        0,
        JSON.stringify(messageData.attachments || [])
      ]
    );
    
    // Update conversation last activity
    await db.run(
      `UPDATE conversations 
       SET last_activity = datetime('now') 
       WHERE conversation_id = ?`,
      [conversation.conversation_id]
    );
    
    // Get the created message
    const savedMessage = await db.get(
      `SELECT * FROM messages WHERE message_id = ?`,
      [messageId]
    );
    
    // Send real-time update via WebSocket
    if (io) {
      io.to(`conversation_${conversation.conversation_id}`).emit('new_message', savedMessage);
    }
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error(`Error processing ${platform} webhook:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function verifyWebhookSignature(req, platform) {
  // Implementation depends on platform
  // For Facebook/Instagram:
  if (['facebook', 'instagram'].includes(platform)) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env[`${platform.toUpperCase()}_APP_SECRET`])
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    return `sha256=${expectedSignature}` === signature;
  }
  
  // For other platforms, implement their verification methods
  return true; // For development
}

function processWhatsAppWebhook(data) {
  try {
    const entry = data.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value || !value.messages?.[0]) return null;
    
    const message = value.messages[0];
    const contact = value.contacts?.[0];
    
    return {
      customer_id: `wa_${message.from}`,
      customer_name: contact?.profile?.name || `WhatsApp User ${message.from}`,
      content: message.text?.body || '[Media message]',
      platform: 'whatsapp',
      attachments: message.image ? [{ type: 'image', url: message.image.url }] : []
    };
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return null;
  }
}

function processFacebookWebhook(data) {
  try {
    const entry = data.entry?.[0];
    const messaging = entry?.messaging?.[0];
    
    if (!messaging || !messaging.message) return null;
    
    return {
      customer_id: `fb_${messaging.sender.id}`,
      customer_name: `Facebook User ${messaging.sender.id}`,
      content: messaging.message.text || '[Facebook message]',
      platform: 'facebook',
      attachments: []
    };
  } catch (error) {
    console.error('Error processing Facebook webhook:', error);
    return null;
  }
}

function processInstagramWebhook(data) {
  try {
    const entry = data.entry?.[0];
    const messaging = entry?.messaging?.[0];
    
    if (!messaging || !messaging.message) return null;
    
    return {
      customer_id: `ig_${messaging.sender.id}`,
      customer_name: `Instagram User ${messaging.sender.id}`,
      content: messaging.message.text || '[Instagram message]',
      platform: 'instagram',
      attachments: []
    };
  } catch (error) {
    console.error('Error processing Instagram webhook:', error);
    return null;
  }
}

function processTwitterWebhook(data) {
  try {
    const dmEvent = data.direct_message_events?.[0];
    if (!dmEvent || dmEvent.type !== 'message_create') return null;
    
    const messageCreate = dmEvent.message_create;
    
    return {
      customer_id: `tw_${messageCreate.sender_id}`,
      customer_name: `Twitter User ${messageCreate.sender_id}`,
      content: messageCreate.message_data?.text || '[Twitter DM]',
      platform: 'twitter',
      attachments: []
    };
  } catch (error) {
    console.error('Error processing Twitter webhook:', error);
    return null;
  }
}

function processTikTokWebhook(data) {
  try {
    const event = data.event;
    if (!event || event.event !== 'im.message.receive') return null;
    
    return {
      customer_id: `tt_${event.sender_id}`,
      customer_name: `TikTok User ${event.sender_id}`,
      content: event.content?.text || '[TikTok message]',
      platform: 'tiktok',
      attachments: []
    };
  } catch (error) {
    console.error('Error processing TikTok webhook:', error);
    return null;
  }
}

async function createNewConversation(db, messageData, platform) {
  const conversationId = uuidv4();
  const now = new Date().toISOString();
  
  // Find available agent
  const availableAgent = await db.get(
    `SELECT * FROM support_agents 
     WHERE status = 'available' 
     AND auto_assign = 1 
     AND current_conversations < max_conversations
     ORDER BY last_assigned_at ASC 
     LIMIT 1`
  );
  
  await db.run(
    `INSERT INTO conversations (
      conversation_id, platform, customer_id, 
      customer_name, assigned_agent_id, 
      status, created_at, last_activity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversationId,
      platform,
      messageData.customer_id,
      messageData.customer_name,
      availableAgent?.support_id || null,
      'active',
      now,
      now
    ]
  );
  
  // Update agent count if assigned
  if (availableAgent) {
    await db.run(
      `UPDATE support_agents 
       SET current_conversations = current_conversations + 1,
           last_assigned_at = datetime('now') 
       WHERE support_id = ?`,
      [availableAgent.support_id]
    );
  }
  
  return await db.get(
    `SELECT * FROM conversations WHERE conversation_id = ?`,
    [conversationId]
  );
}

module.exports = router;