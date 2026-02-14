const WebSocket = require('ws');

function createSimpleWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/'
  });

  console.log('✅ Simple WebSocket server started on port 8081');

  const clients = new Map();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.socket.remoteAddress);
    
    // Generate client ID
    const clientId = Date.now().toString();
    clients.set(clientId, ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      data: { 
        message: 'Connected to TicketHub Support Chat',
        timestamp: new Date().toISOString(),
        clientId: clientId
      }
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data.type);
        
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'agent_connect':
            console.log('Agent connected:', data.data.name);
            ws.send(JSON.stringify({
              type: 'connected',
              data: { message: 'Successfully connected as agent' }
            }));
            break;
            
          case 'send_message':
            // Simulate receiving a message after 1 second
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'new_message',
                data: {
                  ...data.data,
                  message_id: 'server_' + Date.now(),
                  is_read: 1
                }
              }));
            }, 1000);
            break;
            
          case 'typing_start':
            // Broadcast typing indicator to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                client.send(JSON.stringify({
                  type: 'typing_start',
                  data: data.data
                }));
              }
            });
            break;
            
          case 'typing_stop':
            // Broadcast typing stop to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                client.send(JSON.stringify({
                  type: 'typing_stop',
                  data: data.data
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket disconnected:', clientId);
      clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Heartbeat to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'ping' }));
      }
    });
  }, 30000);

  return wss;
}

module.exports = createSimpleWebSocketServer;