// backend/middleware/enhancedMetricsMiddleware.js
const { dbOperations } = require('../database');

let metricsEnabled = true;

const enableMetrics = (enabled = true) => {
  metricsEnabled = enabled;
};

// API Performance Monitoring Middleware
const apiPerformanceMiddleware = async (req, res, next) => {
  if (!metricsEnabled) return next();
  
  const startTime = Date.now();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log API performance metrics
    logAPIPerformance(req, res, responseTime).catch(console.error);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// User Session Tracking Middleware
const userSessionMiddleware = async (req, res, next) => {
  if (!metricsEnabled || !req.user) return next();
  
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || generateSessionId();
  const userAgent = req.headers['user-agent'];
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
  
  // Track session start if new session
  if (!req.cookies?.sessionId) {
    await logSessionStart({
      userId: req.user.userId || req.user.id,
      sessionId,
      userAgent,
      ip
    }).catch(console.error);
  }
  
  // Track page view
  await logPageView({
    sessionId,
    path: req.path,
    method: req.method,
    userId: req.user.userId || req.user.id
  }).catch(console.error);
  
  next();
};

// Database Query Monitoring
const dbQueryMonitor = (db) => {
  const originalRun = db.run;
  const originalGet = db.get;
  const originalAll = db.all;
  
  db.run = function(sql, params = [], callback) {
    const startTime = Date.now();
    return originalRun.call(this, sql, params, function(err) {
      const executionTime = Date.now() - startTime;
      if (metricsEnabled && executionTime > 50) { // Log slow queries
        logSlowQuery(sql, executionTime, params).catch(console.error);
      }
      if (callback) callback(err, this);
    });
  };
  
  db.get = function(sql, params = [], callback) {
    const startTime = Date.now();
    return originalGet.call(this, sql, params, function(err, row) {
      const executionTime = Date.now() - startTime;
      if (metricsEnabled && executionTime > 100) {
        logSlowQuery(sql, executionTime, params).catch(console.error);
      }
      if (callback) callback(err, row);
    });
  };
  
  db.all = function(sql, params = [], callback) {
    const startTime = Date.now();
    return originalAll.call(this, sql, params, function(err, rows) {
      const executionTime = Date.now() - startTime;
      if (metricsEnabled && executionTime > 200) {
        logSlowQuery(sql, executionTime, params).catch(console.error);
      }
      if (callback) callback(err, rows);
    });
  };
};

// Helper functions
async function logAPIPerformance(req, res, responseTime) {
  try {
    await dbOperations.run(`
      INSERT INTO api_endpoint_metrics 
      (endpoint, method, response_time_ms, status_code, user_agent, request_size, response_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.path,
      req.method,
      responseTime,
      res.statusCode,
      req.headers['user-agent'],
      req.headers['content-length'] || 0,
      res.getHeader('Content-Length') || 0
    ]);
  } catch (error) {
    console.error('Error logging API performance:', error);
  }
}

async function logSessionStart(sessionData) {
  try {
    await dbOperations.run(`
      INSERT INTO user_session_metrics 
      (user_id, session_id, start_time, user_agent, ip_address)
      VALUES (?, ?, datetime('now'), ?, ?)
    `, [
      sessionData.userId,
      sessionData.sessionId,
      sessionData.userAgent,
      sessionData.ip
    ]);
  } catch (error) {
    console.error('Error logging session start:', error);
  }
}

async function logPageView(pageViewData) {
  try {
    // Update session with page view
    await dbOperations.run(`
      UPDATE user_session_metrics 
      SET page_views = page_views + 1 
      WHERE session_id = ?
    `, [pageViewData.sessionId]);
    
    // Could also log detailed page views if needed
  } catch (error) {
    console.error('Error logging page view:', error);
  }
}

async function logSlowQuery(sql, executionTime, params) {
  try {
    const queryHash = generateQueryHash(sql);
    
    await dbOperations.run(`
      INSERT INTO query_performance_metrics 
      (query_hash, query_text, execution_time_ms)
      VALUES (?, ?, ?)
    `, [queryHash, sql.substring(0, 1000), executionTime]);
    
    // Update slow queries count metric
    await dbOperations.run(`
      UPDATE system_metrics 
      SET metric_value = CAST(metric_value AS INTEGER) + 1 
      WHERE metric_key = 'slow_queries_count'
    `);
  } catch (error) {
    console.error('Error logging slow query:', error);
  }
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateQueryHash(sql) {
  // Simple hash for query identification
  let hash = 0;
  for (let i = 0; i < sql.length; i++) {
    hash = ((hash << 5) - hash) + sql.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Event tracking helper
async function trackEventView(eventId, eventName) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await dbOperations.run(`
      INSERT OR REPLACE INTO event_performance_metrics 
      (event_id, event_name, total_views, date)
      VALUES (?, ?, COALESCE((SELECT total_views FROM event_performance_metrics WHERE event_id = ? AND date = ?), 0) + 1, ?)
    `, [eventId, eventName, eventId, today, today]);
  } catch (error) {
    console.error('Error tracking event view:', error);
  }
}

async function trackTicketSale(eventId, ticketCount, revenue) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await dbOperations.run(`
      INSERT OR REPLACE INTO event_performance_metrics 
      (event_id, event_name, tickets_sold, revenue, date)
      VALUES (?, ?, 
        COALESCE((SELECT tickets_sold FROM event_performance_metrics WHERE event_id = ? AND date = ?), 0) + ?,
        COALESCE((SELECT revenue FROM event_performance_metrics WHERE event_id = ? AND date = ?), 0) + ?,
        ?
      )
    `, [eventId, 'Event', eventId, today, ticketCount, eventId, today, revenue, today]);
  } catch (error) {
    console.error('Error tracking ticket sale:', error);
  }
}

module.exports = {
  enableMetrics,
  apiPerformanceMiddleware,
  userSessionMiddleware,
  dbQueryMonitor,
  trackEventView,
  trackTicketSale
};