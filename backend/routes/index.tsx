const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');

// Route middleware
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);

// ========================
// IMPORTANT: Handle 404 errors differently
// ========================

// Instead of using '/api/*', use a middleware function
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // Check if it's an API route that doesn't exist
    const apiPath = req.path;
    if (!apiPath.match(/^\/api\/(health|auth|events)/)) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.originalUrl,
        available_endpoints: [
          'GET /api/health',
          'GET /api/health/database',
          'GET /api/auth/validate',
          'GET /api/auth/validate-token',
          'GET /api/events',
          'GET /api/events/public',
          'GET /api/events/test/health',
          'GET /api/events/info'
        ]
      });
    }
  }
  next();
});

// Handle other 404s
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    message: 'Please use the API endpoints at /api/...'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`============================================`);
  console.log(`🚀 Ticket-Hub Backend Server Started!`);
  console.log(`============================================`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`============================================`);
  console.log(`🔗 Available Endpoints:`);
  console.log(`   🌡️  Health: http://localhost:${PORT}/api/health`);
  console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth/validate`);
  console.log(`   📅 Events: http://localhost:${PORT}/api/events`);
  console.log(`   📅 Events Test: http://localhost:${PORT}/api/events/test/health`);
  console.log(`   📅 Public Events: http://localhost:${PORT}/api/events/public`);
  console.log(`============================================`);
  console.log(`✅ Server is ready to accept requests!`);
});