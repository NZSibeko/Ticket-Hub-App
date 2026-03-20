const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ticket_hub.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Migrating support chat tables...');

// Rename tables if they exist with old names
db.serialize(() => {
  // Check if old 'conversations' table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'", (err, row) => {
    if (row) {
      console.log('Found old conversations table, renaming to support_conversations...');
      
      // Copy data from old to new table
      db.run(`
        CREATE TABLE IF NOT EXISTS support_conversations AS 
        SELECT * FROM conversations
      `, (err) => {
        if (err) {
          console.error('Error creating support_conversations:', err.message);
        } else {
          console.log('✓ Created support_conversations from conversations');
          
          // Drop old table
          db.run('DROP TABLE conversations', (err) => {
            if (err) {
              console.error('Error dropping conversations:', err.message);
            } else {
              console.log('✓ Dropped old conversations table');
            }
          });
        }
      });
    }
  });
  
  // Check if old 'messages' table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'", (err, row) => {
    if (row) {
      console.log('Found old messages table, renaming to support_messages...');
      
      // Copy data from old to new table
      db.run(`
        CREATE TABLE IF NOT EXISTS support_messages AS 
        SELECT * FROM messages
      `, (err) => {
        if (err) {
          console.error('Error creating support_messages:', err.message);
        } else {
          console.log('✓ Created support_messages from messages');
          
          // Drop old table
          db.run('DROP TABLE messages', (err) => {
            if (err) {
              console.error('Error dropping messages:', err.message);
            } else {
              console.log('✓ Dropped old messages table');
            }
          });
        }
      });
    }
  });
  
  // Create missing tables if they don't exist
  setTimeout(() => {
    console.log('\nCreating missing tables if needed...');
    
    // Create support_agent_status if missing
    db.run(`
      CREATE TABLE IF NOT EXISTS support_agent_status (
        agent_id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'available',
        auto_assign INTEGER DEFAULT 1,
        last_active TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating support_agent_status:', err.message);
      } else {
        console.log('✓ support_agent_status table verified');
      }
    });
    
    // Check if support_conversations has all columns
    db.all("PRAGMA table_info(support_conversations)", (err, columns) => {
      if (columns) {
        const columnNames = columns.map(col => col.name);
        
        // Add missing columns
        if (!columnNames.includes('last_message')) {
          db.run('ALTER TABLE support_conversations ADD COLUMN last_message TEXT', (err) => {
            if (!err) console.log('✓ Added last_message column');
          });
        }
        
        if (!columnNames.includes('last_message_time')) {
          db.run('ALTER TABLE support_conversations ADD COLUMN last_message_time TEXT', (err) => {
            if (!err) console.log('✓ Added last_message_time column');
          });
        }
      }
    });
    
    // Check if support_messages has all columns
    db.all("PRAGMA table_info(support_messages)", (err, columns) => {
      if (columns) {
        const columnNames = columns.map(col => col.name);
        
        // Add missing columns
        if (!columnNames.includes('delivered')) {
          db.run('ALTER TABLE support_messages ADD COLUMN delivered INTEGER DEFAULT 0', (err) => {
            if (!err) console.log('✓ Added delivered column');
          });
        }
      }
    });
    
    console.log('\n✅ Migration complete!');
    console.log('✅ Tables are now: support_conversations, support_messages, support_agent_status');
    console.log('\nRestart your server for changes to take effect.');
    
    db.close();
  }, 1000);
});