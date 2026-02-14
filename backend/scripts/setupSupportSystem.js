const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setupSupportSystem(db) {
  console.log('🔧 Setting up Support System...');
  
  try {
    // 1. Create support staff table if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS support_staff (
        support_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT,
        password TEXT NOT NULL,
        phone TEXT,
        department TEXT DEFAULT 'technical',
        role TEXT DEFAULT 'support',
        status TEXT DEFAULT 'active',
        availability_status TEXT DEFAULT 'available',
        max_tickets INTEGER DEFAULT 10,
        current_tickets INTEGER DEFAULT 0,
        avg_response_time INTEGER DEFAULT 0,
        satisfaction_rating REAL DEFAULT 0.0,
        last_login TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // 2. Create support_agents table
    await db.run(`
      CREATE TABLE IF NOT EXISTS support_agents (
        support_id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'busy', 'offline', 'break')),
        current_conversations INTEGER DEFAULT 0,
        max_conversations INTEGER DEFAULT 10,
        auto_assign INTEGER DEFAULT 1,
        last_assigned_at TEXT,
        last_status_update TEXT DEFAULT (datetime('now')),
        performance_score REAL DEFAULT 0.0,
        FOREIGN KEY (support_id) REFERENCES support_staff(support_id)
      )
    `);
    
    // 3. Create default support staff if not exists
    const existingSupport = await db.get(
      `SELECT * FROM support_staff WHERE email = ?`,
      ['support@tickethub.co.za']
    );
    
    if (!existingSupport) {
      const supportId = uuidv4();
      const hashedPassword = await bcrypt.hash('support123', 10);
      const now = new Date().toISOString();
      
      await db.run(`
        INSERT INTO support_staff (
          support_id, name, email, password, phone, 
          department, role, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supportId,
        'Support Agent',
        'support@tickethub.co.za',
        hashedPassword,
        '+27 71 000 0000',
        'technical',
        'support',
        'active',
        now
      ]);
      
      // Add to support_agents table
      await db.run(`
        INSERT INTO support_agents (support_id) VALUES (?)
      `, [supportId]);
      
      console.log('✅ Default support agent created');
    }
    
    // 4. Create test conversations
    await createTestConversations(db);
    
    console.log('✅ Support system setup complete');
    
  } catch (error) {
    console.error('❌ Error setting up support system:', error);
  }
}

async function createTestConversations(db) {
  const platforms = ['whatsapp', 'facebook', 'instagram', 'twitter', 'tiktok'];
  const customers = [
    { id: 'cust_001', name: 'John Doe' },
    { id: 'cust_002', name: 'Jane Smith' },
    { id: 'cust_003', name: 'Bob Johnson' }
  ];
  
  for (const platform of platforms) {
    for (const customer of customers) {
      const conversationId = uuidv4();
      const now = new Date().toISOString();
      
      // Check if conversation exists
      const exists = await db.get(
        `SELECT * FROM conversations WHERE conversation_id = ?`,
        [conversationId]
      );
      
      if (!exists) {
        await db.run(`
          INSERT INTO conversations (
            conversation_id, platform, customer_id, 
            customer_name, status, created_at, last_activity
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          conversationId,
          platform,
          customer.id,
          customer.name,
          'active',
          now,
          now
        ]);
        
        // Add test message
        const messageId = uuidv4();
        await db.run(`
          INSERT INTO messages (
            message_id, conversation_id, sender_id, 
            sender_name, sender_type, content, 
            timestamp, platform, is_read
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          messageId,
          conversationId,
          customer.id,
          customer.name,
          'customer',
          `Hello, I need help with ${platform} ticket purchase`,
          now,
          platform,
          0
        ]);
      }
    }
  }
  
  console.log('✅ Test conversations created');
}

module.exports = setupSupportSystem;