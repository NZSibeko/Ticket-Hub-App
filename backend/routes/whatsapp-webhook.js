const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// WhatsApp webhook verification
router.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tickethub_whatsapp_2025';

  console.log(`🔐 WhatsApp webhook verification: mode=${mode}, token=${token}`);

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    console.log('⚠️ Missing verification parameters');
    res.sendStatus(400);
  }
});

// WhatsApp message webhook
router.post('/webhook/whatsapp', async (req, res) => {
  console.log('📱 WhatsApp webhook received');
  
  // Immediately respond to prevent timeouts
  res.status(200).send('EVENT_RECEIVED');
  
  // Process asynchronously
  try {
    console.log('📱 Webhook body:', JSON.stringify(req.body, null, 2));
    
    // Check if it's a WhatsApp Business API webhook
    if (req.body.object === 'whatsapp_business_account') {
      await processWhatsAppBusinessWebhook(req.body, req.app);
    } else if (req.body.type === 'whatsapp_message') {
      // Handle direct webhook for testing
      await processDirectWhatsAppMessage(req.body, req.app);
    } else {
      console.log('⚠️ Unknown webhook format, treating as test');
      await processTestWebhook(req.body, req.app);
    }
    
  } catch (error) {
    console.error('❌ WhatsApp webhook processing error:', error);
  }
});

// Process WhatsApp Business API webhook
async function processWhatsAppBusinessWebhook(body, app) {
  console.log('📱 Processing WhatsApp Business webhook');
  
  const entries = body.entry || [];
  console.log(`📱 Processing ${entries.length} entries`);
  
  for (const entry of entries) {
    const changes = entry.changes || [];
    
    for (const change of changes) {
      if (change.field === 'messages') {
        const value = change.value;
        
        // Process incoming messages
        if (value.messages) {
          console.log(`📱 Processing ${value.messages.length} messages`);
          for (const message of value.messages) {
            await processWhatsAppMessage(message, value, app);
          }
        }
        
        // Process status updates
        if (value.statuses) {
          console.log(`📱 Processing ${value.statuses.length} status updates`);
          for (const status of value.statuses) {
            processWhatsAppStatus(status, app);
          }
        }
      }
    }
  }
}

// Process WhatsApp message
async function processWhatsAppMessage(message, webhookData, app) {
  console.log('📱 Processing WhatsApp message type:', message.type);
  
  const db = app.locals.db;
  const wss = app.locals.wss;
  
  if (!db || !db.dbOperations) {
    console.error('❌ Database not available');
    return;
  }
  
  const messageData = {
    message_id: message.id || `wa_${Date.now()}_${uuidv4().substr(0, 8)}`,
    from: message.from,
    from_name: 'WhatsApp Customer',
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    message_type: message.type,
    platform: 'whatsapp',
    content: '',
    body: '',
    webhook_received_at: new Date().toISOString()
  };
  
  // Handle different message types
  switch (message.type) {
    case 'text':
      messageData.body = message.text?.body || '';
      messageData.content = message.text?.body || '';
      break;
      
    case 'image':
      messageData.body = message.image?.caption || '[Image]';
      messageData.content = message.image?.caption || '[Image]';
      messageData.media_url = message.image?.url;
      messageData.media_id = message.image?.id;
      messageData.mime_type = message.image?.mime_type;
      break;
      
    case 'audio':
      messageData.body = '[Audio message]';
      messageData.content = '[Audio message]';
      messageData.media_url = message.audio?.url;
      messageData.media_id = message.audio?.id;
      messageData.mime_type = message.audio?.mime_type;
      break;
      
    case 'video':
      messageData.body = message.video?.caption || '[Video]';
      messageData.content = message.video?.caption || '[Video]';
      messageData.media_url = message.video?.url;
      messageData.media_id = message.video?.id;
      messageData.mime_type = message.video?.mime_type;
      break;
      
    case 'document':
      messageData.body = message.document?.filename || '[Document]';
      messageData.content = message.document?.filename || '[Document]';
      messageData.media_url = message.document?.url;
      messageData.media_id = message.document?.id;
      messageData.mime_type = message.document?.mime_type;
      messageData.filename = message.document?.filename;
      break;
      
    case 'sticker':
      messageData.body = '[Sticker]';
      messageData.content = '[Sticker]';
      messageData.media_url = message.sticker?.url;
      messageData.media_id = message.sticker?.id;
      messageData.mime_type = message.sticker?.mime_type;
      break;
      
    case 'location':
      messageData.body = `Location: ${message.location?.latitude}, ${message.location?.longitude}`;
      messageData.content = `Location: ${message.location?.latitude}, ${message.location?.longitude}`;
      messageData.latitude = message.location?.latitude;
      messageData.longitude = message.location?.longitude;
      messageData.address = message.location?.address;
      break;
      
    case 'contacts':
      messageData.body = '[Contact shared]';
      messageData.content = '[Contact shared]';
      messageData.contacts = message.contacts;
      break;
      
    default:
      messageData.body = `[${message.type} message]`;
      messageData.content = `[${message.type} message]`;
  }
  
  // Add contact info if available
  if (webhookData.contacts && webhookData.contacts.length > 0) {
    const contact = webhookData.contacts[0];
    messageData.from_name = contact.profile?.name || `Customer (${message.from})`;
    messageData.wa_id = contact.wa_id;
  }
  
  console.log(`📱 Message from ${messageData.from_name}: ${messageData.content}`);
  
  try {
    // Find existing conversation by phone number
    const existingConversation = await db.dbOperations.get(
      `SELECT * FROM support_conversations 
       WHERE platform = 'whatsapp' AND customer_phone = ? 
       ORDER BY last_activity DESC LIMIT 1`,
      [message.from]
    );
    
    let conversationId;
    let conversationData;
    
    if (existingConversation) {
      conversationId = existingConversation.conversation_id;
      conversationData = existingConversation;
      
      console.log(`📱 Found existing conversation: ${conversationId}`);
      
      // Update conversation
      await db.dbOperations.run(
        `UPDATE support_conversations 
         SET last_activity = ?, last_message = ?, last_message_time = ?, status = 'active'
         WHERE conversation_id = ?`,
        [messageData.timestamp, messageData.content, messageData.timestamp, conversationId]
      );
    } else {
      // Create new conversation
      conversationId = `conv_whatsapp_${message.from}_${Date.now()}`;
      
      // Auto-assign to available agent
      const availableAgent = await db.dbOperations.get(
        `SELECT agent_id FROM support_agent_status 
         WHERE status = 'available' AND auto_assign = 1 
         ORDER BY last_active DESC LIMIT 1`
      );
      
      const agentId = availableAgent?.agent_id || 'agent_001';
      
      await db.dbOperations.run(
        `INSERT INTO support_conversations (
          conversation_id, platform, customer_id, 
          customer_name, customer_phone, assigned_agent_id, status,
          created_at, last_activity, last_message, last_message_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationId,
          'whatsapp',
          `cust_${message.from}`,
          messageData.from_name,
          message.from,
          agentId,
          'active',
          messageData.timestamp,
          messageData.timestamp,
          messageData.content,
          messageData.timestamp
        ]
      );
      
      conversationData = await db.dbOperations.get(
        `SELECT * FROM support_conversations WHERE conversation_id = ?`,
        [conversationId]
      );
      
      console.log(`📱 Created new conversation: ${conversationId} assigned to ${agentId}`);
    }
    
    messageData.conversation_id = conversationId;
    
    // Save message to database
    const dbMessageId = `wa_db_${Date.now()}_${uuidv4().substr(0, 8)}`;
    await db.dbOperations.run(
      `INSERT INTO support_messages (
        message_id, conversation_id, sender_id,
        sender_name, sender_type, content,
        timestamp, platform, is_read, delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbMessageId,
        conversationId,
        message.from,
        messageData.from_name,
        'customer',
        messageData.content,
        messageData.timestamp,
        'whatsapp',
        0, // Not read
        1  // Delivered
      ]
    );
    
    console.log(`✅ WhatsApp message saved to database: ${dbMessageId}`);
    
    // Prepare WebSocket message
    const wsMessage = {
      type: 'whatsapp_message',
      data: {
        ...messageData,
        message_id: dbMessageId,
        conversation: conversationData
      }
    };
    
    // Broadcast via WebSocket
    if (wss && wss.broadcastWhatsAppMessage) {
      wss.broadcastWhatsAppMessage(wsMessage.data);
      console.log('📡 Message broadcasted via WebSocket');
    } else {
      // Fallback to old method
      broadcastToWebSocket(app, wsMessage);
    }
    
  } catch (error) {
    console.error('❌ Error processing WhatsApp message:', error);
  }
}

// Process direct WhatsApp message (for testing)
async function processDirectWhatsAppMessage(data, app) {
  console.log('📱 Processing direct WhatsApp message');
  
  const db = app.locals.db;
  const wss = app.locals.wss;
  
  const messageData = {
    message_id: data.message_id || `wa_direct_${Date.now()}_${uuidv4().substr(0, 8)}`,
    from: data.from || '+27721234567',
    from_name: data.from_name || 'WhatsApp Customer',
    body: data.body || data.message || 'Test WhatsApp message',
    content: data.body || data.message || 'Test WhatsApp message',
    conversation_id: data.conversation_id || `whatsapp_${data.from || 'test'}_${Date.now()}`,
    timestamp: data.timestamp || new Date().toISOString(),
    platform: 'whatsapp',
    message_type: data.message_type || 'text'
  };
  
  console.log(`📱 Direct message: ${messageData.from} - ${messageData.content}`);
  
  // Save to database if we have a conversation ID
  if (messageData.conversation_id && db && db.dbOperations) {
    try {
      await db.dbOperations.run(
        `INSERT OR IGNORE INTO support_conversations (
          conversation_id, platform, customer_id, 
          customer_name, customer_phone, status,
          created_at, last_activity, last_message, last_message_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.conversation_id,
          'whatsapp',
          `cust_${messageData.from}`,
          messageData.from_name,
          messageData.from,
          'active',
          messageData.timestamp,
          messageData.timestamp,
          messageData.content,
          messageData.timestamp
        ]
      );
      
      await db.dbOperations.run(
        `INSERT INTO support_messages (
          message_id, conversation_id, sender_id,
          sender_name, sender_type, content,
          timestamp, platform, is_read, delivered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.message_id,
          messageData.conversation_id,
          messageData.from,
          messageData.from_name,
          'customer',
          messageData.content,
          messageData.timestamp,
          'whatsapp',
          0,
          1
        ]
      );
      
      console.log('✅ Direct message saved to database');
      
    } catch (error) {
      console.error('❌ Error saving direct message:', error);
    }
  }
  
  // Broadcast via WebSocket
  if (wss && wss.broadcastWhatsAppMessage) {
    wss.broadcastWhatsAppMessage(messageData);
    console.log('📡 Direct message broadcasted via WebSocket');
  } else {
    broadcastToWebSocket(app, {
      type: 'whatsapp_message',
      data: messageData
    });
  }
}

// Process test webhook
async function processTestWebhook(data, app) {
  console.log('🧪 Processing test webhook');
  
  const messageData = {
    type: 'whatsapp_message',
    data: {
      message_id: `wa_test_${Date.now()}_${uuidv4().substr(0, 8)}`,
      from: data.from || '+27721234567',
      from_name: data.from_name || 'Test Customer',
      body: data.body || data.message || 'Test message from webhook',
      content: data.body || data.message || 'Test message from webhook',
      conversation_id: data.conversation_id || `whatsapp_test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      platform: 'whatsapp',
      message_type: 'text'
    }
  };
  
  console.log(`🧪 Test message: ${messageData.data.content}`);
  
  // Broadcast via WebSocket
  const wss = app.locals.wss;
  if (wss && wss.broadcastWhatsAppMessage) {
    wss.broadcastWhatsAppMessage(messageData.data);
    console.log('📡 Test message broadcasted');
  } else {
    broadcastToWebSocket(app, messageData);
  }
}

// Process WhatsApp status updates
function processWhatsAppStatus(status, app) {
  console.log('📱 WhatsApp status update:', status.status);
  
  const statusData = {
    type: 'whatsapp_status',
    data: {
      message_id: status.id,
      status: status.status,
      timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
      recipient_id: status.recipient_id,
      conversation_id: `whatsapp_${status.recipient_id}`
    }
  };
  
  if (status.conversation) {
    statusData.data.conversation = status.conversation;
  }
  
  if (status.pricing) {
    statusData.data.pricing = status.pricing;
  }
  
  // Broadcast to WebSocket
  const wss = app.locals.wss;
  if (wss && wss.broadcastToAll) {
    wss.broadcastToAll(statusData);
    console.log('📡 Status update broadcasted');
  } else {
    broadcastToWebSocket(app, statusData);
  }
}

// Test WhatsApp endpoint
router.post('/send-test', async (req, res) => {
  try {
    const { to, message, conversation_id } = req.body;
    
    console.log(`📱 Test WhatsApp message to ${to}: ${message}`);
    
    // Simulate receiving a WhatsApp message
    const simulatedMessage = {
      type: 'whatsapp_message',
      data: {
        message_id: `wa_test_${Date.now()}_${uuidv4().substr(0, 8)}`,
        from: to,
        from_name: 'Test Customer',
        body: message,
        content: message,
        conversation_id: conversation_id || `whatsapp_${to}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        platform: 'whatsapp',
        message_type: 'text'
      }
    };
    
    // Broadcast via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastWhatsAppMessage) {
      wss.broadcastWhatsAppMessage(simulatedMessage.data);
      console.log('📡 Test message broadcasted via WebSocket');
    } else {
      broadcastToWebSocket(req.app, simulatedMessage);
    }
    
    res.json({
      success: true,
      message: 'Test WhatsApp message processed',
      message_id: simulatedMessage.data.message_id
    });
    
  } catch (error) {
    console.error('❌ Error sending test WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test message' 
    });
  }
});

// Simulate WhatsApp message endpoint
router.post('/simulate', async (req, res) => {
  try {
    const { from, message, conversation_id } = req.body;
    
    console.log('🧪 Simulating WhatsApp message:', { from, message });
    
    // Process as if it came from WhatsApp
    await processDirectWhatsAppMessage({
      from: from || '+27721234567',
      from_name: 'Test Customer',
      body: message || 'Test WhatsApp message from simulation',
      conversation_id: conversation_id || `whatsapp_${from || 'test'}_${Date.now()}`
    }, req.app);
    
    res.json({
      success: true,
      message: 'Simulation sent',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error simulating message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to simulate message' 
    });
  }
});

// Broadcast to WebSocket server
function broadcastToWebSocket(app, data) {
  try {
    const wss = app.locals.wss;
    
    if (wss && wss.clients) {
      wss.clients.forEach((client) => {
        if (client.readyState === require('ws').OPEN) {
          client.send(JSON.stringify(data));
        }
      });
      console.log('📡 Broadcasted to WebSocket:', data.type);
    } else {
      console.log('⚠️ WebSocket server not available for broadcasting');
    }
  } catch (error) {
    console.error('❌ Error broadcasting to WebSocket:', error);
  }
}

module.exports = router;