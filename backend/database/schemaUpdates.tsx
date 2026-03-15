// backend/database/schemaUpdates.js
const { dbOperations } = require('./index');

async function addSessionTrackingTables() {
  try {
    console.log('Creating session tracking tables...');
    
    // Create session activity logs table
    await dbOperations.run(`
      CREATE TABLE IF NOT EXISTS session_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        session_action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        session_duration_minutes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Create index for faster session queries
    await dbOperations.run(`
      CREATE INDEX IF NOT EXISTS idx_session_activity_user ON session_activity_logs(user_email, session_action, created_at)
    `);
    
    // Create index for session duration analysis
    await dbOperations.run(`
      CREATE INDEX IF NOT EXISTS idx_session_duration ON session_activity_logs(session_duration_minutes, created_at)
    `);
    
    // Add session metrics to system_metrics table if they don't exist
    const sessionMetrics = [
      ['active_sessions', '0', 'gauge', 'Active user sessions', ''],
      ['concurrent_sessions', '0', 'gauge', 'Concurrent user sessions', ''],
      ['avg_session_duration_minutes', '0', 'gauge', 'Average session duration', 'min'],
      ['max_session_duration_minutes', '0', 'gauge', 'Maximum session duration', 'min'],
      ['session_health_score', '75', 'gauge', 'Session health score (0-100)', ''],
      ['session_last_updated', '1970-01-01T00:00:00.000Z', 'timestamp', 'Last session metrics update', '']
    ];
    
    for (const [key, value, type, desc, unit] of sessionMetrics) {
      try {
        await dbOperations.run(`
          INSERT OR IGNORE INTO system_metrics (metric_key, metric_value, metric_type, description, unit, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [key, value, type, desc, unit]);
      } catch (error) {
        console.log(`Could not insert session metric ${key}:`, error.message);
      }
    }
    
    console.log('✓ Session tracking tables created successfully');
    
  } catch (error) {
    console.error('Error creating session tracking tables:', error.message);
  }
}

module.exports = { addSessionTrackingTables };