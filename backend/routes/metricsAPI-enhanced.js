// backend/routes/metricsAPI-enhanced.js - Enhanced Metrics API
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

// Get comprehensive dashboard metrics
router.get('/dashboard-enhanced', async (req, res) => {
  try {
    // Get all system metrics
    const allMetrics = await dbOperations.all(`SELECT * FROM system_metrics`);
    
    // Get recent system resource metrics
    const systemResources = await dbOperations.all(`
      SELECT * FROM system_resource_metrics 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    // Get business metrics for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const businessMetrics = await dbOperations.all(`
      SELECT * FROM business_metrics 
      WHERE metric_date >= ? 
      ORDER BY metric_date DESC
    `, [sevenDaysAgo]);
    
    // Get API performance metrics
    const apiPerformance = await dbOperations.all(`
      SELECT 
        endpoint,
        method,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as request_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_endpoint_metrics 
      WHERE created_at >= datetime('now', '-1 hour')
      GROUP BY endpoint, method
      ORDER BY avg_response_time DESC
      LIMIT 10
    `);
    
    // Get user session analytics
    const sessionAnalytics = await dbOperations.all(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_duration,
        SUM(page_views) as total_page_views
      FROM user_session_metrics 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `);
    
    // Get event performance metrics
    const eventPerformance = await dbOperations.all(`
      SELECT 
        event_id,
        event_name,
        SUM(tickets_sold) as total_tickets,
        SUM(revenue) as total_revenue,
        AVG(conversion_rate) as avg_conversion
      FROM event_performance_metrics 
      WHERE date >= date('now', '-30 days')
      GROUP BY event_id, event_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);
    
    // Get cache performance
    const cachePerformance = await dbOperations.get(`
      SELECT 
        SUM(hit_count) as total_hits,
        SUM(miss_count) as total_misses,
        CASE 
          WHEN (SUM(hit_count) + SUM(miss_count)) > 0 
          THEN ROUND((SUM(hit_count) * 100.0 / (SUM(hit_count) + SUM(miss_count))), 2)
          ELSE 0 
        END as hit_rate
      FROM cache_performance_metrics
    `);
    
    // Get slow queries
    const slowQueries = await dbOperations.all(`
      SELECT 
        query_hash,
        query_text,
        AVG(execution_time_ms) as avg_execution_time,
        COUNT(*) as execution_count
      FROM query_performance_metrics 
      WHERE execution_time_ms > 100
      GROUP BY query_hash, query_text
      ORDER BY avg_execution_time DESC
      LIMIT 10
    `);
    
    // Format metrics for dashboard
    const formattedMetrics = {};
    allMetrics.forEach(metric => {
      formattedMetrics[metric.metric_key] = {
        value: metric.metric_value,
        type: metric.metric_type,
        unit: metric.unit,
        description: metric.description,
        updated_at: metric.updated_at
      };
    });
    
    // Calculate trends
    const trends = {
      dailyRevenue: await calculateDailyTrend('revenue'),
      userGrowth: await calculateDailyTrend('new_users'),
      ticketSales: await calculateDailyTrend('tickets_sold'),
      apiPerformance: await calculatePerformanceTrend()
    };
    
    res.json({
      success: true,
      data: {
        metrics: formattedMetrics,
        systemResources: systemResources.map(resource => ({
          timestamp: resource.created_at,
          cpu: resource.cpu_usage_percent,
          memory: resource.memory_usage_percent,
          disk: resource.disk_usage_percent,
          processes: resource.process_count
        })),
        businessMetrics: {
          daily: businessMetrics,
          summary: {
            totalRevenue: calculateMetricSum(businessMetrics, 'revenue'),
            totalTickets: calculateMetricSum(businessMetrics, 'tickets_sold'),
            totalUsers: calculateMetricSum(businessMetrics, 'new_users'),
            totalEvents: calculateMetricSum(businessMetrics, 'events_created')
          }
        },
        apiPerformance: apiPerformance.map(api => ({
          endpoint: api.endpoint,
          method: api.method,
          avgResponseTime: api.avg_response_time,
          requestCount: api.request_count,
          errorRate: api.request_count > 0 ? ((api.error_count / api.request_count) * 100).toFixed(2) : 0
        })),
        sessionAnalytics: sessionAnalytics.map(session => ({
          date: session.date,
          totalSessions: session.total_sessions,
          avgDuration: (session.avg_duration / 60).toFixed(1), // Convert to minutes
          pageViews: session.total_page_views
        })),
        eventPerformance: eventPerformance.map(event => ({
          id: event.event_id,
          name: event.event_name,
          ticketsSold: event.total_tickets,
          revenue: event.total_revenue,
          conversionRate: event.avg_conversion
        })),
        cachePerformance: {
          hitRate: cachePerformance.hit_rate || 0,
          hits: cachePerformance.total_hits || 0,
          misses: cachePerformance.total_misses || 0
        },
        slowQueries: slowQueries.map(query => ({
          query: query.query_text.substring(0, 100) + '...',
          avgTime: query.avg_execution_time,
          count: query.execution_count
        })),
        trends,
        alerts: await generateIntelligentAlerts(formattedMetrics, slowQueries, apiPerformance)
      }
    });
    
  } catch (error) {
    console.error('Error getting enhanced dashboard metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to load enhanced metrics' });
  }
});

// Helper functions
async function calculateDailyTrend(metricType) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const yesterdayMetric = await dbOperations.get(`
      SELECT metric_value FROM business_metrics 
      WHERE metric_date = ? AND metric_type = ?
    `, [yesterday, metricType]);
    
    const todayMetric = await dbOperations.get(`
      SELECT metric_value FROM business_metrics 
      WHERE metric_date = ? AND metric_type = ?
    `, [today, metricType]);
    
    const yesterdayValue = parseFloat(yesterdayMetric?.metric_value || 0);
    const todayValue = parseFloat(todayMetric?.metric_value || 0);
    
    if (yesterdayValue === 0) return 100; // 100% growth if no previous data
    
    const change = ((todayValue - yesterdayValue) / yesterdayValue) * 100;
    return Math.round(change);
  } catch (error) {
    return 0;
  }
}

async function calculatePerformanceTrend() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    
    const recentPerformance = await dbOperations.get(`
      SELECT AVG(response_time_ms) as avg_time 
      FROM api_endpoint_metrics 
      WHERE created_at >= ?
    `, [oneHourAgo.toISOString()]);
    
    const previousPerformance = await dbOperations.get(`
      SELECT AVG(response_time_ms) as avg_time 
      FROM api_endpoint_metrics 
      WHERE created_at >= ? AND created_at < ?
    `, [twoHoursAgo.toISOString(), oneHourAgo.toISOString()]);
    
    const recentAvg = recentPerformance.avg_time || 0;
    const previousAvg = previousPerformance.avg_time || 0;
    
    if (previousAvg === 0) return 0;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    return Math.round(change);
  } catch (error) {
    return 0;
  }
}

function calculateMetricSum(metrics, type) {
  return metrics
    .filter(m => m.metric_type === type)
    .reduce((sum, m) => sum + parseFloat(m.metric_value || 0), 0);
}

async function generateIntelligentAlerts(metrics, slowQueries, apiPerformance) {
  const alerts = [];
  
  // Check for high CPU usage
  if (parseFloat(metrics.cpu_usage_percent?.value || 0) > 80) {
    alerts.push({
      type: 'system',
      title: 'High CPU Usage',
      message: `CPU usage is at ${metrics.cpu_usage_percent.value}%`,
      severity: 'high',
      recommendation: 'Consider scaling resources or optimizing code'
    });
  }
  
  // Check for high memory usage
  if (parseFloat(metrics.memory_usage_percent?.value || 0) > 85) {
    alerts.push({
      type: 'system',
      title: 'High Memory Usage',
      message: `Memory usage is at ${metrics.memory_usage_percent.value}%`,
      severity: 'high',
      recommendation: 'Check for memory leaks or scale resources'
    });
  }
  
  // Check for slow queries
  if (slowQueries.length > 0) {
    const slowestQuery = slowQueries[0];
    if (slowestQuery.avg_execution_time > 1000) {
      alerts.push({
        type: 'database',
        title: 'Slow Database Queries',
        message: `Slowest query takes ${Math.round(slowestQuery.avg_execution_time)}ms on average`,
        severity: 'medium',
        recommendation: 'Consider adding indexes or optimizing queries'
      });
    }
  }
  
  // Check for API errors
  const highErrorApis = apiPerformance.filter(api => 
    api.request_count > 10 && (api.error_count / api.request_count) > 0.1
  );
  
  if (highErrorApis.length > 0) {
    alerts.push({
      type: 'api',
      title: 'High API Error Rate',
      message: `${highErrorApis.length} endpoints have error rates > 10%`,
      severity: 'high',
      recommendation: 'Review error logs and fix failing endpoints'
    });
  }
  
  return alerts;
}

// Additional endpoints for specific metrics

// Get system resource history
router.get('/system-resources/:hours', async (req, res) => {
  try {
    const hours = parseInt(req.params.hours) || 24;
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const resources = await dbOperations.all(`
      SELECT 
        created_at as timestamp,
        cpu_usage_percent as cpu,
        memory_usage_percent as memory,
        disk_usage_percent as disk,
        process_count as processes
      FROM system_resource_metrics 
      WHERE created_at >= ?
      ORDER BY created_at
    `, [hoursAgo]);
    
    res.json({ success: true, data: resources });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get system resources' });
  }
});

// Get business metrics by period
router.get('/business-metrics/:period', async (req, res) => {
  try {
    const period = req.params.period; // day, week, month
    let dateFilter;
    
    switch(period) {
      case 'day':
        dateFilter = "date('now', '-1 day')";
        break;
      case 'week':
        dateFilter = "date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "date('now', '-30 days')";
        break;
      default:
        dateFilter = "date('now', '-7 days')";
    }
    
    const metrics = await dbOperations.all(`
      SELECT 
        metric_date as date,
        metric_type as type,
        SUM(metric_value) as value
      FROM business_metrics 
      WHERE metric_date >= ${dateFilter}
      GROUP BY metric_date, metric_type
      ORDER BY metric_date DESC
    `);
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get business metrics' });
  }
});

// Get top performing events
router.get('/top-events/:limit', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    
    const events = await dbOperations.all(`
      SELECT 
        event_id,
        event_name,
        SUM(tickets_sold) as tickets,
        SUM(revenue) as revenue,
        AVG(conversion_rate) as conversion
      FROM event_performance_metrics 
      WHERE date >= date('now', '-30 days')
      GROUP BY event_id, event_name
      ORDER BY revenue DESC
      LIMIT ?
    `, [limit]);
    
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get top events' });
  }
});

// Get API endpoint performance
router.get('/api-performance/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    const hours = parseInt(req.query.hours) || 24;
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const performance = await dbOperations.all(`
      SELECT 
        strftime('%Y-%m-%d %H:00', created_at) as hour,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as request_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_endpoint_metrics 
      WHERE endpoint LIKE ? AND created_at >= ?
      GROUP BY strftime('%Y-%m-%d %H:00', created_at)
      ORDER BY hour
    `, [`%${endpoint}%`, hoursAgo]);
    
    res.json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get API performance' });
  }
});

// Get user engagement metrics
router.get('/user-engagement/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    
    const engagement = await dbOperations.all(`
      SELECT 
        date(created_at) as date,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_session_duration,
        SUM(page_views) as total_page_views
      FROM user_session_metrics 
      WHERE created_at >= date('now', ?)
      GROUP BY date(created_at)
      ORDER BY date DESC
    `, [`-${days} days`]);
    
    res.json({ success: true, data: engagement });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user engagement' });
  }
});

module.exports = router;