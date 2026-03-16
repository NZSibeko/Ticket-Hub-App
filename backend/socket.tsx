const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

module.exports = function(server) {
  const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:8082',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://localhost:5173'
  ];
  const CONFIGURED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const ALLOWED_ORIGINS = CONFIGURED_ORIGINS.length
    ? CONFIGURED_ORIGINS
    : DEFAULT_ALLOWED_ORIGINS;

  const io = socketIo(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true
    }
  });

  // Store active connections
  const activeAgents = new Map();
  const conversationRooms = new Map();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.query.token;
      
      if (!token) {
        console.log('No token provided for WebSocket connection');
        return next(new Error('Authentication error: Token required'));
      }

      // Verify token
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log('Invalid token for WebSocket connection:', err.message);
          return next(new Error('Authentication error: Invalid token'));
        }
        
        socket.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name
        };
        
        console.log(`WebSocket authenticated: ${socket.user.name} (${socket.user.role})`);
        next();
      });
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.user.userId} (${socket.user.role})`);

    // Store agent connection
    if (socket.user.role === 'support') {
      activeAgents.set(socket.user.userId, {
        socketId: socket.id,
        user: socket.user,
        status: 'available',
        joinedAt: new Date()
      });
      
      console.log(`Support agent connected: ${socket.user.name}`);
    }

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to TicketHub Support Chat',
      timestamp: new Date().toISOString()
    });

    // Join user to their personal room for direct messages
    socket.join(`user_${socket.user.userId}`);

    // Handle conversation joining
    socket.on('join_conversation', ({ conversation_id, agent_id }) => {
      const roomName = `conversation_${conversation_id}`;
      socket.join(roomName);
      
      conversationRooms.set(conversation_id, {
        participants: [...(conversationRooms.get(conversation_id)?.participants || []), socket.user.userId],
        agentId: agent_id
      });
      
      console.log(`${socket.user.name} joined conversation ${conversation_id}`);
    });

    // Handle sending message
    socket.on('send_message', (messageData) => {
      const { conversation_id, ...message } = messageData;
      const roomName = `conversation_${conversation_id}`;
      
      // Broadcast to conversation room
      io.to(roomName).emit('new_message', message);
      
      console.log(`Message sent to conversation ${conversation_id} by ${message.sender_name}`);
    });

    // Handle typing indicators
    socket.on('typing_start', ({ conversation_id, user_id, user_name }) => {
      const roomName = `conversation_${conversation_id}`;
      
      // Broadcast to conversation room except sender
      socket.to(roomName).emit('typing_start', {
        conversation_id,
        user_id,
        user_name
      });
    });

    socket.on('typing_stop', ({ conversation_id, user_id }) => {
      const roomName = `conversation_${conversation_id}`;
      
      socket.to(roomName).emit('typing_stop', {
        conversation_id,
        user_id
      });
    });

    // Handle marking as read
    socket.on('mark_read', ({ conversation_id, reader_id }) => {
      const roomName = `conversation_${conversation_id}`;
      
      io.to(roomName).emit('message_read', {
        conversation_id,
        reader_id
      });
    });

    // Handle agent status updates
    socket.on('agent_status_update', ({ agent_id, status }) => {
      const agent = activeAgents.get(agent_id);
      if (agent) {
        agent.status = status;
        activeAgents.set(agent_id, agent);
        
        // Broadcast to all support agents
        io.emit('agent_status_update', { agent_id, status });
      }
    });

    // Handle conversation resolution
    socket.on('conversation_resolved', ({ conversation_id }) => {
      const roomName = `conversation_${conversation_id}`;
      
      io.to(roomName).emit('conversation_resolved', { conversation_id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.user.userId}`);
      
      // Remove from active agents
      if (socket.user.role === 'support') {
        activeAgents.delete(socket.user.userId);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};
