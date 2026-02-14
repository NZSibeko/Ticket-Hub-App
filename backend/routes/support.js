const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const { v4: uuidv4 } = require('uuid');

// GET all conversations for support agent
router.get('/conversations', async (req, res) => {
  try {
    const { agent_id, platform } = req.query;
    
    let query = `
      SELECT 
        c.*,
        cu.first_name || ' ' || cu.last_name as customer_name,
        (SELECT content FROM messages m 
         WHERE m.conversation_id = c.conversation_id 
         ORDER BY m.timestamp DESC LIMIT 1) as last_message,
        (SELECT timestamp FROM messages m 
         WHERE m.conversation_id = c.conversation_id 
         ORDER BY m.timestamp DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.conversation_id = c.conversation_id 
         AND m.sender_type != 'support' 
         AND m.is_read = 0) as unread_count
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.customer_id
      WHERE c.status != 'archived'
    `;
    
    const params = [];
    
    if (agent_id) {
      query += ' AND c.assigned_agent_id = ?';
      params.push(agent_id);
    }
    
    if (platform && platform !== 'all') {
      query += ' AND c.platform = ?';
      params.push(platform);
    }
    
    query += ' ORDER BY last_message_time DESC';
    
    const conversations = await dbOperations.all(query, params);
    
    res.json({
      success: true,
      conversations: conversations || []
    });
    
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversations' 
    });
  }
});

// GET messages for a conversation
router.get('/conversations/:conversation_id/messages', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    
    const messages = await dbOperations.all(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY timestamp ASC`,
      [conversation_id]
    );
    
    res.json({
      success: true,
      messages: messages || []
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch messages' 
    });
  }
});

// POST send message
router.post('/messages', async (req, res) => {
  try {
    const messageData = req.body;
    
    const messageId = uuidv4();
    
    await dbOperations.run(
      `INSERT INTO messages (
        message_id, conversation_id, sender_id, 
        sender_name, sender_type, content, 
        timestamp, platform, is_read, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.sender_name,
        messageData.sender_type,
        messageData.content,
        messageData.timestamp,
        messageData.platform,
        0, // is_read
        JSON.stringify(messageData.attachments || [])
      ]
    );
    
    // Update conversation last activity
    await dbOperations.run(
      `UPDATE conversations 
       SET last_activity = ?, status = 'active' 
       WHERE conversation_id = ?`,
      [messageData.timestamp, messageData.conversation_id]
    );
    
    // Get the created message
    const message = await dbOperations.get(
      `SELECT * FROM messages WHERE message_id = ?`,
      [messageId]
    );
    
    // Emit via WebSocket if available
    if (req.app.locals.io) {
      req.app.locals.io.emit('new_message', message);
    }
    
    res.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message' 
    });
  }
});

// POST mark conversation as read
router.post('/conversations/:conversation_id/read', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { agent_id } = req.body;
    
    // Mark all messages as read
    await dbOperations.run(
      `UPDATE messages 
       SET is_read = 1, 
           read_at = datetime('now') 
       WHERE conversation_id = ? 
       AND sender_type != 'support'`,
      [conversation_id]
    );
    
    // Update agent's last read
    await dbOperations.run(
      `INSERT OR REPLACE INTO conversation_reads 
       (conversation_id, agent_id, last_read_at) 
       VALUES (?, ?, datetime('now'))`,
      [conversation_id, agent_id]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('message_read', {
        conversation_id,
        reader_id: agent_id
      });
    }
    
    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
    
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark as read' 
    });
  }
});

// POST create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { platform, customer_id, customer_name, agent_id, initial_message } = req.body;
    
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    // Create conversation
    await dbOperations.run(
      `INSERT INTO conversations (
        conversation_id, platform, customer_id, 
        customer_name, assigned_agent_id, 
        status, created_at, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        platform,
        customer_id,
        customer_name,
        agent_id,
        'active',
        now,
        now
      ]
    );
    
    // Add initial message
    const messageId = uuidv4();
    await dbOperations.run(
      `INSERT INTO messages (
        message_id, conversation_id, sender_id, 
        sender_name, sender_type, content, 
        timestamp, platform, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        conversationId,
        agent_id,
        'Support Agent',
        'support',
        initial_message,
        now,
        platform,
        0
      ]
    );
    
    const conversation = await dbOperations.get(
      `SELECT * FROM conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('conversation_assigned', conversation);
    }
    
    res.json({
      success: true,
      conversation: conversation,
      message: 'Conversation created successfully'
    });
    
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create conversation' 
    });
  }
});

// POST resolve conversation
router.post('/conversations/:conversation_id/resolve', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { agent_id } = req.body;
    
    await dbOperations.run(
      `UPDATE conversations 
       SET status = 'resolved', 
           resolved_at = datetime('now'),
           resolved_by = ? 
       WHERE conversation_id = ?`,
      [agent_id, conversation_id]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('conversation_resolved', { conversation_id });
    }
    
    res.json({
      success: true,
      message: 'Conversation resolved successfully'
    });
    
  } catch (error) {
    console.error('Error resolving conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resolve conversation' 
    });
  }
});

// GET/PUT agent status
router.get('/agent-status', async (req, res) => {
  try {
    const { agent_id } = req.query;
    
    const agent = await dbOperations.get(
      `SELECT sa.*, ss.name, ss.email 
       FROM support_agents sa
       LEFT JOIN support_staff ss ON sa.support_id = ss.support_id
       WHERE sa.support_id = ?`,
      [agent_id]
    );
    
    res.json({
      success: true,
      status: agent?.status || 'available',
      auto_assign: agent?.auto_assign || 1,
      agent: agent
    });
    
  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agent status' 
    });
  }
});

router.put('/agent-status', async (req, res) => {
  try {
    const { agent_id, status, auto_assign } = req.body;
    
    await dbOperations.run(
      `UPDATE support_agents 
       SET status = ?, auto_assign = ?, last_status_update = datetime('now') 
       WHERE support_id = ?`,
      [status, auto_assign ? 1 : 0, agent_id]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('agent_status_update', { 
        agent_id, 
        status 
      });
    }
    
    res.json({
      success: true,
      message: 'Agent status updated'
    });
    
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update agent status' 
    });
  }
});

// GET assign new conversation to available agent
router.get('/assign-conversation', async (req, res) => {
  try {
    const { platform, customer_id, customer_name } = req.query;
    
    // Find available agent with auto-assign enabled
    const availableAgent = await dbOperations.get(
      `SELECT * FROM support_agents 
       WHERE status = 'available' 
       AND auto_assign = 1 
       AND current_conversations < max_conversations
       ORDER BY last_assigned_at ASC 
       LIMIT 1`
    );
    
    if (!availableAgent) {
      return res.status(400).json({
        success: false,
        error: 'No available agents'
      });
    }
    
    // Create conversation
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    await dbOperations.run(
      `INSERT INTO conversations (
        conversation_id, platform, customer_id, 
        customer_name, assigned_agent_id, 
        status, created_at, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        platform,
        customer_id,
        customer_name,
        availableAgent.support_id,
        'active',
        now,
        now
      ]
    );
    
    // Update agent's current conversation count
    await dbOperations.run(
      `UPDATE support_agents 
       SET current_conversations = current_conversations + 1,
           last_assigned_at = datetime('now') 
       WHERE support_id = ?`,
      [availableAgent.support_id]
    );
    
    const conversation = await dbOperations.get(
      `SELECT * FROM conversations WHERE conversation_id = ?`,
      [conversationId]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('conversation_assigned', conversation);
    }
    
    res.json({
      success: true,
      conversation: conversation,
      assigned_agent: availableAgent
    });
    
  } catch (error) {
    console.error('Error assigning conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign conversation' 
    });
  }
});

// Support dashboard stats (enhanced)
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get support ticket stats
    const ticketsResult = await dbOperations.get(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
              SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM support_tickets`
    );
    
    // Get conversation stats
    const conversationsResult = await dbOperations.get(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
              SUM(CASE WHEN platform = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
              SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook,
              SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END) as instagram,
              SUM(CASE WHEN platform = 'twitter' THEN 1 ELSE 0 END) as twitter,
              SUM(CASE WHEN platform = 'tiktok' THEN 1 ELSE 0 END) as tiktok
       FROM conversations`
    );
    
    // Get today's resolved tickets
    const todayResolved = await dbOperations.get(
      `SELECT COUNT(*) as count 
       FROM support_tickets 
       WHERE status = 'resolved' AND DATE(resolved_at) = DATE('now')`
    );
    
    // Get assigned tickets for this support staff
    const myTickets = await dbOperations.get(
      `SELECT COUNT(*) as count 
       FROM support_tickets 
       WHERE support_id = ? AND status = 'open'`,
      [userId]
    );
    
    // Get agent's assigned conversations
    const myConversations = await dbOperations.get(
      `SELECT COUNT(*) as count,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM conversations 
       WHERE assigned_agent_id = ?`,
      [userId]
    );
    
    // Get recent conversations for this agent
    const recentConversations = await dbOperations.all(
      `SELECT c.*, 
              (SELECT content FROM messages m 
               WHERE m.conversation_id = c.conversation_id 
               ORDER BY m.timestamp DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.assigned_agent_id = ?
       ORDER BY c.last_activity DESC
       LIMIT 10`,
      [userId]
    );
    
    // Get urgent tickets
    const urgentTickets = await dbOperations.all(
      `SELECT * FROM support_tickets 
       WHERE priority = 'urgent' AND status = 'open'
       ORDER BY created_at DESC
       LIMIT 10`
    );
    
    // Calculate average response time (in minutes)
    const responseTimeResult = await dbOperations.get(
      `SELECT AVG(
         (julianday(first_response) - julianday(created_at)) * 24 * 60
       ) as avg_response_minutes
       FROM (
         SELECT t.ticket_id, t.created_at,
                MIN(r.created_at) as first_response
         FROM support_tickets t
         LEFT JOIN ticket_responses r ON t.ticket_id = r.ticket_id
         WHERE r.response_type = 'agent'
         GROUP BY t.ticket_id
       )`
    );
    
    const avgResponseTime = responseTimeResult?.avg_response_minutes 
      ? `${Math.round(responseTimeResult.avg_response_minutes)} mins` 
      : 'N/A';
    
    res.json({
      success: true,
      data: {
        stats: {
          // Ticket stats
          totalTickets: ticketsResult?.total || 0,
          openTickets: ticketsResult?.open || 0,
          resolvedTickets: ticketsResult?.resolved || 0,
          resolvedToday: todayResolved?.count || 0,
          myOpenTickets: myTickets?.count || 0,
          averageResponseTime: avgResponseTime,
          
          // Conversation stats
          totalConversations: conversationsResult?.total || 0,
          activeConversations: conversationsResult?.active || 0,
          resolvedConversations: conversationsResult?.resolved || 0,
          myActiveConversations: myConversations?.active || 0,
          myResolvedConversations: myConversations?.resolved || 0,
          
          // Platform breakdown
          whatsappChats: conversationsResult?.whatsapp || 0,
          facebookChats: conversationsResult?.facebook || 0,
          instagramChats: conversationsResult?.instagram || 0,
          twitterChats: conversationsResult?.twitter || 0,
          tiktokChats: conversationsResult?.tiktok || 0
        },
        recentConversations: recentConversations || [],
        urgentTickets: urgentTickets || [],
        agentPerformance: {
          satisfactionRating: '95%',
          responseRate: '98%',
          resolutionRate: '92%'
        }
      }
    });
  } catch (error) {
    console.error('[SUPPORT] Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// Update support staff availability
router.put('/availability', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.body;
    
    await dbOperations.run(
      `UPDATE support_staff SET availability_status = ? WHERE support_id = ?`,
      [status, userId]
    );
    
    // Also update support_agents table
    await dbOperations.run(
      `UPDATE support_agents SET status = ? WHERE support_id = ?`,
      [status, userId]
    );
    
    // Emit via WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('agent_status_update', {
        agent_id: userId,
        status: status
      });
    }
    
    res.json({
      success: true,
      message: `Availability updated to ${status}`
    });
  } catch (error) {
    console.error('[SUPPORT] Availability update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update availability' });
  }
});

// Get support staff profile (enhanced)
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get basic profile info
    const user = await dbOperations.get(
      `SELECT support_id, name, email, phone, department, role, availability_status, 
              max_tickets, current_tickets, avg_response_time, satisfaction_rating,
              created_at
       FROM support_staff WHERE support_id = ?`,
      [userId]
    );
    
    // Get agent status info
    const agentStatus = await dbOperations.get(
      `SELECT status, auto_assign, current_conversations, max_conversations,
              performance_score, last_status_update
       FROM support_agents WHERE support_id = ?`,
      [userId]
    );
    
    // Get performance metrics
    const performance = await dbOperations.get(
      `SELECT 
         COUNT(DISTINCT c.conversation_id) as total_conversations,
         SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved_conversations,
         AVG((julianday(c.resolved_at) - julianday(c.created_at)) * 24 * 60) as avg_resolution_time
       FROM conversations c
       WHERE c.assigned_agent_id = ? AND c.resolved_at IS NOT NULL`,
      [userId]
    );
    
    res.json({ 
      success: true, 
      data: {
        profile: user,
        agentStatus: agentStatus,
        performance: {
          totalConversations: performance?.total_conversations || 0,
          resolvedConversations: performance?.resolved_conversations || 0,
          resolutionRate: performance?.total_conversations 
            ? Math.round((performance.resolved_conversations / performance.total_conversations) * 100)
            : 0,
          avgResolutionTime: performance?.avg_resolution_time 
            ? `${Math.round(performance.avg_resolution_time)} mins`
            : 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('[SUPPORT] Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// Get conversation analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const userId = req.user.userId;
    
    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "DATE(last_activity) = DATE('now')";
        break;
      case 'week':
        dateFilter = "DATE(last_activity) >= DATE('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "DATE(last_activity) >= DATE('now', '-30 days')";
        break;
      default:
        dateFilter = "DATE(last_activity) >= DATE('now', '-7 days')";
    }
    
    // Get conversation trends
    const trends = await dbOperations.all(
      `SELECT DATE(last_activity) as date,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM conversations
       WHERE ${dateFilter}
       GROUP BY DATE(last_activity)
       ORDER BY date`
    );
    
    // Get platform distribution
    const platforms = await dbOperations.all(
      `SELECT platform, COUNT(*) as count
       FROM conversations
       WHERE ${dateFilter}
       GROUP BY platform
       ORDER BY count DESC`
    );
    
    // Get response time analysis
    const responseTimes = await dbOperations.all(
      `SELECT 
         strftime('%H', m.timestamp) as hour,
         AVG(
           (julianday(m.timestamp) - julianday(
             (SELECT timestamp FROM messages m2 
              WHERE m2.conversation_id = m.conversation_id 
                AND m2.message_id != m.message_id
                AND m2.sender_type != m.sender_type
              ORDER BY m2.timestamp DESC LIMIT 1)
           )) * 24 * 60
         ) as avg_response_minutes
       FROM messages m
       WHERE m.sender_type = 'support' 
         AND ${dateFilter.replace('last_activity', 'm.timestamp')}
       GROUP BY strftime('%H', m.timestamp)
       ORDER BY hour`
    );
    
    res.json({
      success: true,
      data: {
        trends: trends || [],
        platforms: platforms || [],
        responseTimes: responseTimes || [],
        period: period
      }
    });
    
  } catch (error) {
    console.error('[SUPPORT] Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to load analytics' });
  }
});

// Search conversations
router.get('/search', async (req, res) => {
  try {
    const { query, platform } = req.query;
    const userId = req.user.userId;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }
    
    let searchQuery = `
      SELECT DISTINCT c.*,
             cu.first_name || ' ' || cu.last_name as customer_name
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.customer_id
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      WHERE (c.customer_name LIKE ? OR c.customer_id LIKE ? OR m.content LIKE ?)
        AND c.assigned_agent_id = ?
    `;
    
    const params = [`%${query}%`, `%${query}%`, `%${query}%`, userId];
    
    if (platform && platform !== 'all') {
      searchQuery += ' AND c.platform = ?';
      params.push(platform);
    }
    
    searchQuery += ' ORDER BY c.last_activity DESC LIMIT 20';
    
    const results = await dbOperations.all(searchQuery, params);
    
    res.json({
      success: true,
      data: results || []
    });
    
  } catch (error) {
    console.error('[SUPPORT] Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// Export conversation as PDF/txt
router.get('/conversations/:conversation_id/export', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { format = 'txt' } = req.query;
    
    // Get conversation details
    const conversation = await dbOperations.get(
      `SELECT c.*, cu.first_name || ' ' || cu.last_name as customer_name
       FROM conversations c
       LEFT JOIN customers cu ON c.customer_id = cu.customer_id
       WHERE c.conversation_id = ?`,
      [conversation_id]
    );
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    // Get all messages
    const messages = await dbOperations.all(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY timestamp ASC`,
      [conversation_id]
    );
    
    if (format === 'txt') {
      // Create text format
      let textContent = `Conversation Export\n`;
      textContent += `==================\n\n`;
      textContent += `Customer: ${conversation.customer_name}\n`;
      textContent += `Platform: ${conversation.platform}\n`;
      textContent += `Conversation ID: ${conversation.conversation_id}\n`;
      textContent += `Created: ${conversation.created_at}\n`;
      textContent += `Status: ${conversation.status}\n\n`;
      textContent += `Messages:\n`;
      textContent += `=========\n\n`;
      
      messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        textContent += `[${timestamp}] ${msg.sender_name} (${msg.sender_type}):\n`;
        textContent += `${msg.content}\n\n`;
      });
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversation_id}.txt"`);
      res.send(textContent);
      
    } else if (format === 'json') {
      // JSON format
      const exportData = {
        conversation: conversation,
        messages: messages,
        exportDate: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversation_id}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
      
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
    }
    
  } catch (error) {
    console.error('[SUPPORT] Export error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

module.exports = router;