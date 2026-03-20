const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Debug endpoint to check what metrics are available
router.get('/debug-metrics', async (req, res) => {
  try {
    // Check all metrics-related tables
    const tableChecks = [
      { name: 'system_metrics', query: 'SELECT COUNT(*) as count, GROUP_CONCAT(metric_key) as keys FROM system_metrics' },
      { name: 'performance_metrics', query: 'SELECT COUNT(*) as count FROM performance_metrics' },
      { name: 'security_logs', query: 'SELECT COUNT(*) as count FROM security_logs' },
      { name: 'system_alerts', query: 'SELECT COUNT(*) as count FROM system_alerts' },
      { name: 'user_activity_logs', query: 'SELECT COUNT(*) as count FROM user_activity_logs' },
      { name: 'blocked_ips', query: 'SELECT COUNT(*) as count FROM blocked_ips' }
    ];
    
    const results = {};
    for (const check of tableChecks) {
      try {
        const result = await dbOperations.get(check.query);
        results[check.name] = result || { count: 0, error: 'No result' };
      } catch (error) {
        results[check.name] = { count: 0, error: error.message };
      }
    }
    
    // Get sample metrics
    const sampleMetrics = await dbOperations.all('SELECT metric_key, metric_value, updated_at FROM system_metrics LIMIT 20');
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tables: results,
      sampleMetrics: sampleMetrics,
      metricsService: req.app.locals.metricsService ? {
        isRunning: req.app.locals.metricsService.isRunning,
        initialized: req.app.locals.metricsService.initialized,
        startTime: req.app.locals.metricsService.startTime
      } : 'Not available'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quick metrics initialization
router.post('/init-metrics', async (req, res) => {
  try {
    const MetricsService = require('../services/MetricsService');
    const metricsService = new MetricsService();
    
    await metricsService.startMetricsCollection();
    
    // Insert some test metrics
    await dbOperations.run(`
      INSERT OR REPLACE INTO system_metrics (metric_key, metric_value, metric_type, description) 
      VALUES 
      ('test_metric_1', '100', 'gauge', 'Test metric 1'),
      ('test_metric_2', '50', 'gauge', 'Test metric 2'),
      ('system_uptime_days', '1.5', 'counter', 'System uptime'),
      ('database_size_mb', '2.5', 'gauge', 'Database size'),
      ('active_users', '3', 'gauge', 'Active users')
    `);
    
    res.json({
      success: true,
      message: 'Test metrics initialized',
      metricsService: {
        isRunning: metricsService.isRunning,
        initialized: metricsService.initialized
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test metrics collection
router.get('/test-metrics', async (req, res) => {
  try {
    // Create a test log entry
    await dbOperations.run(`
      INSERT INTO performance_metrics (endpoint, response_time_ms, status_code) 
      VALUES ('/api/debug/test-metrics', 150, 200)
    `);
    
    // Create a test security log
    await dbOperations.run(`
      INSERT INTO security_logs (event_type, severity, user_email, ip_address, details) 
      VALUES ('test_event', 'info', 'test@example.com', '127.0.0.1', 'Test security event')
    `);
    
    // Update a metric
    await dbOperations.run(`
      INSERT OR REPLACE INTO system_metrics (metric_key, metric_value, metric_type) 
      VALUES ('test_response_time', '150', 'gauge')
    `);
    
    res.json({
      success: true,
      message: 'Test metrics created',
      actions: [
        'Created performance log entry',
        'Created security log entry',
        'Updated test metric'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all available metrics
router.get('/all-metrics', async (req, res) => {
  try {
    const metrics = await dbOperations.all('SELECT * FROM system_metrics ORDER BY metric_key');
    const performanceCount = await dbOperations.get('SELECT COUNT(*) as count FROM performance_metrics');
    const securityCount = await dbOperations.get('SELECT COUNT(*) as count FROM security_logs');
    const activityCount = await dbOperations.get('SELECT COUNT(*) as count FROM user_activity_logs');
    
    res.json({
      success: true,
      counts: {
        system_metrics: metrics.length,
        performance_metrics: performanceCount?.count || 0,
        security_logs: securityCount?.count || 0,
        user_activity_logs: activityCount?.count || 0
      },
      metrics: metrics.map(m => ({
        key: m.metric_key,
        value: m.metric_value,
        type: m.metric_type,
        updated: m.updated_at
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;