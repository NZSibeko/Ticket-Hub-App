const WebSocket = require('ws');

const createFixedWebSocketServer = (server) => {
  console.log('🔧 Creating Fixed WebSocket Server...');
  
  const wss = new WebSocket.Server({ server, path: '/ws' });
  const activeAgents = new Map();
  
  // WebSocket server events
  wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`👤 New client connected: ${clientId}`);
    
    ws.clientId = clientId;
    ws.isAgent = false;
    ws.agentData = null;
    ws.currentConversation = null;
    ws.connectedAt = new Date().toISOString();
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      data: {
        client_id: clientId,
        message: 'Connected to Support Chat Server',
        timestamp: ws.connectedAt
      }
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`📨 Received [${data.type}] from ${clientId}`);
        
        switch (data.type) {
          case 'ping':
            // Handle ping
            ws.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: new Date().toISOString() 
            }));
            break;
            
          case 'agent_connect':
            // Handle agent connection
            console.log(`👤 Agent connected: ${data.data.name} (${data.data.agent_id})`);
            ws.isAgent = true;
            ws.agentData = data.data;
            
            // Add to active agents
            activeAgents.set(data.data.agent_id, {
              ...data.data,
              ws: ws,
              connectedAt: new Date().toISOString()
            });
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'connected',
              data: {
                agent_id: data.data.agent_id,
                name: data.data.name,
                role: data.data.role,
                status: 'connected',
                timestamp: new Date().toISOString()
              }
            }));
            
            // Broadcast to other clients about new agent
            broadcastToAll({
              type: 'agent_status_updated',
              data: {
                agent_id: data.data.agent_id,
                status: data.data.status || 'available',
                name: data.data.name,
                timestamp: new Date().toISOString()
              }
            }, ws);
            
            console.log(`📊 Active agents: ${activeAgents.size}`);
            break;
            
          case 'join_conversation':
            // Handle agent joining a conversation
            console.log(`👥 Agent ${data.data.agent_id} joining conversation: ${data.data.conversation_id}`);
            ws.currentConversation = data.data.conversation_id;
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'conversation_joined',
              data: {
                conversation_id: data.data.conversation_id,
                timestamp: new Date().toISOString()
              }
            }));
            break;
            
          case 'typing_start':
            // Broadcast typing start to conversation
            broadcastToConversation(data.data.conversation_id, {
              type: 'typing_start',
              data: data.data
            }, ws);
            break;
            
          case 'typing_stop':
            // Broadcast typing stop to conversation
            broadcastToConversation(data.data.conversation_id, {
              type: 'typing_stop',
              data: data.data
            }, ws);
            break;
            
          case 'send_message':
            // Broadcast message to conversation
            broadcastToConversation(data.data.conversation_id, {
              type: 'new_message',
              data: data.data
            }, ws);
            break;
            
          case 'agent_status':
            // Update agent status
            console.log(`🔄 Agent status update: ${data.data.agent_id} -> ${data.data.status}`);
            if (ws.agentData) {
              ws.agentData.status = data.data.status;
              ws.agentData.auto_assign = data.data.auto_assign;
            }
            
            // Broadcast status update
            broadcastToAll({
              type: 'agent_status_updated',
              data: data.data
            }, ws);
            break;
            
          case 'conversation_resolved':
            // Broadcast conversation resolved
            broadcastToAll({
              type: 'conversation_resolved',
              data: data.data
            });
            break;
            
          default:
            console.log(`📋 Unhandled message type: ${data.type}`);
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`🔌 Client disconnected: ${clientId}`);
      
      // Remove from active agents if this was an agent
      if (ws.isAgent && ws.agentData) {
        activeAgents.delete(ws.agentData.agent_id);
        
        // Broadcast agent disconnect
        broadcastToAll({
          type: 'agent_status_updated',
          data: {
            agent_id: ws.agentData.agent_id,
            status: 'offline',
            timestamp: new Date().toISOString()
          }
        });
      }
    });
    
    ws.on('error', (error) => {
      console.error(`⚠️ WebSocket error for ${clientId}:`, error);
    });
  });
  
  // Helper functions
  function broadcastToAll(message, excludeWs = null) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error);
        }
      }
    });
  }
  
  function broadcastToConversation(conversationId, message, excludeWs = null) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && 
          client !== excludeWs && 
          client.currentConversation === conversationId) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to conversation client:', error);
        }
      }
    });
  }
  
  // Heartbeat to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.ping();
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    });
  }, 30000); // Every 30 seconds
  
  console.log('✅ Fixed WebSocket Server created');
  
  // Add helper methods to wss
  wss.broadcastToAll = broadcastToAll;
  wss.broadcastToConversation = broadcastToConversation;
  wss.getActiveAgents = () => activeAgents.size;
  wss.getConnectedClients = () => wss.clients.size;
  
  return wss;
};

module.exports = createFixedWebSocketServer;