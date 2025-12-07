// backend/reset-metrics.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ticket_hub.db');
const db = new sqlite3.Database(dbPath);

console.log('Fixing metrics database...');

// Fix 1: Clean up duplicate metrics
db.serialize(() => {
  // First, let's see what we have
  db.all("SELECT metric_key, COUNT(*) as count FROM system_metrics GROUP BY metric_key HAVING count > 1", (err, duplicates) => {
    if (err) {
      console.error('Error checking duplicates:', err);
      return;
    }
    
    console.log('Found duplicate metrics:', duplicates.length);
    
    // Remove duplicates, keeping only the first one
    duplicates.forEach(duplicate => {
      db.run(`
        DELETE FROM system_metrics 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) 
          FROM system_metrics 
          WHERE metric_key = ?
          GROUP BY metric_key
        ) AND metric_key = ?
      `, [duplicate.metric_key, duplicate.metric_key], (err) => {
        if (err) {
          console.error(`Error removing duplicates for ${duplicate.metric_key}:`, err);
        } else {
          console.log(`Cleaned up ${duplicate.metric_key}`);
        }
      });
    });
  });
  
  // Fix 2: Add missing tables
  setTimeout(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        ticket_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        ticket_type TEXT,
        quantity INTEGER DEFAULT 1,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `, (err) => {
      if (err) {
        console.error('Error creating tickets table:', err);
      } else {
        console.log('Tickets table verified');
      }
    });
    
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'ZAR',
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        transaction_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `, (err) => {
      if (err) {
        console.error('Error creating payments table:', err);
      } else {
        console.log('Payments table verified');
      }
    });
    
    // Fix 3: Add missing metrics safely
    setTimeout(() => {
      const missingMetrics = [
        { key: 'api_error_rate', value: '0', type: 'gauge', unit: '%', description: 'API error rate' },
        { key: 'active_sessions', value: '0', type: 'gauge', unit: 'count', description: 'Active user sessions' },
        { key: 'cpu_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'CPU usage percentage' },
        { key: 'disk_usage_percent', value: '0', type: 'gauge', unit: '%', description: 'Disk usage percentage' },
        { key: 'revenue_today', value: '0', type: 'counter', unit: 'ZAR', description: 'Revenue generated today' },
        { key: 'events_created_today', value: '0', type: 'counter', unit: 'count', description: 'Events created today' },
        { key: 'cache_hit_rate', value: '0', type: 'gauge', unit: '%', description: 'Cache hit rate' },
        { key: 'slow_queries_count', value: '0', type: 'counter', unit: 'count', description: 'Slow queries count' },
        { key: 'active_events', value: '0', type: 'gauge', unit: 'count', description: 'Active events' },
        { key: 'total_tickets', value: '0', type: 'gauge', unit: 'count', description: 'Total tickets sold' },
        { key: 'user_growth_rate', value: '0', type: 'gauge', unit: '%', description: 'User growth rate' },
        { key: 'ticket_conversion_rate', value: '0', type: 'gauge', unit: '%', description: 'Ticket conversion rate' },
        { key: 'peak_concurrent_users', value: '0', type: 'gauge', unit: 'count', description: 'Peak concurrent users' },
        { key: 'database_query_rate', value: '0', type: 'gauge', unit: 'queries/sec', description: 'Database queries per second' },
        { key: 'error_rate_5xx', value: '0', type: 'gauge', unit: '%', description: 'Server error rate' },
        { key: 'avg_page_load_time', value: '0', type: 'gauge', unit: 'ms', description: 'Average page load time' },
        { key: 'event_attendance_rate', value: '0', type: 'gauge', unit: '%', description: 'Event attendance rate' },
        { key: 'support_tickets_open', value: '0', type: 'gauge', unit: 'count', description: 'Open support tickets' },
        { key: 'avg_resolution_time', value: '0', type: 'gauge', unit: 'hours', description: 'Average ticket resolution time' },
      ];
      
      missingMetrics.forEach(metric => {
        db.run(
          `INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, unit, description) 
           VALUES (?, ?, ?, ?, ?)`,
          [metric.key, metric.value, metric.type, metric.unit, metric.description],
          (err) => {
            if (err) {
              console.error(`Error adding metric ${metric.key}:`, err.message);
            }
          }
        );
      });
      
      console.log('Missing metrics added');
      
      // Close database
      setTimeout(() => {
        db.close();
        console.log('Database fixes completed. Restart the server.');
      }, 1000);
      
    }, 1000);
    
  }, 1000);
});