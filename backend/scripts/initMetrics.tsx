#!/usr/bin/env node

const { dbOperations } = require('../database');
const MetricsService = require('../services/MetricsService');
const path = require('path');
const fs = require('fs').promises;

async function initializeMetrics() {
  console.log('🚀 Initializing metrics system...');
  console.log('='.repeat(50));
  
  try {
    // Ensure tables exist
    console.log('1. Creating metrics tables...');
    
    const tables = [
      // Core metrics tables
      `CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_key TEXT UNIQUE NOT NULL,
        metric_value TEXT NOT NULL,
        metric_type TEXT DEFAULT 'gauge',
        unit TEXT,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        response_time_ms INTEGER NOT NULL,
        status_code INTEGER,
        request_size INTEGER,
        response_size INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        user_id TEXT,
        user_email TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS system_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        source_module TEXT,
        affected_items TEXT,
        recommendations TEXT,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_email TEXT,
        activity_type TEXT NOT NULL,
        activity_details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT,
        blocked_by TEXT DEFAULT 'system',
        attempts INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    ];
    
    for (const tableSql of tables) {
      try {
        await dbOperations.run(tableSql);
        console.log(`   ✓ Created table`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠ Table already exists or error: ${error.message}`);
        }
      }
    }
    
    console.log('2. Inserting initial metrics...');
    
    // Insert basic metrics
    const basicMetrics = [
      ['system_uptime_days', '0', 'counter', 'days', 'System uptime in days'],
      ['database_size_mb', '0', 'gauge', 'MB', 'Database size in megabytes'],
      ['avg_response_time', '0', 'gauge', 'ms', 'Average API response time'],
      ['failed_login_attempts_24h', '0', 'counter', 'count', 'Failed login attempts in last 24 hours'],
      ['active_users', '3', 'gauge', 'count', 'Active user count'],
      ['total_events', '0', 'gauge', 'count', 'Total events in system'],
      ['active_events', '0', 'gauge', 'count', 'Active events'],
      ['pending_events', '0', 'gauge', 'count', 'Pending event approvals'],
      ['last_system_restart', new Date().toISOString(), 'timestamp', null, 'Last system restart time'],
      ['database_uptime_days', '0', 'counter', 'days', 'Database uptime in days'],
      ['new_users_today', '0', 'counter', 'count', 'New users registered today'],
      ['events_created_today', '0', 'counter', 'count', 'Events created today'],
      ['password_resets_24h', '0', 'counter', 'count', 'Password resets in last 24 hours'],
      ['active_blocked_ips', '0', 'gauge', 'count', 'Currently blocked IP addresses'],
      ['last_backup_status', 'none', 'status', null, 'Last backup status'],
      ['last_backup_time', 'Never', 'timestamp', null, 'Last backup time']
    ];
    
    let insertedCount = 0;
    for (const metric of basicMetrics) {
      try {
        await dbOperations.run(`
          INSERT OR REPLACE INTO system_metrics (metric_key, metric_value, metric_type, unit, description)
          VALUES (?, ?, ?, ?, ?)
        `, metric);
        insertedCount++;
      } catch (error) {
        console.log(`   ⚠ Could not insert metric ${metric[0]}: ${error.message}`);
      }
    }
    
    console.log(`   ✓ Inserted ${insertedCount} metrics`);
    
    console.log('3. Creating and starting MetricsService...');
    
    // Create and start metrics service
    const metricsService = new MetricsService();
    await metricsService.startMetricsCollection();
    
    // Force initial update
    if (metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe) {
      const updateMethod = metricsService.updateAllMetrics || metricsService.updateAllMetricsSafe;
      await updateMethod.call(metricsService);
      console.log('   ✓ Initial metrics update completed');
    }
    
    // Get database size
    try {
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      const stats = await fs.stat(dbPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      await dbOperations.run(`
        UPDATE system_metrics 
        SET metric_value = ?, updated_at = datetime('now') 
        WHERE metric_key = 'database_size_mb'
      `, [sizeMB]);
      
      console.log(`   ✓ Database size: ${sizeMB} MB`);
    } catch (error) {
      console.log(`   ⚠ Could not get database size: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ METRICS SYSTEM INITIALIZED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Check metrics status: http://localhost:8081/api/health');
    console.log('3. View dashboard metrics: http://localhost:8081/api/metrics/dashboard-metrics');
    console.log('4. Debug metrics: http://localhost:8081/api/debug/debug-metrics');
    console.log('\nAvailable metrics endpoints:');
    console.log('  - /api/metrics/dashboard-metrics');
    console.log('  - /api/metrics/user-stats');
    console.log('  - /api/metrics/event-stats');
    console.log('  - /api/metrics/performance');
    console.log('  - /api/debug/debug-metrics');
    console.log('  - /api/debug/all-metrics');
    console.log('='.repeat(50) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED to initialize metrics:', error);
    console.error('Error details:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database connection');
    console.error('2. File permissions');
    console.error('3. SQLite database file exists');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeMetrics();
}

module.exports = { initializeMetrics };