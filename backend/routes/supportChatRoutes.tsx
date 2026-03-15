const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Get conversations with filters
router.get('/conversations', async (req, res) => {
  try {
    console.log('📋 Fetching conversations for agent:', req.query.agent_id);
    
    const { agent_id, platform = 'all' } = req.query;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    let query = `
      SELECT 
        sc.*,
        (SELECT content FROM support_messages 
         WHERE conversation_id = sc.conversation_id 
         ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT timestamp FROM support_messages 
         WHERE conversation_id = sc.conversation_id 
         ORDER BY timestamp DESC LIMIT 1) as last_message_time,
        COUNT(sm.message_id) as total_messages,
        SUM(CASE WHEN sm.is_read = 0 AND sm.sender_type = 'customer' THEN 1 ELSE 0 END) as unread_count
      FROM support_conversations sc
      LEFT JOIN support_messages sm ON sc.conversation_id = sm.conversation_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by assigned agent
    if (agent_id !== 'all') {
      query += ` AND (sc.assigned_agent_id = ? OR sc.assigned_agent_id IS NULL)`;
      params.push(agent_id);
    }
    
    // Filter by platform
    if (platform && platform !== 'all') {
      query += ` AND sc.platform = ?`;
      params.push(platform);
    }
    
    query += ` GROUP BY sc.conversation_id ORDER BY sc.last_activity DESC`;
    
    console.log('Executing query:', query, params);
    
    const conversations = await db.dbOperations.all(query, params);
    
    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        ...conv,
        unread_count: conv.unread_count || 0,
        total_messages: conv.total_messages || 0,
        last_message: conv.last_message || 'No messages yet',
        last_message_time: conv.last_message_time || conv.created_at
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversations',
      details: error.message 
    });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`📨 Fetching messages for conversation: ${conversationId}`);
    
    const db = req.app.locals.db;
    
    const messages = await db.dbOperations.all(
      `SELECT * FROM support_messages 
       WHERE conversation_id = ? 
       ORDER BY timestamp ASC`,
      [conversationId]
    );
    
    // Mark messages as read when fetched
    if (messages.length > 0) {
      await db.dbOperations.run(
        `UPDATE support_messages 
         SET is_read = 1 
         WHERE conversation_id = ? AND sender_type = 'customer'`,
        [conversationId]
      );
    }
    
    res.json({
      success: true,
      messages: messages || [],
      count: messages.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch messages' 
    });
  }
});

// Send message - UPDATED with simplified logic
router.post('/messages', async (req, res) => {
  try {
    const message = req.body;
    const db = req.app.locals.db;
    
    console.log(`📤 Sending message to conversation: ${message.conversation_id}`);
    
    if (!message.conversation_id || !message.content || !message.sender_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation ID, content, and sender ID are required' 
      });
    }
    
    const messageId = `msg_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    await db.dbOperations.run(
      `INSERT INTO support_messages (message_id, conversation_id, sender_id, sender_type, content, timestamp, platform) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, message.conversation_id, message.sender_id, 'support', message.content, timestamp, message.platform || 'whatsapp']
    );

    // Update conversation last activity
    await db.dbOperations.run(
      `UPDATE support_conversations SET last_activity = ? WHERE conversation_id = ?`,
      [timestamp, message.conversation_id]
    );
    
    // Update conversation last message
    await db.dbOperations.run(
      `UPDATE support_conversations 
       SET last_message = ?, last_message_time = ?
       WHERE conversation_id = ?`,
      [message.content, timestamp, message.conversation_id]
    );
    
    // Get the saved message
    const savedMessage = await db.dbOperations.get(
      `SELECT * FROM support_messages WHERE message_id = ?`,
      [messageId]
    );
    
    // Broadcast via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastToConversation) {
      wss.broadcastToConversation(message.conversation_id, {
        type: 'new_message',
        data: savedMessage
      }, message.sender_id);
    }
    
    res.json({ 
      success: true, 
      message_id: messageId,
      message: savedMessage
    });
    
  } catch (error) {
    console.error('❌ Error saving message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Alternative message endpoint for compatibility
router.post('/messages/send', async (req, res) => {
  try {
    const message = req.body;
    
    console.log(`📤 [send] Sending message to conversation: ${message.conversation_id}`);
    
    if (!message.conversation_id || !message.content || !message.agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation ID, content, and agent ID are required' 
      });
    }
    
    const db = req.app.locals.db;
    
    // Generate message ID if not provided
    const messageId = message.message_id || `msg_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const timestamp = message.timestamp || new Date().toISOString();
    
    // Insert message
    await db.dbOperations.run(
      `INSERT INTO support_messages (
        message_id, conversation_id, sender_id,
        sender_name, sender_type, content,
        timestamp, platform, is_read, delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        message.conversation_id,
        message.agent_id,
        message.sender_name || 'Support Agent',
        'support',
        message.content,
        timestamp,
        message.platform || 'whatsapp',
        1, // Support messages are auto-read
        1  // Delivered
      ]
    );
    
    // Update conversation last message
    await db.dbOperations.run(
      `UPDATE support_conversations 
       SET last_activity = ?, last_message = ?, last_message_time = ?
       WHERE conversation_id = ?`,
      [
        timestamp,
        message.content,
        timestamp,
        message.conversation_id
      ]
    );
    
    // Get the saved message
    const savedMessage = await db.dbOperations.get(
      `SELECT * FROM support_messages WHERE message_id = ?`,
      [messageId]
    );
    
    // Broadcast via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastToConversation) {
      wss.broadcastToConversation(message.conversation_id, {
        type: 'new_message',
        data: savedMessage
      }, message.agent_id);
    }
    
    res.json({
      success: true,
      message: savedMessage
    });
    
  } catch (error) {
    console.error('❌ Error saving message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save message' 
    });
  }
});

// Get agent status
router.get('/agent-status', async (req, res) => {
  try {
    const { agent_id } = req.query;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    const status = await db.dbOperations.get(
      `SELECT * FROM support_agent_status WHERE agent_id = ?`,
      [agent_id]
    );
    
    res.json({
      success: true,
      status: status?.status || 'available',
      auto_assign: status?.auto_assign || 1,
      last_active: status?.last_active
    });
    
  } catch (error) {
    console.error('❌ Error fetching agent status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agent status' 
    });
  }
});

// Update agent status
router.put('/agent-status', async (req, res) => {
  try {
    const { agent_id, status, auto_assign } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    const existing = await db.dbOperations.get(
      `SELECT * FROM support_agent_status WHERE agent_id = ?`,
      [agent_id]
    );
    
    if (existing) {
      await db.dbOperations.run(
        `UPDATE support_agent_status 
         SET status = ?, auto_assign = ?, last_active = ?
         WHERE agent_id = ?`,
        [status, auto_assign, new Date().toISOString(), agent_id]
      );
    } else {
      await db.dbOperations.run(
        `INSERT INTO support_agent_status (agent_id, status, auto_assign, last_active)
         VALUES (?, ?, ?, ?)`,
        [agent_id, status, auto_assign, new Date().toISOString()]
      );
    }
    
    // Broadcast status update via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastToAll) {
      wss.broadcastToAll({
        type: 'agent_status_updated',
        data: {
          agent_id,
          status,
          auto_assign,
          timestamp: new Date().toISOString()
        }
      }, agent_id);
    }
    
    res.json({
      success: true,
      message: 'Agent status updated'
    });
    
  } catch (error) {
    console.error('❌ Error updating agent status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update agent status' 
    });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agent_id } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    await db.dbOperations.run(
      `UPDATE support_messages 
       SET is_read = 1 
       WHERE conversation_id = ? AND sender_type = 'customer'`,
      [conversationId]
    );
    
    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
    
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark as read' 
    });
  }
});

// Resolve conversation
router.post('/conversations/:conversationId/resolve', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agent_id } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    await db.dbOperations.run(
      `UPDATE support_conversations 
       SET status = 'resolved', resolved_at = ?, resolved_by = ?
       WHERE conversation_id = ?`,
      [new Date().toISOString(), agent_id, conversationId]
    );
    
    res.json({
      success: true,
      message: 'Conversation resolved'
    });
    
  } catch (error) {
    console.error('❌ Error resolving conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resolve conversation' 
    });
  }
});

// Reopen conversation
router.post('/conversations/:conversationId/reopen', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agent_id } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent ID is required' 
      });
    }
    
    const db = req.app.locals.db;
    
    await db.dbOperations.run(
      `UPDATE support_conversations 
       SET status = 'active', resolved_at = NULL, resolved_by = NULL
       WHERE conversation_id = ?`,
      [conversationId]
    );
    
    res.json({
      success: true,
      message: 'Conversation reopened'
    });
    
  } catch (error) {
    console.error('❌ Error reopening conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reopen conversation' 
    });
  }
});

// Create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { platform, customer_name, customer_phone, agent_id, initial_message } = req.body;
    
    if (!platform || !customer_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Platform and customer name are required' 
      });
    }
    
    const db = req.app.locals.db;
    
    const conversationId = `conv_${platform}_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const customerId = `cust_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const now = new Date().toISOString();
    
    // Create conversation
    await db.dbOperations.run(
      `INSERT INTO support_conversations (
        conversation_id, platform, customer_id, 
        customer_name, customer_phone, assigned_agent_id, status,
        created_at, last_activity, last_message, last_message_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        platform,
        customerId,
        customer_name,
        customer_phone,
        agent_id,
        'active',
        now,
        now,
        initial_message || 'Conversation started',
        now
      ]
    );
    
    // Add initial message if provided
    if (initial_message) {
      const messageId = `msg_${Date.now()}_${uuidv4().substr(0, 8)}`;
      await db.dbOperations.run(
        `INSERT INTO support_messages (
          message_id, conversation_id, sender_id,
          sender_name, sender_type, content,
          timestamp, platform, is_read, delivered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          conversationId,
          agent_id || 'system',
          agent_id ? 'Support Agent' : 'System',
          agent_id ? 'support' : 'system',
          initial_message,
          now,
          platform,
          1,
          1
        ]
      );
    }
    
    // Get the created conversation
    const conversation = await db.dbOperations.get(
      `SELECT * FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    
    // Broadcast new conversation via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastToAll) {
      wss.broadcastToAll({
        type: 'new_conversation',
        data: {
          conversation,
          platform,
          timestamp: now
        }
      });
    }
    
    res.json({
      success: true,
      conversation,
      message: 'Conversation created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create conversation' 
    });
  }
});

// Send WhatsApp message
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, conversation_id, agent_id } = req.body;
    
    console.log(`📱 Sending WhatsApp message to ${to}: ${message}`);
    
    if (!to || !message || !conversation_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient, message, and conversation ID are required' 
      });
    }
    
    const db = req.app.locals.db;
    
    // Save message to database
    const messageId = `wa_sent_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const now = new Date().toISOString();
    
    await db.dbOperations.run(
      `INSERT INTO support_messages (
        message_id, conversation_id, sender_id,
        sender_name, sender_type, content,
        timestamp, platform, is_read, delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        conversation_id,
        agent_id || 'system',
        'Support Agent',
        'support',
        message,
        now,
        'whatsapp',
        1,
        1
      ]
    );
    
    // Update conversation last message
    await db.dbOperations.run(
      `UPDATE support_conversations 
       SET last_activity = ?, last_message = ?, last_message_time = ?
       WHERE conversation_id = ?`,
      [now, message, now, conversation_id]
    );
    
    // In a real implementation, you would call WhatsApp API here
    // For now, we'll simulate successful send
    
    // Broadcast via WebSocket
    const wss = req.app.locals.wss;
    if (wss && wss.broadcastToConversation) {
      wss.broadcastToConversation(conversation_id, {
        type: 'whatsapp_sent',
        data: {
          conversation_id,
          message_id: messageId,
          to,
          message,
          status: 'sent',
          timestamp: now
        }
      });
    }
    
    res.json({
      success: true,
      message_id: messageId,
      status: 'sent',
      timestamp: now
    });
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send WhatsApp message' 
    });
  }
});

// Test endpoint for WhatsApp (from original file)
router.post('/whatsapp/test', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    // Simulate receiving a WhatsApp message
    const simulatedMessage = {
      type: 'whatsapp_message',
      data: {
        message_id: `wa_test_${Date.now()}`,
        from: to,
        from_name: 'Test Customer',
        body: message,
        conversation_id: `whatsapp_${to}`,
        timestamp: new Date().toISOString(),
        platform: 'whatsapp',
        message_type: 'text'
      }
    };
    
    // Broadcast via WebSocket if available
    if (req.app.locals.wss) {
      req.app.locals.wss.clients.forEach((client) => {
        if (client.readyState === require('ws').OPEN) {
          client.send(JSON.stringify(simulatedMessage));
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Test WhatsApp message sent',
      message_id: simulatedMessage.data.message_id
    });
    
  } catch (error) {
    console.error('Error sending test WhatsApp:', error);
    res.status(500).json({ success: false, error: 'Failed to send test message' });
  }
});

module.exports = router;