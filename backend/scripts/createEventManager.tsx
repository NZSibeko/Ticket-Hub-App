// scripts/createEventManager.js
// Run this script to create an event manager account
// Usage: node scripts/createEventManager.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbOperations, connectDatabase } = require('../database');

async function createEventManager() {
  try {
    // Connect to database
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Event manager details
    const eventManager = {
      username: 'eventmanager',
      email: 'manager@tickethub.co.za',
      password: 'eventmanager123', // Change this!
      firstName: 'Event',
      lastName: 'Manager'
    };

    // Check if event manager already exists
    const existing = await dbOperations.get(
      'SELECT * FROM event_managers WHERE email = ? OR username = ?',
      [eventManager.email, eventManager.username]
    );

    if (existing) {
      console.log('⚠️  Event manager already exists:');
      console.log('   Username:', existing.username);
      console.log('   Email:', existing.email);
      console.log('\n💡 Use these credentials to login as event manager');
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(eventManager.password, 10);

    // Create event manager
    const managerId = uuidv4();
    await dbOperations.run(
      `INSERT INTO event_managers (
        manager_id, username, email, password_hash, 
        first_name, last_name, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)`,
      [
        managerId,
        eventManager.username,
        eventManager.email,
        passwordHash,
        eventManager.firstName,
        eventManager.lastName
      ]
    );

    console.log('✅ Event manager created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Username:', eventManager.username);
    console.log('   Email:', eventManager.email);
    console.log('   Password:', eventManager.password);
    console.log('\n🔒 Please change the password after first login!\n');
    console.log('🎯 Access the Event Planner at: http://localhost:3000/api/event-manager/planner/events');
    
  } catch (error) {
    console.error('❌ Error creating event manager:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createEventManager();