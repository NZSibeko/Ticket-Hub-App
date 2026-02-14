const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

console.log('✅ Test WebSocket server started on port 8081');

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.send(JSON.stringify({
    type: 'welcome',
    data: { message: 'Connected to test WebSocket server' }
  }));

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    
    // Echo back
    ws.send(JSON.stringify({
      type: 'echo',
      data: { message: 'Echo: ' + message.toString() }
    }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});