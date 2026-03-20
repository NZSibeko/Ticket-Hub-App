const { dbOperations } = require('../database');

class SystemLogsService {
  logLevels;

  constructor() {
    this.logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  }

  // Log system event
  async logSystemEvent(level, module, message, details = {}, userId = null) {
    try {
      if (!this.logLevels.includes(level.toUpperCase())) {
        level = 'INFO';
      }

      const logEntry = {
        level: level.toUpperCase(),
        module: module,
        message: message,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        user_id: userId,
        timestamp: new Date().toISOString()
      };

      // Store in appropriate table based on level
      if (level.toUpperCase() === 'ERROR' || level.toUpperCase() === 'CRITICAL') {
        await this.logError(logEntry);
      } else if (level.toUpperCase() === 'WARNING') {
        await this.logWarning(logEntry);
      } else {
        await this.logInfo(logEntry);
      }

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        const colors = {
          DEBUG: '\x1b[36m', // Cyan
          INFO: '\x1b[32m', // Green
          WARNING: '\x1b[33m', // Yellow
          ERROR: '\x1b[31m', // Red
          CRITICAL: '\x1b[41m\x1b[37m' // Red background, white text
        };
        const reset = '\x1b[0m';
        
        console.log(
          `${colors[level.toUpperCase()] || ''}[${new Date().toLocaleTimeString()}] ${level}: ${module} - ${message}${reset}`
        );
      }

      return { success: true, logId: logEntry.timestamp };

    } catch (error) {
      console.error('Error logging system event:', error);
      return { success: false, error: error.message };
    }
  }

  // Log to error table
  async logError(logEntry) {
    try {
      await dbOperations.run(`
        INSERT INTO security_logs 
        (event_type, severity, user_id, details, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'system_error',
        logEntry.level.toLowerCase(),
        logEntry.user_id,
        `${logEntry.module}: ${logEntry.message} | Details: ${logEntry.details}`,
        logEntry.timestamp
      ]);
    } catch (error) {
      console.error('Error logging to security_logs:', error);
      throw error;
    }
  }

  // Log to warning table
  async logWarning(logEntry) {
    try {
      await dbOperations.run(`
        INSERT INTO system_alerts 
        (alert_type, title, message, severity, source_module, affected_items, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'system_warning',
        `System Warning: ${logEntry.module}`,
        logEntry.message,
        'medium',
        logEntry.module,
        logEntry.details,
        logEntry.timestamp
      ]);
    } catch (error) {
      console.error('Error logging to system_alerts:', error);
      throw error;
    }
  }

  // Log to info table
  async logInfo(logEntry) {
    try {
      await dbOperations.run(`
        INSERT INTO user_activity_logs 
        (user_id, activity_type, activity_details, created_at)
        VALUES (?, ?, ?, ?)
      `, [
        logEntry.user_id || 'system',
        'system_log',
        `${logEntry.level}: ${logEntry.module} - ${logEntry.message}`,
        logEntry.timestamp
      ]);
    } catch (error) {
      console.error('Error logging to user_activity_logs:', error);
      throw error;
    }
  }

  // Get system logs with filtering
  async getSystemLogs(filters = {}) {
    try {
      const normalizedFilters = filters || {};
      const {
        level = null,
        module = null,
        startDate = null,
        endDate = null,
        search = null,
        limit = 100,
        offset = 0
      } = normalizedFilters;

      // Build query for combined logs
      let query = `
        SELECT 
          'security' as source,
          created_at as timestamp,
          'ERROR' as level,
          'Security' as module,
          details as message,
          user_id
        FROM security_logs 
        WHERE event_type = 'system_error'
        
        UNION ALL
        
        SELECT 
          'alerts' as source,
          created_at as timestamp,
          'WARNING' as level,
          source_module as module,
          message,
          'system' as user_id
        FROM system_alerts 
        WHERE alert_type = 'system_warning'
        
        UNION ALL
        
        SELECT 
          'activity' as source,
          created_at as timestamp,
          CASE 
            WHEN activity_details LIKE 'ERROR:%' THEN 'ERROR'
            WHEN activity_details LIKE 'WARNING:%' THEN 'WARNING'
            WHEN activity_details LIKE 'DEBUG:%' THEN 'DEBUG'
            ELSE 'INFO'
          END as level,
          'System' as module,
          activity_details as message,
          user_id
        FROM user_activity_logs 
        WHERE activity_type = 'system_log'
      `;

      const params = [];
      const conditions = [];

      // Apply filters
      if (level) {
        conditions.push(`level = ?`);
        params.push(level.toUpperCase());
      }

      if (module) {
        conditions.push(`module LIKE ?`);
        params.push(`%${module}%`);
      }

      if (startDate) {
        conditions.push(`timestamp >= ?`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`timestamp <= ?`);
        params.push(endDate);
      }

      if (search) {
        conditions.push(`(message LIKE ? OR module LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        query = `SELECT * FROM (${query}) WHERE ${conditions.join(' AND ')}`;
      } else {
        query = `SELECT * FROM (${query})`;
      }

      // Add ordering and limiting
      query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const logs = await dbOperations.all(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT created_at FROM security_logs WHERE event_type = 'system_error'
          UNION ALL
          SELECT created_at FROM system_alerts WHERE alert_type = 'system_warning'
          UNION ALL
          SELECT created_at FROM user_activity_logs WHERE activity_type = 'system_log'
        ) logs
      `;

      const countParams = [];
      const countConditions = [];

      // Reapply filters for count
      if (startDate) {
        countConditions.push(`created_at >= ?`);
        countParams.push(startDate);
      }

      if (endDate) {
        countConditions.push(`created_at <= ?`);
        countParams.push(endDate);
      }

      if (countConditions.length > 0) {
        countQuery = countQuery.replace('logs', `logs WHERE ${countConditions.join(' AND ')}`);
      }

      const countResult = await dbOperations.get(countQuery, countParams);
      const total = countResult?.total || 0;

      // Format logs
      const formattedLogs = logs.map(log => ({
        id: `${log.source}_${log.timestamp}`,
        timestamp: log.timestamp,
        level: log.level,
        module: log.module,
        message: log.message,
        source: log.source,
        user: log.user_id || 'system'
      }));

      return {
        success: true,
        logs: formattedLogs,
        pagination: {
          total: total,
          limit: limit,
          offset: offset,
          hasMore: offset + logs.length < total
        }
      };

    } catch (error) {
      console.error('Error getting system logs:', error);
      return { success: false, error: error.message };
    }
  }

  // Get log statistics
  async getLogStatistics(timeRange = '24h') {
    try {
      let timeCondition = '';
      switch (timeRange) {
        case '1h':
          timeCondition = "datetime('now', '-1 hour')";
          break;
        case '24h':
          timeCondition = "datetime('now', '-1 day')";
          break;
        case '7d':
          timeCondition = "datetime('now', '-7 days')";
          break;
        case '30d':
          timeCondition = "datetime('now', '-30 days')";
          break;
        default:
          timeCondition = "datetime('now', '-1 day')";
      }

      // Get error statistics
      const errorStats = await dbOperations.get(`
        SELECT 
          COUNT(*) as total_errors,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_errors,
          SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as error_errors,
          GROUP_CONCAT(DISTINCT event_type) as error_types
        FROM security_logs 
        WHERE created_at >= ${timeCondition}
      `);

      // Get warning statistics
      const warningStats = await dbOperations.get(`
        SELECT 
          COUNT(*) as total_warnings,
          SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_warnings,
          SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_warnings,
          GROUP_CONCAT(DISTINCT alert_type) as warning_types
        FROM system_alerts 
        WHERE created_at >= ${timeCondition}
        AND acknowledged = 0
      `);

      // Get module-wise distribution
      const moduleStats = await dbOperations.all(`
        SELECT 
          source_module as module,
          COUNT(*) as count,
          'warning' as type
        FROM system_alerts 
        WHERE created_at >= ${timeCondition}
        GROUP BY source_module
        
        UNION ALL
        
        SELECT 
          'security' as module,
          COUNT(*) as count,
          'error' as type
        FROM security_logs 
        WHERE created_at >= ${timeCondition}
        AND severity IN ('error', 'critical')
        
        UNION ALL
        
        SELECT 
          'system' as module,
          COUNT(*) as count,
          'info' as type
        FROM user_activity_logs 
        WHERE activity_type = 'system_log'
        AND created_at >= ${timeCondition}
        
        ORDER BY count DESC
      `);

      // Get recent critical errors
      const recentCritical = await dbOperations.all(`
        SELECT 
          event_type as type,
          details as message,
          created_at as timestamp,
          severity
        FROM security_logs 
        WHERE severity IN ('critical', 'error')
        AND created_at >= ${timeCondition}
        ORDER BY created_at DESC
        LIMIT 10
      `);

      // Calculate error rate per hour
      const hourlyErrorRate = await dbOperations.all(`
        SELECT 
          strftime('%Y-%m-%d %H:00:00', created_at) as hour,
          COUNT(*) as error_count
        FROM security_logs 
        WHERE created_at >= datetime('now', '-24 hours')
        AND severity IN ('error', 'critical')
        GROUP BY hour
        ORDER BY hour
      `);

      return {
        success: true,
        statistics: {
          timeRange: timeRange,
          errors: {
            total: errorStats?.total_errors || 0,
            critical: errorStats?.critical_errors || 0,
            regular: errorStats?.error_errors || 0,
            types: errorStats?.error_types?.split(',') || []
          },
          warnings: {
            total: warningStats?.total_warnings || 0,
            high: warningStats?.high_warnings || 0,
            medium: warningStats?.medium_warnings || 0,
            types: warningStats?.warning_types?.split(',') || []
          },
          moduleDistribution: moduleStats,
          recentCritical: recentCritical,
          hourlyErrorRate: hourlyErrorRate,
          summary: {
            totalEvents: (errorStats?.total_errors || 0) + (warningStats?.total_warnings || 0),
            errorRate: ((errorStats?.total_errors || 0) / 24).toFixed(2), // Per hour for 24h
            criticalRate: ((errorStats?.critical_errors || 0) / (errorStats?.total_errors || 1) * 100).toFixed(2)
          }
        }
      };

    } catch (error) {
      console.error('Error getting log statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Export logs
  async exportLogs(format = 'json', filters = {}) {
    try {
      const logs = await this.getSystemLogs({ ...filters, limit: 1000 });

      if (!logs.success) {
        throw new Error(logs.error);
      }

      let exportData;
      switch (format.toLowerCase()) {
        case 'json':
          exportData = JSON.stringify(logs.logs, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(logs.logs);
          break;
        case 'text':
          exportData = this.convertToText(logs.logs);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        format: format,
        data: exportData,
        count: logs.logs.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error exporting logs:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear old logs
  async clearOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      const results = {
        security_logs: 0,
        system_alerts: 0,
        user_activity_logs: 0
      };

      // Clear old security logs (keep critical/error for longer)
      const securityResult = await dbOperations.run(`
        DELETE FROM security_logs 
        WHERE created_at < ? 
        AND severity NOT IN ('critical', 'error')
      `, [cutoffDate]);
      results.security_logs = securityResult.changes || 0;

      // Clear old system alerts (keep unacknowledged)
      const alertsResult = await dbOperations.run(`
        DELETE FROM system_alerts 
        WHERE created_at < ? 
        AND acknowledged = 1
      `, [cutoffDate]);
      results.system_alerts = alertsResult.changes || 0;

      // Clear old user activity logs
      const activityResult = await dbOperations.run(`
        DELETE FROM user_activity_logs 
        WHERE created_at < ? 
        AND activity_type = 'system_log'
      `, [cutoffDate]);
      results.user_activity_logs = activityResult.changes || 0;

      const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

      // Log the cleanup
      await this.logSystemEvent('INFO', 'SystemLogsService', 
        `Cleared ${totalDeleted} old log entries (older than ${daysToKeep} days)`,
        results
      );

      return {
        success: true,
        deleted: results,
        totalDeleted: totalDeleted,
        cutoffDate: cutoffDate
      };

    } catch (error) {
      console.error('Error clearing old logs:', error);
      return { success: false, error: error.message };
    }
  }

  // Acknowledge warnings
  async acknowledgeWarnings(warningIds = [], acknowledgedBy = 'system') {
    try {
      if (!Array.isArray(warningIds)) {
        warningIds = [warningIds];
      }

      if (warningIds.length === 0) {
        // Acknowledge all unacknowledged warnings
        const result = await dbOperations.run(`
          UPDATE system_alerts 
          SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
          WHERE acknowledged = 0
        `, [acknowledgedBy]);

        return {
          success: true,
          acknowledged: result.changes || 0,
          message: `Acknowledged all ${result.changes || 0} warnings`
        };
      }

      // Acknowledge specific warnings
      const placeholders = warningIds.map(() => '?').join(',');
      const result = await dbOperations.run(`
        UPDATE system_alerts 
        SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
        WHERE id IN (${placeholders})
      `, [acknowledgedBy, ...warningIds]);

      return {
        success: true,
        acknowledged: result.changes || 0,
        message: `Acknowledged ${result.changes || 0} warnings`
      };

    } catch (error) {
      console.error('Error acknowledging warnings:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for export formats
  convertToCSV(logs) {
    if (!logs || logs.length === 0) {
      return 'timestamp,level,module,message,source,user\n';
    }

    const headers = ['timestamp', 'level', 'module', 'message', 'source', 'user'];
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const log of logs) {
      const row = [
        `"${log.timestamp}"`,
        `"${log.level}"`,
        `"${log.module}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${log.source}"`,
        `"${log.user}"`
      ];
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  convertToText(logs) {
    if (!logs || logs.length === 0) {
      return 'No logs found\n';
    }

    const textRows = [];
    for (const log of logs) {
      const timestamp = new Date(log.timestamp).toLocaleString();
      textRows.push(
        `[${timestamp}] ${log.level.padEnd(8)} ${log.module.padEnd(15)} ${log.message}`
      );
    }
    
    return textRows.join('\n');
  }

  // Monitor log levels and generate alerts
  async monitorLogLevels() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // Check for critical errors
      const criticalErrors = await dbOperations.get(`
        SELECT COUNT(*) as count 
        FROM security_logs 
        WHERE severity = 'critical' 
        AND created_at >= ?
      `, [oneHourAgo]);

      if (criticalErrors.count >= 3) {
        await this.logSystemEvent('WARNING', 'LogMonitor', 
          `High volume of critical errors detected: ${criticalErrors.count} in the last hour`,
          { errorCount: criticalErrors.count }
        );
      }

      // Check for error rate increase
      const currentHour = new Date().getHours();
      const previousHour = currentHour === 0 ? 23 : currentHour - 1;
      
      const currentHourErrors = await dbOperations.get(`
        SELECT COUNT(*) as count 
        FROM security_logs 
        WHERE severity IN ('error', 'critical')
        AND strftime('%H', created_at) = ?
      `, [currentHour.toString().padStart(2, '0')]);

      const previousHourErrors = await dbOperations.get(`
        SELECT COUNT(*) as count 
        FROM security_logs 
        WHERE severity IN ('error', 'critical')
        AND strftime('%H', created_at) = ?
      `, [previousHour.toString().padStart(2, '0')]);

      if (previousHourErrors.count > 0) {
        const increase = ((currentHourErrors.count - previousHourErrors.count) / previousHourErrors.count) * 100;
        if (increase > 100) { // 100% increase
          await this.logSystemEvent('WARNING', 'LogMonitor', 
            `Error rate increased by ${increase.toFixed(2)}% compared to previous hour`,
            { 
              currentHour: currentHourErrors.count,
              previousHour: previousHourErrors.count,
              increase: `${increase.toFixed(2)}%`
            }
          );
        }
      }

      return { success: true, monitored: true };

    } catch (error) {
      console.error('Error monitoring log levels:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SystemLogsService;