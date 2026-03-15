const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// --- DEPENDENCY SETUP ---
// Dependencies must be imported or accessed via app.locals, similar to server.js context.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Middleware injection to get database access (assumes app.locals.db is set by server.js)
router.use(async (req, res, next) => {
    const dbOperations = req.app.locals.db;
    if (!dbOperations) {
        return res.status(500).json({ success: false, error: 'Database operations not available via router context' });
    }
    req.dbOperations = dbOperations;
    next();
});

// Re-declare middlewares for file self-sufficiency
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => { 
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const checkUserStatus = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    try {
        const user = req.user;
        let userTable, userIdColumn;
        
        if (user.role === 'customer' || user.userType === 'customer') {
            userTable = 'customers';
            userIdColumn = 'customer_id';
        } else if (user.role === 'event_manager' || user.userType === 'event_manager') {
            userTable = 'event_managers';
            userIdColumn = 'manager_id';
        } else if (user.role === 'admin' || user.userType === 'admin' || user.role === 'SUPER_ADMIN') {
            userTable = 'admins';
            userIdColumn = 'admin_id';
        } else if (user.role === 'support' || user.userType === 'support') {
            userTable = 'support_staff';
            userIdColumn = 'support_id';
        } else if (user.role === 'event_organizer' || user.userType === 'event_organizer') {
            userTable = 'event_organizers';
            userIdColumn = 'organizer_id';
        } else {
            return next();
        }

        const dbUser = await req.dbOperations.get(
            `SELECT status FROM ${userTable} WHERE ${userIdColumn} = ?`,
            [user[userIdColumn] || user.userId]
        );

        if (dbUser && dbUser.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account has been suspended. Please contact administrator.' 
            });
        }

        if (dbUser && dbUser.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account is inactive. Please contact administrator.' 
            });
        }

        next();
    } catch (err) {
        console.error('User status check error:', err);
        next(); 
    }
};


// --- SUPPORT CHAT API ENDPOINTS ---

// Get all conversations for an agent
router.get('/', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { agent_id, platform } = req.query;
    
    let query = `
      SELECT 
        c.*,
        (SELECT content FROM support_messages WHERE conversation_id = c.conversation_id ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT timestamp FROM support_messages WHERE conversation_id = c.conversation_id ORDER BY timestamp DESC LIMIT 1) as last_message_time,
        COUNT(DISTINCT m.message_id) as total_messages,
        SUM(CASE WHEN m.is_read = 0 AND m.sender_type = 'customer' THEN 1 ELSE 0 END) as unread_count
      FROM support_conversations c
      LEFT JOIN support_messages m ON c.conversation_id = m.conversation_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (agent_id && agent_id !== 'all') {
      query += ` AND c.assigned_agent_id = ?`;
      params.push(agent_id);
    }
    
    if (platform && platform !== 'all') {
      query += ` AND c.platform = ?`;
      params.push(platform);
    }
    
    query += ` GROUP BY c.conversation_id ORDER BY c.last_activity DESC`;
    
    const conversations = await req.dbOperations.all(query, params);
    
    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        conversation_id: conv.conversation_id,
        platform: conv.platform,
        customer_name: conv.customer_name,
        customer_id: conv.customer_id,
        assigned_agent_id: conv.assigned_agent_id,
        status: conv.status,
        created_at: conv.created_at,
        last_activity: conv.last_activity,
        last_message: conv.last_message || 'No messages yet',
        last_message_time: conv.last_message_time || conv.created_at,
        unread_count: conv.unread_count || 0,
        total_messages: conv.total_messages || 0
      }))
    });
    
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const messages = await req.dbOperations.all(
      `SELECT * FROM support_messages WHERE conversation_id = ? ORDER BY timestamp ASC`,
      [conversationId]
    );
    
    // Mark messages as read when fetched
    if (messages.length > 0) {
      await req.dbOperations.run(
        `UPDATE support_messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = 'customer'`,
        [conversationId]
      );
    }
    
    res.json({
      success: true,
      messages: messages || []
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/messages', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const messageData = req.body;
    
    // Validate required fields
    if (!messageData.conversation_id || !messageData.content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const messageId = `msg_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    
    // Save message to database
    await req.dbOperations.run(
      `INSERT OR IGNORE INTO support_messages (
        message_id, conversation_id, sender_id,
        sender_name, sender_type, content,
        timestamp, platform, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.sender_name,
        messageData.sender_type,
        messageData.content,
        now,
        messageData.platform,
        messageData.sender_type === 'support' ? 1 : 0
      ]
    );
    
    // Update conversation last activity
    await req.dbOperations.run(
      `UPDATE support_conversations 
       SET last_activity = ?
       WHERE conversation_id = ?`,
      [now, messageData.conversation_id]
    );
    
    // Create response with server-generated ID
    const responseMessage = {
      ...messageData,
      message_id: messageId,
      timestamp: now,
      is_read: messageData.sender_type === 'support' ? 1 : 0
    };
    
    res.json({
      success: true,
      message: responseMessage
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get agent status
router.get('/agent-status', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { agent_id } = req.query;
    
    const status = await req.dbOperations.get(
      `SELECT * FROM support_agent_status WHERE agent_id = ?`,
      [agent_id]
    );
    
    res.json({
      success: true,
      status: status?.status || 'available',
      auto_assign: status?.auto_assign || 1
    });
    
  } catch (error) {
    console.error('Error fetching agent status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent status' });
  }
});

// Update agent status
router.put('/agent-status', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { agent_id, status, auto_assign } = req.body;
    
    const existing = await req.dbOperations.get(
      `SELECT * FROM support_agent_status WHERE agent_id = ?`,
      [agent_id]
    );
    
    if (existing) {
      await req.dbOperations.run(
        `UPDATE support_agent_status 
         SET status = ?, auto_assign = ?, last_active = ?
         WHERE agent_id = ?`,
        [status, auto_assign, new Date().toISOString(), agent_id]
      );
    } else {
      await req.dbOperations.run(
        `INSERT OR IGNORE INTO support_agent_status (agent_id, status, auto_assign, last_active)
         VALUES (?, ?, ?, ?)`,
        [agent_id, status, auto_assign, new Date().toISOString()]
      );
    }
    
    res.json({
      success: true,
      message: 'Agent status updated'
    });
    
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ success: false, error: 'Failed to update agent status' });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await req.dbOperations.run(
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
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

// Resolve conversation
router.post('/conversations/:conversationId/resolve', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agent_id } = req.body;
    
    await req.dbOperations.run(
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
    console.error('Error resolving conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve conversation' });
  }
});

// Reopen conversation
router.post('/conversations/:conversationId/reopen', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { agent_id } = req.body;
    
    await req.dbOperations.run(
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
    console.error('Error reopening conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to reopen conversation' });
  }
});

// Create new conversation (Manual creation by agent/admin)
router.post('/', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { platform, customer_name, customer_phone, customer_email, assigned_agent_id, initial_message, customer_id } = req.body;
    
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    // Create conversation
    await req.dbOperations.run(
      `INSERT OR IGNORE INTO support_conversations (
        conversation_id, platform, customer_id, 
        customer_name, customer_phone, customer_email, assigned_agent_id, status,
        created_at, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        platform || 'web',
        customer_id || `MANUAL_${Date.now()}`,
        customer_name || 'Manual Customer',
        customer_phone || null,
        customer_email || null,
        assigned_agent_id || null,
        'active',
        now,
        now
      ]
    );
    
    // Add initial message if provided
    if (initial_message) {
      const messageId = `msg_${Date.now()}_${uuidv4().substring(0, 8)}`;
      await req.dbOperations.run(
        `INSERT OR IGNORE INTO support_messages (
          message_id, conversation_id, sender_id,
          sender_name, sender_type, content,
          timestamp, platform, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          conversationId,
          assigned_agent_id || 'system_manual',
          'Support Agent',
          'support',
          initial_message || 'Hello! How can I help you today?',
          now,
          platform || 'web',
          1
        ]
      );
    }
    
    // Get the created conversation
    const conversation = await req.dbOperations.get(
      `SELECT * FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    
    res.json({
      success: true,
      conversation,
      message: 'Conversation created successfully'
    });
    
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

module.exports = router;

