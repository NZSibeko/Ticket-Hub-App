const MetricsService = require('../services/MetricsService');

let metricsService = null;

const initializeMetrics = (service) => {
  metricsService = service;
  console.log('Metrics middleware initialized');
};

const metricsMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    if (metricsService) {
      metricsService.logPerformance(
        req.path,
        responseTime,
        res.statusCode,
        req.headers['content-length'] || 0,
        this.getHeader('Content-Length') || 0
      );
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

const securityLoggingMiddleware = async (req, res, next) => {
  if (metricsService) {
    // Log user activity for authenticated requests
    if (req.user) {
      metricsService.logUserActivity({
        user_id: req.user.userId || req.user.admin_id || req.user.manager_id || req.user.customer_id,
        user_email: req.user.email,
        activity_type: 'api_request',
        activity_details: `${req.method} ${req.path}`,
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent'] || 'Unknown'
      });
    }
    
    // Check for failed logins in auth endpoints
    if ((req.path.includes('/auth') || req.path.includes('/login')) && req.method === 'POST') {
      res.on('finish', async () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          const username = req.body.username || req.body.email || 'unknown';
          const ip = getClientIP(req);
          
          await metricsService.logSecurityEvent({
            event_type: 'failed_login',
            severity: 'medium',
            user_email: username,
            ip_address: ip,
            user_agent: req.headers['user-agent'] || 'Unknown',
            details: `Failed login attempt for ${username}`
          });
          
          // Check if we should block this IP
          await checkAndBlockIP(ip);
        }
      });
    }
  }
  
  next();
};

function getClientIP(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         '0.0.0.0';
}

async function checkAndBlockIP(ip) {
  if (!metricsService || ip === '0.0.0.0' || ip === '127.0.0.1' || ip === '::1') {
    return;
  }
  
  try {
    const { dbOperations } = require('../database');
    
    // Count failed attempts from this IP in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const failedAttempts = await dbOperations.get(
      `SELECT COUNT(*) as count FROM security_logs 
       WHERE ip_address = ? 
       AND event_type = 'failed_login' 
       AND created_at >= ?`,
      [ip, oneHourAgo]
    );
    
    if (failedAttempts.count >= 5) {
      await metricsService.blockIP(ip, 'Multiple failed login attempts');
      
      // Log the blocking
      await metricsService.logSecurityEvent({
        event_type: 'ip_blocked',
        severity: 'high',
        ip_address: ip,
        details: `IP blocked after ${failedAttempts.count} failed login attempts`
      });
    }
  } catch (error) {
    console.error('Error checking IP for blocking:', error);
  }
}

module.exports = {
  metricsMiddleware,
  securityLoggingMiddleware,
  initializeMetrics
};