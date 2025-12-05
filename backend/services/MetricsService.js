const { dbOperations } = require('../database');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class MetricsService {
  constructor() {
    this.startTime = new Date();
    this.metricsUpdateInterval = null;
    this.isRunning = false;
  }

  async startMetricsCollection() {
    if (this.isRunning) {
      console.log('Metrics service already running');
      return;
    }
    
    console.log('Starting metrics collection service...');
    this.isRunning = true;
    
    // Initial metrics calculation
    await this.calculateInitialMetrics();
    
    // Update metrics every 5 minutes
    this.metricsUpdateInterval = setInterval(async () => {
      try {
        await this.updateAllMetrics();
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    }, 5 * 60 * 1000);
    
    // Initial update
    await this.updateAllMetrics();
    console.log('Metrics collection service started');
  }

  async calculateInitialMetrics() {
    try {
      // Calculate initial database size
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      if (await this.fileExists(dbPath)) {
        const stats = await fs.stat(dbPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        await this.updateMetric('database_size_mb', sizeMB);
      }
      
      // Calculate initial table count
      try {
        const tables = await dbOperations.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        await this.updateMetric('total_tables', tables.length.toString());
        
        // Calculate initial row count for key tables
        let totalRows = 0;
        const keyTables = ['customers', 'event_managers', 'admins', 'events'];
        
        for (const tableName of keyTables) {
          try {
            const count = await dbOperations.get(
              `SELECT COUNT(*) as count FROM ${tableName}`
            );
            totalRows += count.count || 0;
          } catch (e) {
            // Table might not exist yet
          }
        }
        await this.updateMetric('total_rows', totalRows.toString());
      } catch (error) {
        console.error('Error calculating table metrics:', error);
      }
      
    } catch (error) {
      console.error('Error calculating initial metrics:', error);
    }
  }

  async updateAllMetrics() {
    try {
      if (!this.isRunning) return;
      
      await this.updateUptimeMetrics();
      await this.updateDatabaseMetrics();
      await this.updateResponseTimeMetrics();
      await this.updateSecurityMetrics();
      await this.updateBackupMetrics();
      await this.checkAndGenerateAlerts();
      
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  async updateUptimeMetrics() {
    try {
      const uptimeMs = new Date() - this.startTime;
      const uptimeDays = (uptimeMs / (1000 * 60 * 60 * 24)).toFixed(2);
      
      await this.updateMetric('system_uptime_days', uptimeDays);
      await this.updateMetric('database_uptime_days', uptimeDays);
      await this.updateMetric('last_system_restart', this.startTime.toISOString());
    } catch (error) {
      console.error('Error updating uptime metrics:', error);
    }
  }

  async updateDatabaseMetrics() {
    try {
      // Get database size
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      if (await this.fileExists(dbPath)) {
        const stats = await fs.stat(dbPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        await this.updateMetric('database_size_mb', sizeMB);
      }
    } catch (error) {
      console.error('Error updating database metrics:', error);
    }
  }

  async updateResponseTimeMetrics() {
    try {
      // Calculate average response time from performance metrics (last 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const perfMetrics = await dbOperations.all(`
        SELECT response_time_ms 
        FROM performance_metrics 
        WHERE created_at >= ? AND response_time_ms > 0
        ORDER BY created_at DESC
        LIMIT 100
      `, [oneHourAgo]);
      
      if (perfMetrics.length > 0) {
        const total = perfMetrics.reduce((sum, m) => sum + m.response_time_ms, 0);
        const avg = Math.round(total / perfMetrics.length);
        
        // Calculate percentiles
        const times = perfMetrics.map(m => m.response_time_ms).sort((a, b) => a - b);
        const p95 = times[Math.floor(times.length * 0.95)] || avg;
        const p99 = times[Math.floor(times.length * 0.99)] || avg;
        
        await this.updateMetric('avg_response_time', avg.toString());
        await this.updateMetric('p95_response_time', p95.toString());
        await this.updateMetric('p99_response_time', p99.toString());
      }
    } catch (error) {
      console.error('Error updating response time metrics:', error);
    }
  }

  async updateSecurityMetrics() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Failed login attempts
      const failedLogins = await dbOperations.get(
        `SELECT COUNT(*) as count FROM security_logs 
         WHERE event_type = 'failed_login' 
         AND created_at >= ?`,
        [twentyFourHoursAgo]
      );
      
      // Password resets
      const passwordResets = await dbOperations.get(
        `SELECT COUNT(*) as count FROM user_activity_logs 
         WHERE activity_type = 'password_reset' 
         AND created_at >= ?`,
        [twentyFourHoursAgo]
      );
      
      // Active blocked IPs
      const blockedIPs = await dbOperations.get(
        `SELECT COUNT(*) as count FROM blocked_ips 
         WHERE is_active = 1 
         AND (expires_at IS NULL OR expires_at > datetime('now'))`
      );
      
      // Security alerts
      const securityAlerts = await dbOperations.get(
        `SELECT COUNT(*) as count FROM system_alerts 
         WHERE severity IN ('high', 'critical') 
         AND created_at >= ?
         AND acknowledged = 0`,
        [twentyFourHoursAgo]
      );
      
      await this.updateMetric('failed_login_attempts_24h', (failedLogins?.count || 0).toString());
      await this.updateMetric('password_resets_24h', (passwordResets?.count || 0).toString());
      await this.updateMetric('active_blocked_ips', (blockedIPs?.count || 0).toString());
      await this.updateMetric('security_alerts_24h', (securityAlerts?.count || 0).toString());
    } catch (error) {
      console.error('Error updating security metrics:', error);
    }
  }

  async updateBackupMetrics() {
    try {
      const latestBackup = await dbOperations.get(
        `SELECT status, created_at FROM backup_history 
         ORDER BY created_at DESC LIMIT 1`
      );
      
      if (latestBackup) {
        await this.updateMetric('last_backup_status', latestBackup.status);
        await this.updateMetric('last_backup_time', latestBackup.created_at);
      }
      
      // Calculate success rate for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const backupStats = await dbOperations.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
         FROM backup_history 
         WHERE created_at >= ?`,
        [thirtyDaysAgo]
      );
      
      if (backupStats.total > 0) {
        const successRate = Math.round((backupStats.successful / backupStats.total) * 100);
        await this.updateMetric('backup_success_rate', successRate.toString());
      }
    } catch (error) {
      console.error('Error updating backup metrics:', error);
    }
  }

  async updateMetric(key, value) {
    try {
      await dbOperations.run(
        `UPDATE system_metrics 
         SET metric_value = ?, updated_at = datetime('now') 
         WHERE metric_key = ?`,
        [value, key]
      );
    } catch (error) {
      console.error(`Error updating metric ${key}:`, error);
    }
  }

  async checkAndGenerateAlerts() {
    try {
      // Check for high failed login attempts
      const failedLogins = await this.getMetricValue('failed_login_attempts_24h');
      if (parseInt(failedLogins) > 20) {
        await this.createAlert({
          alert_type: 'security',
          title: 'High Failed Login Attempts',
          message: `${failedLogins} failed login attempts detected in the last 24 hours`,
          severity: 'high',
          source_module: 'security',
          affected_items: JSON.stringify(['auth_endpoint']),
          recommendations: JSON.stringify(['Review security logs', 'Enable rate limiting', 'Check for brute force attacks'])
        });
      }
      
      // Check database size
      const dbSize = await this.getMetricValue('database_size_mb');
      if (parseFloat(dbSize) > 100) {
        await this.createAlert({
          alert_type: 'database',
          title: 'Database Size Warning',
          message: `Database size (${dbSize} MB) is approaching limit`,
          severity: 'medium',
          source_module: 'database',
          affected_items: JSON.stringify(['ticket_hub.db']),
          recommendations: JSON.stringify(['Archive old data', 'Run database optimization', 'Check disk space'])
        });
      }
      
      // Check response time
      const avgResponseTime = await this.getMetricValue('avg_response_time');
      if (parseInt(avgResponseTime) > 1000) {
        await this.createAlert({
          alert_type: 'performance',
          title: 'High Response Time',
          message: `Average response time (${avgResponseTime}ms) is above threshold`,
          severity: 'medium',
          source_module: 'api',
          affected_items: JSON.stringify(['api_endpoints']),
          recommendations: JSON.stringify(['Optimize database queries', 'Check server load', 'Scale resources'])
        });
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  async createAlert(alertData) {
    try {
      const existingAlert = await dbOperations.get(
        `SELECT id FROM system_alerts 
         WHERE alert_type = ? AND title = ? AND acknowledged = 0`,
        [alertData.alert_type, alertData.title]
      );
      
      if (!existingAlert) {
        await dbOperations.run(
          `INSERT INTO system_alerts 
           (alert_type, title, message, severity, source_module, affected_items, recommendations) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            alertData.alert_type,
            alertData.title,
            alertData.message,
            alertData.severity,
            alertData.source_module,
            alertData.affected_items,
            alertData.recommendations
          ]
        );
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  async getMetricValue(key) {
    try {
      const metric = await dbOperations.get(
        `SELECT metric_value FROM system_metrics WHERE metric_key = ?`,
        [key]
      );
      return metric ? metric.metric_value : '0';
    } catch (error) {
      console.error(`Error getting metric ${key}:`, error);
      return '0';
    }
  }

  async logSecurityEvent(eventData) {
    try {
      await dbOperations.run(
        `INSERT INTO security_logs 
         (event_type, severity, user_id, user_email, ip_address, user_agent, details) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          eventData.event_type,
          eventData.severity || 'info',
          eventData.user_id,
          eventData.user_email,
          eventData.ip_address,
          eventData.user_agent,
          eventData.details
        ]
      );
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  async logUserActivity(activityData) {
    try {
      await dbOperations.run(
        `INSERT INTO user_activity_logs 
         (user_id, user_email, activity_type, activity_details, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          activityData.user_id,
          activityData.user_email,
          activityData.activity_type,
          activityData.activity_details,
          activityData.ip_address,
          activityData.user_agent
        ]
      );
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  async blockIP(ip, reason, blockedBy = 'system') {
    try {
      const existing = await dbOperations.get(
        `SELECT id, attempts FROM blocked_ips WHERE ip_address = ? AND is_active = 1`,
        [ip]
      );
      
      if (existing) {
        await dbOperations.run(
          `UPDATE blocked_ips SET attempts = attempts + 1 WHERE id = ?`,
          [existing.id]
        );
      } else {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        await dbOperations.run(
          `INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at) 
           VALUES (?, ?, ?, ?)`,
          [ip, reason, blockedBy, expiresAt]
        );
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  }

  async logPerformance(endpoint, responseTime, statusCode, requestSize, responseSize) {
    try {
      await dbOperations.run(
        `INSERT INTO performance_metrics 
         (endpoint, response_time_ms, status_code, request_size, response_size) 
         VALUES (?, ?, ?, ?, ?)`,
        [endpoint, responseTime, statusCode, requestSize, responseSize]
      );
    } catch (error) {
      console.error('Error logging performance:', error);
    }
  }

  async getDashboardData() {
    try {
      const metrics = await dbOperations.all(`SELECT * FROM system_metrics`);
      const alerts = await dbOperations.all(
        `SELECT * FROM system_alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10`
      );
      const securityLogs = await dbOperations.all(
        `SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 20`
      );
      const blockedIPs = await dbOperations.all(
        `SELECT * FROM blocked_ips WHERE is_active = 1 
         AND (expires_at IS NULL OR expires_at > datetime('now')) 
         ORDER BY created_at DESC`
      );
      const backupHistory = await dbOperations.all(
        `SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 10`
      );
      const recentActivity = await dbOperations.all(
        `SELECT * FROM user_activity_logs ORDER BY created_at DESC LIMIT 20`
      );
      
      const formattedMetrics = {};
      metrics.forEach(metric => {
        formattedMetrics[metric.metric_key] = {
          value: metric.metric_value,
          type: metric.metric_type,
          unit: metric.unit,
          updated_at: metric.updated_at
        };
      });
      
      return {
        metrics: formattedMetrics,
        alerts: this.formatAlerts(alerts),
        securityLogs: this.formatSecurityLogs(securityLogs),
        blockedIPs: this.formatBlockedIPs(blockedIPs),
        backupHistory: this.formatBackupHistory(backupHistory),
        recentActivity: this.formatRecentActivity(recentActivity)
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  formatAlerts(alerts) {
    return alerts.map(alert => ({
      id: alert.id,
      type: alert.alert_type,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      time: this.formatTimeAgo(alert.created_at),
      details: alert.affected_items ? JSON.parse(alert.affected_items) : [],
      recommendations: alert.recommendations ? JSON.parse(alert.recommendations) : []
    }));
  }

  formatSecurityLogs(logs) {
    return logs.map(log => ({
      id: log.id,
      type: log.event_type,
      user: log.user_email || 'Unknown',
      ip: log.ip_address || 'N/A',
      time: this.formatTimeAgo(log.created_at),
      severity: log.severity,
      details: log.details
    }));
  }

  formatBlockedIPs(ips) {
    return ips.map(ip => ({
      ip: ip.ip_address,
      reason: ip.reason,
      blocked: this.formatTimeAgo(ip.created_at),
      attempts: ip.attempts,
      expires: ip.expires_at
    }));
  }

  formatBackupHistory(backups) {
    return backups.map(backup => ({
      date: backup.created_at,
      size: `${backup.size_mb || 0} MB`,
      duration: `${backup.duration_seconds || 0} sec`,
      status: backup.status,
      type: backup.backup_type
    }));
  }

  formatRecentActivity(activities) {
    return activities.map(activity => ({
      type: activity.activity_type,
      user: activity.user_email || 'System',
      time: this.formatTimeAgo(activity.created_at),
      details: activity.activity_details,
      ip: activity.ip_address
    }));
  }

  formatTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Unknown';
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    console.log('Metrics service stopped');
  }
}

module.exports = MetricsService;