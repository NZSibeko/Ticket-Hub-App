// websocket-server.js - DEBUGGED AND FIXED VERSION
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const WhatsAppService = require('../services/WhatsAppService');

class WebSocketServer {
  constructor(server, db) {
    this.wss = new WebSocket.Server({ server });
    this.db = db;
    this.connectedAgents = new Map(); // agent_id -> WebSocket
    this.conversationRooms = new Map(); // conversation_id -> Set of WebSocket connections
    this.messageQueue = new Map(); // agent_id -> Array of messages
    
    // Initialize WhatsApp Service
    this.waService = null;
    this.initializeWhatsAppService();
    
    console.log('✅ WebSocket server created');
    this.setupWebSocket();
  }

  initializeWhatsAppService() {
    try {
      const requiredEnvVars = [
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_VERIFY_TOKEN'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn(`⚠️ WhatsApp Service disabled - Missing env vars: ${missingVars.join(', ')}`);
        return;
      }
      
      this.waService = new WhatsAppService();
      console.log('✅ WhatsApp Cloud API initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp Service:', error.message);
      this.waService = null;
    }
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = `client_${Date.now()}_${uuidv4().substr(0, 8)}`;
      ws.id = clientId;
      ws.agentId = null;
      ws.connectedAt = new Date().toISOString();
      ws.conversations = new Set(); // Track conversations this agent is in
      
      console.log(`🔌 New WebSocket connection: ${clientId} (IP: ${req.socket.remoteAddress})`);
      
      // Send welcome message
      this.sendToClient(ws, {
        type: 'welcome',
        data: {
          clientId: clientId,
          message: 'Connected to Support Chat Server',
          timestamp: new Date().toISOString(),
          whatsappEnabled: !!this.waService
        }
      });
      
      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error(`❌ [${clientId}] Error parsing message:`, error.message);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(`🔌 WebSocket connection closed: ${ws.id} (agent: ${ws.agentId || 'none'})`);
        if (ws.agentId) {
          this.connectedAgents.delete(ws.agentId);
          console.log(`👋 Agent ${ws.agentId} disconnected`);
          
          // Remove from all conversation rooms
          this.conversationRooms.forEach((wsConnections, conversationId) => {
            if (wsConnections.has(ws)) {
              wsConnections.delete(ws);
              console.log(`🚪 Removed ${ws.id} from conversation ${conversationId}`);
              if (wsConnections.size === 0) {
                this.conversationRooms.delete(conversationId);
                console.log(`🗑️  Deleted empty conversation room ${conversationId}`);
              }
            }
          });
          
          // Notify other agents
          this.broadcastToAll({
            type: 'agent_disconnected',
            data: {
              agent_id: ws.agentId,
              timestamp: new Date().toISOString()
            }
          }, ws.agentId);
        }
      });
      
      ws.on('error', (error) => {
        console.error(`⚠️ [${clientId}] WebSocket error:`, error);
      });
      
      // Send connection info
      setTimeout(() => {
        this.sendToClient(ws, {
          type: 'connection_info',
          data: {
            clientId: clientId,
            connectedAgents: this.connectedAgents.size,
            activeRooms: this.conversationRooms.size,
            whatsappEnabled: !!this.waService
          }
        });
      }, 100);
    });
    
    // Heartbeat
    setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          this.sendToClient(client, {
            type: 'heartbeat',
            data: { 
              timestamp: new Date().toISOString(),
              whatsappEnabled: !!this.waService
            }
          });
        }
      });
    }, 30000);
    
    console.log('✅ WebSocket server setup complete');
  }

  async handleMessage(ws, message) {
    console.log(`📨 [${ws.id}] [${ws.agentId || 'no-agent'}] Received: ${message.type}`);
    
    switch (message.type) {
      case 'agent_connect':
        await this.handleAgentConnect(ws, message.data);
        break;
        
      case 'join_conversation':
        await this.handleJoinConversation(ws, message.data);
        break;
        
      case 'send_message':
        await this.handleSendMessage(ws, message.data);
        break;
        
      case 'typing_start':
      case 'typing_stop':
        await this.handleTypingIndicator(ws, message);
        break;
        
      case 'agent_status':
        await this.handleAgentStatus(ws, message.data);
        break;
        
      case 'mark_read':
        await this.handleMarkRead(ws, message.data);
        break;
        
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: { 
            timestamp: new Date().toISOString(),
            whatsappEnabled: !!this.waService
          }
        });
        break;
        
      case 'get_conversations':
        await this.handleGetConversations(ws, message.data);
        break;
        
      case 'resolve_conversation':
        await this.handleResolveConversation(ws, message.data);
        break;
        
      case 'reopen_conversation':
        await this.handleReopenConversation(ws, message.data);
        break;
        
      case 'whatsapp_test':
        await this.handleWhatsAppTest(ws, message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  async handleAgentConnect(ws, data) {
    const { agent_id, name, status = 'available', auto_assign = true } = data;
    
    if (!agent_id) {
      this.sendError(ws, 'Agent ID is required');
      return;
    }
    
    // Remove previous connection if exists (prevent duplicates)
    if (this.connectedAgents.has(agent_id)) {
      const oldWs = this.connectedAgents.get(agent_id);
      console.log(`🔄 Agent ${agent_id} reconnecting, closing old connection ${oldWs.id}`);
      oldWs.close();
    }
    
    ws.agentId = agent_id;
    this.connectedAgents.set(agent_id, ws);
    
    console.log(`👤 Agent connected: ${name || 'Unknown'} (${agent_id}) on connection ${ws.id}`);
    
    // Update agent status in database
    try {
      await this.db.dbOperations.run(
        `INSERT OR REPLACE INTO support_agent_status 
         (agent_id, status, auto_assign, last_active) 
         VALUES (?, ?, ?, ?)`,
        [agent_id, status, auto_assign, new Date().toISOString()]
      );
    } catch (error) {
      console.error('❌ Error updating agent status:', error);
    }
    
    // Send confirmation
    this.sendToClient(ws, {
      type: 'connected',
      data: {
        agent_id,
        name,
        status,
        auto_assign,
        timestamp: new Date().toISOString(),
        message: 'Successfully connected as agent',
        server_info: {
          connectedAgents: this.connectedAgents.size,
          activeRooms: this.conversationRooms.size,
          whatsappEnabled: !!this.waService
        }
      }
    });
    
    // Send queued messages
    await this.sendQueuedMessages(agent_id, ws);
    
    // Notify other agents
    this.broadcastToAll({
      type: 'agent_connected',
      data: {
        agent_id,
        name,
        status,
        timestamp: new Date().toISOString()
      }
    }, agent_id);
    
    this.logCurrentState();
  }

  async handleJoinConversation(ws, data) {
    const { conversation_id, agent_id } = data;
    
    if (!conversation_id || !agent_id) {
      this.sendError(ws, 'Conversation ID and Agent ID are required');
      return;
    }
    
    console.log(`👥 Agent ${agent_id} (${ws.id}) joining conversation ${conversation_id}`);
    
    // Verify agent is connected
    if (!this.connectedAgents.has(agent_id)) {
      console.log(`❌ Agent ${agent_id} not found in connected agents`);
      this.sendError(ws, 'Agent not connected');
      return;
    }
    
    if (this.connectedAgents.get(agent_id) !== ws) {
      console.log(`❌ WebSocket mismatch for agent ${agent_id}`);
      this.sendError(ws, 'Connection mismatch');
      return;
    }
    
    // Add WebSocket to conversation room
    if (!this.conversationRooms.has(conversation_id)) {
      this.conversationRooms.set(conversation_id, new Set());
      console.log(`📁 Created new room for conversation ${conversation_id}`);
    }
    
    const room = this.conversationRooms.get(conversation_id);
    room.add(ws);
    ws.conversations.add(conversation_id);
    
    console.log(`✅ Agent ${agent_id} joined conversation ${conversation_id}. Room now has ${room.size} connections`);
    
    // Send conversation history
    try {
      const messages = await this.db.dbOperations.all(
        `SELECT * FROM support_messages 
         WHERE conversation_id = ? 
         ORDER BY timestamp ASC 
         LIMIT 50`,
        [conversation_id]
      );
      
      this.sendToClient(ws, {
        type: 'conversation_history',
        data: {
          conversation_id,
          messages: messages || [],
          timestamp: new Date().toISOString()
        }
      });
      
      // Mark messages as read
      await this.db.dbOperations.run(
        `UPDATE support_messages 
         SET is_read = 1 
         WHERE conversation_id = ? AND sender_type = 'customer'`,
        [conversation_id]
      );
      
      // Send join confirmation
      this.sendToClient(ws, {
        type: 'joined_conversation',
        data: {
          conversation_id,
          timestamp: new Date().toISOString(),
          message: 'Successfully joined conversation',
          room_size: room.size
        }
      });
      
    } catch (error) {
      console.error('❌ Error in join_conversation:', error);
      this.sendError(ws, 'Failed to join conversation');
    }
    
    this.logCurrentState();
  }

  async handleSendMessage(ws, data) {
    const { 
      conversation_id, 
      sender_id, 
      sender_name, 
      sender_type = 'support', 
      content, 
      platform = 'whatsapp',
      recipient_phone
    } = data;
    
    if (!conversation_id || !content || !sender_id) {
      this.sendError(ws, 'Missing required fields');
      return;
    }
    
    console.log(`💬 Agent ${sender_id} (${ws.id}) sending to ${conversation_id}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    
    // FORCE-JOIN: Ensure agent is in conversation room
    if (!this.conversationRooms.has(conversation_id) || 
        !ws.conversations.has(conversation_id)) {
      console.log(`🚨 FORCE-JOINING agent ${sender_id} to conversation ${conversation_id}`);
      
      if (!this.conversationRooms.has(conversation_id)) {
        this.conversationRooms.set(conversation_id, new Set());
      }
      
      const room = this.conversationRooms.get(conversation_id);
      room.add(ws);
      ws.conversations.add(conversation_id);
      
      console.log(`✅ Force-joined. Room now has ${room.size} connections`);
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    try {
      // Save message to database
      await this.db.dbOperations.run(
        `INSERT INTO support_messages 
         (message_id, conversation_id, sender_id, sender_name, 
          sender_type, content, timestamp, platform, is_read, delivered) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId, 
          conversation_id, 
          sender_id, 
          sender_name || 'Support Agent',
          sender_type, 
          content, 
          timestamp, 
          platform, 
          sender_type === 'support' ? 1 : 0,
          0
        ]
      );
      
      // Update conversation
      await this.db.dbOperations.run(
        `UPDATE support_conversations 
         SET last_activity = ?, last_message = ?, last_message_time = ?,
             status = 'active'
         WHERE conversation_id = ?`,
        [timestamp, content, timestamp, conversation_id]
      );
      
      let whatsappStatus = 'not_required';
      let whatsappResult = null;
      
      // Send to WhatsApp
      if (platform === 'whatsapp' && this.waService) {
        try {
          let phoneNumber = recipient_phone;
          
          if (!phoneNumber && conversation_id.startsWith('whatsapp_')) {
            phoneNumber = conversation_id.replace('whatsapp_', '');
          }
          
          if (!phoneNumber) {
            const conversation = await this.db.dbOperations.get(
              `SELECT customer_phone FROM support_conversations WHERE conversation_id = ?`,
              [conversation_id]
            );
            phoneNumber = conversation?.customer_phone;
          }
          
          if (phoneNumber) {
            console.log(`📱 Sending WhatsApp to ${phoneNumber}`);
            whatsappResult = await this.waService.sendMessage(phoneNumber, content);
            
            if (whatsappResult && whatsappResult.success) {
              console.log(`✅ WhatsApp sent successfully`);
              whatsappStatus = 'sent';
              
              await this.db.dbOperations.run(
                `UPDATE support_messages SET delivered = 1 WHERE message_id = ?`,
                [messageId]
              );
            } else {
              console.error(`❌ WhatsApp send failed:`, whatsappResult?.error);
              whatsappStatus = 'failed';
            }
          } else {
            console.warn(`⚠️ No phone number found`);
            whatsappStatus = 'no_phone';
          }
        } catch (whatsappError) {
          console.error("❌ WhatsApp API error:", whatsappError.message);
          whatsappStatus = 'api_error';
        }
      }
      
      // Prepare message data
      const messageData = {
        message_id: messageId,
        conversation_id,
        sender_id,
        sender_name: sender_name || 'Support Agent',
        sender_type,
        content,
        timestamp,
        platform,
        is_read: sender_type === 'support' ? 1 : 0,
        delivered: whatsappStatus === 'sent' ? 1 : 0,
        whatsapp_status: whatsappStatus
      };
      
      // DEBUG: Show room state
      console.log(`\n📡 DEBUG: Room state for ${conversation_id}:`);
      if (this.conversationRooms.has(conversation_id)) {
        const room = this.conversationRooms.get(conversation_id);
        console.log(`   Room exists with ${room.size} connections:`);
        room.forEach(conn => {
          console.log(`   - ${conn.id} (agent: ${conn.agentId || 'none'}) [readyState: ${conn.readyState}]`);
        });
      } else {
        console.log(`   Room does NOT exist!`);
      }
      console.log(`📡 Broadcasting new_message to conversation ${conversation_id}\n`);
      
      // BROADCAST THE MESSAGE
      const recipients = this.broadcastToConversation(conversation_id, {
        type: 'new_message',
        data: messageData
      }, null); // Don't exclude sender - they need to see their message too
      
      // Send confirmation to sender
      this.sendToClient(ws, {
        type: 'message_sent',
        data: {
          message_id: messageId,
          conversation_id,
          timestamp,
          status: 'sent',
          whatsapp_status: whatsappStatus,
          recipients: recipients,
          content_preview: content.substring(0, 100)
        }
      });
      
      console.log(`✅ Message ${messageId} processed. Recipients: ${recipients}`);
      
    } catch (error) {
      console.error('❌ Error saving/sending message:', error);
      this.sendError(ws, 'Failed to send message');
      
      this.sendToClient(ws, {
        type: 'message_failed',
        data: {
          conversation_id,
          message_id: messageId,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    this.logCurrentState();
  }

  async handleTypingIndicator(ws, message) {
    const { conversation_id, user_id } = message.data;
    const agentId = user_id || ws.agentId;
    
    if (!conversation_id) {
      console.warn('⚠️ Typing indicator missing conversation_id');
      return;
    }
    
    console.log(`⌨️  ${message.type} in ${conversation_id} by ${agentId || 'unknown'}`);
    
    // FORCE-JOIN: Ensure agent is in conversation room
    if (!this.conversationRooms.has(conversation_id) || 
        !ws.conversations.has(conversation_id)) {
      console.log(`🚨 FORCE-JOINING agent for typing to ${conversation_id}`);
      
      if (!this.conversationRooms.has(conversation_id)) {
        this.conversationRooms.set(conversation_id, new Set());
      }
      
      const room = this.conversationRooms.get(conversation_id);
      room.add(ws);
      ws.conversations.add(conversation_id);
    }
    
    // Broadcast typing indicator
    this.broadcastToConversation(conversation_id, message, null);
  }

  async handleAgentStatus(ws, data) {
    const { agent_id, status } = data;
    
    console.log(`👤 Agent ${agent_id} status changed to: ${status}`);
    
    if (!['available', 'break', 'offline'].includes(status)) {
      return this.sendError(ws, 'Invalid status type');
    }

    try {
      await this.db.dbOperations.run(
        `UPDATE support_agent_status 
         SET status = ?, last_active = ? 
         WHERE agent_id = ?`,
        [status, new Date().toISOString(), agent_id]
      );
    } catch (error) {
      console.error('❌ Error updating agent status in DB:', error);
    }
    
    this.broadcastToAll({
      type: 'agent_status_updated',
      data: {
        agent_id,
        status,
        timestamp: new Date().toISOString()
      }
    }, agent_id);
  }

  async handleMarkRead(ws, data) {
    const { conversation_id, agent_id } = data;
    
    if (!conversation_id || !agent_id) return;
    
    try {
      await this.db.dbOperations.run(
        `UPDATE support_messages 
         SET is_read = 1 
         WHERE conversation_id = ? AND sender_type = 'customer'`,
        [conversation_id]
      );
      
      console.log(`👁️  Conversation ${conversation_id} marked as read by ${agent_id}`);
      
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }

  async handleGetConversations(ws, data) {
    const { agent_id, platform = 'all' } = data;
    
    if (!agent_id) {
      this.sendError(ws, 'Agent ID is required');
      return;
    }
    
    try {
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
        WHERE sc.assigned_agent_id = ?
      `;
      
      const params = [agent_id];
      
      if (platform !== 'all') {
        query += ` AND sc.platform = ?`;
        params.push(platform);
      }
      
      query += ` GROUP BY sc.conversation_id ORDER BY sc.last_activity DESC`;
      
      const conversations = await this.db.dbOperations.all(query, params);
      
      this.sendToClient(ws, {
        type: 'conversations_list',
        data: {
          conversations: conversations || [],
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      this.sendError(ws, 'Failed to fetch conversations');
    }
  }

  async handleResolveConversation(ws, data) {
    const { conversation_id, agent_id } = data;
    
    if (!conversation_id || !agent_id) {
      this.sendError(ws, 'Conversation ID and Agent ID are required');
      return;
    }
    
    console.log(`🔒 Agent ${agent_id} resolving conversation ${conversation_id}`);
    
    try {
      await this.db.dbOperations.run(
        `UPDATE support_conversations 
         SET status = 'resolved', resolved_at = ?, resolved_by = ?
         WHERE conversation_id = ?`,
        [new Date().toISOString(), agent_id, conversation_id]
      );
      
      // Broadcast resolution
      this.broadcastToAll({
        type: 'conversation_resolved',
        data: {
          conversation_id,
          agent_id,
          timestamp: new Date().toISOString()
        }
      });
      
      this.sendToClient(ws, {
        type: 'resolve_success',
        data: {
          conversation_id,
          timestamp: new Date().toISOString(),
          message: 'Conversation resolved successfully'
        }
      });
      
      console.log(`✅ Conversation ${conversation_id} resolved`);
      
      // Remove from conversation rooms
      if (this.conversationRooms.has(conversation_id)) {
        this.conversationRooms.delete(conversation_id);
        console.log(`🗑️  Removed conversation ${conversation_id} from active rooms`);
      }
      
    } catch (error) {
      console.error('❌ Error resolving conversation:', error);
      this.sendError(ws, `Failed to resolve conversation: ${error.message}`);
    }
  }

  async handleReopenConversation(ws, data) {
    const { conversation_id, agent_id } = data;
    
    if (!conversation_id || !agent_id) {
      this.sendError(ws, 'Conversation ID and Agent ID are required');
      return;
    }
    
    try {
      await this.db.dbOperations.run(
        `UPDATE support_conversations 
         SET status = 'active', resolved_at = NULL, resolved_by = NULL
         WHERE conversation_id = ?`,
        [conversation_id]
      );
      
      this.broadcastToAll({
        type: 'conversation_reopened',
        data: {
          conversation_id,
          agent_id,
          timestamp: new Date().toISOString()
        }
      });
      
      this.sendToClient(ws, {
        type: 'reopen_success',
        data: {
          conversation_id,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error reopening conversation:', error);
      this.sendError(ws, 'Failed to reopen conversation');
    }
  }

  async handleWhatsAppTest(ws, data) {
    const { phone, message } = data;
    
    if (!this.waService) {
      this.sendError(ws, 'WhatsApp service is not available');
      return;
    }
    
    if (!phone || !message) {
      this.sendError(ws, 'Phone and message are required for test');
      return;
    }
    
    try {
      const result = await this.waService.sendMessage(phone, message);
      
      this.sendToClient(ws, {
        type: 'whatsapp_test_result',
        data: {
          success: result.success,
          phone,
          message,
          result,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ WhatsApp test error:', error);
      this.sendError(ws, `WhatsApp test failed: ${error.message}`);
    }
  }

  async sendQueuedMessages(agent_id, ws) {
    if (this.messageQueue.has(agent_id)) {
      const messages = this.messageQueue.get(agent_id);
      console.log(`📨 Sending ${messages.length} queued messages to agent ${agent_id}`);
      
      for (const message of messages) {
        this.sendToClient(ws, message);
      }
      
      this.messageQueue.delete(agent_id);
    }
  }

  // Helper method to send to a client with error handling
  sendToClient(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      } else {
        console.log(`⚠️ Cannot send to ${ws.id} - readyState: ${ws.readyState}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending to ${ws.id}:`, error.message);
      return false;
    }
  }

  // FIXED: broadcastToConversation method
  broadcastToConversation(conversationId, message, excludeWs = null) {
    console.log(`📡 Broadcasting ${message.type} to conversation ${conversationId}`);
    
    // Check if room exists
    if (!this.conversationRooms.has(conversationId)) {
      console.log(`❌ Conversation room ${conversationId} does not exist!`);
      console.log(`   Available rooms: ${Array.from(this.conversationRooms.keys()).join(', ') || 'none'}`);
      return 0;
    }
    
    const room = this.conversationRooms.get(conversationId);
    console.log(`   Room has ${room.size} WebSocket connections`);
    
    if (room.size === 0) {
      console.log(`⚠️ Room ${conversationId} exists but has 0 connections`);
      return 0;
    }
    
    let recipients = 0;
    room.forEach(conn => {
      // Skip excluded WebSocket if specified
      if (excludeWs && conn === excludeWs) {
        console.log(`   Skipping excluded connection: ${conn.id}`);
        return;
      }
      
      const sent = this.sendToClient(conn, message);
      if (sent) {
        recipients++;
        console.log(`   ✓ Sent to ${conn.id} (agent: ${conn.agentId || 'none'})`);
      } else {
        console.log(`   ✗ Failed to send to ${conn.id} (agent: ${conn.agentId || 'none'})`);
      }
    });
    
    console.log(`📊 Conversation broadcast complete: ${recipients} clients received`);
    return recipients;
  }

  broadcastToAll(message, excludeAgentId = null) {
    console.log(`📡 Broadcasting ${message.type} to all agents`);
    
    let recipients = 0;
    this.connectedAgents.forEach((ws, agentId) => {
      if (agentId !== excludeAgentId) {
        const sent = this.sendToClient(ws, message);
        if (sent) recipients++;
      }
    });
    
    console.log(`📊 Global broadcast: ${recipients} clients received`);
    return recipients;
  }

  sendError(ws, message) {
    console.error(`❌ Sending error to ${ws.id}: ${message}`);
    this.sendToClient(ws, {
      type: 'error',
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  broadcastWhatsAppMessage(messageData) {
    console.log('📱 Broadcasting incoming WhatsApp message');
    
    const broadcastMessage = {
      type: 'whatsapp_message',
      data: messageData
    };
    
    const conversationId = messageData.conversation_id;
    if (conversationId) {
      this.broadcastToConversation(conversationId, broadcastMessage);
    } else {
      this.broadcastToAll(broadcastMessage);
    }
  }

  getStats() {
    return {
      connectedAgents: this.connectedAgents.size,
      activeConversations: this.conversationRooms.size,
      totalConnections: this.wss.clients.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      whatsappEnabled: !!this.waService
    };
  }

  // Debug method to log current state
  logCurrentState() {
    console.log('\n📊 ========== CURRENT SERVER STATE ==========');
    console.log(`📈 Connected Agents: ${this.connectedAgents.size}`);
    this.connectedAgents.forEach((ws, agentId) => {
      console.log(`   - ${agentId} (${ws.id}) [state: ${ws.readyState}]`);
      console.log(`     Conversations: ${Array.from(ws.conversations).join(', ') || 'none'}`);
    });
    
    console.log(`\n📁 Active Conversation Rooms: ${this.conversationRooms.size}`);
    this.conversationRooms.forEach((connections, conversationId) => {
      console.log(`   📍 ${conversationId}: ${connections.size} connections`);
      connections.forEach(conn => {
        console.log(`      - ${conn.id} (agent: ${conn.agentId || 'none'}) [state: ${conn.readyState}]`);
      });
    });
    
    console.log(`\n👥 Total WebSocket connections: ${this.wss.clients.size}`);
    let openConnections = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) openConnections++;
    });
    console.log(`   Open connections: ${openConnections}`);
    console.log(`🤖 WhatsApp Enabled: ${!!this.waService}`);
    console.log('📊 ==========================================\n');
  }
}

module.exports = WebSocketServer;