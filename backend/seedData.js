const { dbOperations, connectDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Ensure database is connected
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    
    // Wait a bit for connection to be fully established
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Database connected, starting seeding process...');

    // Check if data already exists
    let existingCustomers = { count: 0 };
    let existingAdmins = { count: 0 };

    try {
      existingCustomers = await dbOperations.get('SELECT COUNT(*) as count FROM customers');
      existingAdmins = await dbOperations.get('SELECT COUNT(*) as count FROM admins');
    } catch (error) {
      console.log('ℹ️  Tables might be empty, continuing with seeding...');
    }
    
    if (existingAdmins.count === 0) {
      console.log('👑 No admin users found. Seeding admin users...');
      
      // SEED ADMIN USERS WITH ALL ROLES
      const admins = [
        {
          admin_id: uuidv4(),
          username: 'admin',
          email: 'admin@tickethub.com',
          password: 'admin123',
          role: 'SUPER_ADMIN'
        },
        {
          admin_id: uuidv4(),
          username: 'eventmanager',
          email: 'manager@tickethub.com',
          password: 'manager123',
          role: 'EVENT_MANAGER'
        },
        {
          admin_id: uuidv4(),
          username: 'support',
          email: 'support@tickethub.com',
          password: 'support123',
          role: 'SUPPORT'
        },
        {
          admin_id: uuidv4(),
          username: 'superhero',
          email: 'superhero@tickethub.com',
          password: 'hero123',
          role: 'SUPERHERO'
        },
        {
          admin_id: uuidv4(),
          username: 'basicadmin',
          email: 'basicadmin@tickethub.com',
          password: 'admin123',
          role: 'admin'
        }
      ];

      for (const admin of admins) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        await dbOperations.run(
          `INSERT INTO admins (admin_id, username, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?)`,
          [admin.admin_id, admin.username, admin.email, passwordHash, admin.role]
        );
        console.log(`✅ Created ${admin.role}: ${admin.username}`);
      }
      console.log(`✅ Created ${admins.length} admin users\n`);
    } else {
      console.log(`✅ Admins already exist (${existingAdmins.count} found), skipping admin creation\n`);
    }

    if (existingCustomers.count === 0) {
      console.log('👥 Seeding customers...');
      
      // SEED CUSTOMERS
      const customers = [
        {
          customer_id: uuidv4(),
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone_number: '+27123456789',
          password: 'password123'
        },
        {
          customer_id: uuidv4(),
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone_number: '+27123456790',
          password: 'password123'
        },
        {
          customer_id: uuidv4(),
          first_name: 'Michael',
          last_name: 'Johnson',
          email: 'michael.j@example.com',
          phone_number: '+27123456791',
          password: 'password123'
        },
        {
          customer_id: uuidv4(),
          first_name: 'Sarah',
          last_name: 'Williams',
          email: 'sarah.w@example.com',
          phone_number: '+27123456792',
          password: 'password123'
        }
      ];

      for (const customer of customers) {
        const passwordHash = await bcrypt.hash(customer.password, 10);
        await dbOperations.run(
          `INSERT INTO customers (customer_id, first_name, last_name, email, phone_number, password_hash, account_status)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [customer.customer_id, customer.first_name, customer.last_name, customer.email, customer.phone_number, passwordHash]
        );
      }
      console.log(`✅ Created ${customers.length} customers\n`);

      // Get the created customers for event creation
      const createdCustomers = await dbOperations.all('SELECT customer_id FROM customers LIMIT 2');

      // SEED EVENTS
      console.log('📅 Seeding events...');
      const events = [
        {
          event_id: uuidv4(),
          event_name: 'Summer Music Festival 2025',
          event_description: 'Join us for the biggest music festival of the summer! Featuring top artists from around the world.',
          start_date: '2025-07-15 18:00:00',
          end_date: '2025-07-17 23:00:00',
          location: 'Johannesburg Stadium, South Africa',
          max_attendees: 5000,
          current_attendees: 0,
          price: 850.00,
          currency: 'ZAR',
          event_status: 'VALIDATED',
          created_by: createdCustomers[0].customer_id
        },
        {
          event_id: uuidv4(),
          event_name: 'Tech Conference 2025',
          event_description: 'Discover the latest in technology and innovation.',
          start_date: '2025-08-20 09:00:00',
          end_date: '2025-08-22 17:00:00',
          location: 'Cape Town Convention Centre',
          max_attendees: 1000,
          current_attendees: 0,
          price: 1200.00,
          currency: 'ZAR',
          event_status: 'VALIDATED',
          created_by: createdCustomers[0].customer_id
        },
        {
          event_id: uuidv4(),
          event_name: 'Food & Wine Expo 2025',
          event_description: 'Experience the finest culinary delights and premium wines.',
          start_date: '2025-09-10 12:00:00',
          end_date: '2025-09-12 20:00:00',
          location: 'Durban ICC',
          max_attendees: 800,
          current_attendees: 0,
          price: 650.00,
          currency: 'ZAR',
          event_status: 'VALIDATED',
          created_by: createdCustomers[1] ? createdCustomers[1].customer_id : createdCustomers[0].customer_id
        }
      ];

      for (const event of events) {
        await dbOperations.run(
          `INSERT INTO events (event_id, event_name, event_description, start_date, end_date, location, max_attendees, current_attendees, price, currency, event_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [event.event_id, event.event_name, event.event_description, event.start_date, event.end_date, event.location, event.max_attendees, event.current_attendees, event.price, event.currency, event.event_status, event.created_by]
        );
      }
      console.log(`✅ Created ${events.length} events\n`);

      // Get the created events for ticket types
      const createdEvents = await dbOperations.all('SELECT event_id FROM events ORDER BY created_at DESC LIMIT 3');

      // SEED TICKET TYPES FOR EVENTS
      console.log('🎫 Seeding ticket types...');
      const ticketTypes = [
        // For Summer Music Festival
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[0].event_id,
          type: 'early_bird',
          price: 650.00,
          quantity: 1000,
          available_quantity: 1000
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[0].event_id,
          type: 'general',
          price: 850.00,
          quantity: 3000,
          available_quantity: 3000
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[0].event_id,
          type: 'vip',
          price: 1200.00,
          quantity: 800,
          available_quantity: 800
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[0].event_id,
          type: 'vvip',
          price: 2000.00,
          quantity: 200,
          available_quantity: 200
        },
        // For Tech Conference
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[1].event_id,
          type: 'early_bird',
          price: 900.00,
          quantity: 200,
          available_quantity: 200
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[1].event_id,
          type: 'general',
          price: 1200.00,
          quantity: 700,
          available_quantity: 700
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[1].event_id,
          type: 'vip',
          price: 1800.00,
          quantity: 100,
          available_quantity: 100
        },
        // For Food & Wine Expo
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[2].event_id,
          type: 'general',
          price: 650.00,
          quantity: 600,
          available_quantity: 600
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[2].event_id,
          type: 'vip',
          price: 1200.00,
          quantity: 150,
          available_quantity: 150
        },
        {
          ticket_type_id: uuidv4(),
          event_id: createdEvents[2].event_id,
          type: 'family_group',
          price: 1800.00,
          quantity: 50,
          available_quantity: 50
        }
      ];

      for (const ticketType of ticketTypes) {
        await dbOperations.run(
          `INSERT INTO event_ticket_types (ticket_type_id, event_id, type, price, quantity, available_quantity)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [ticketType.ticket_type_id, ticketType.event_id, ticketType.type, ticketType.price, ticketType.quantity, ticketType.available_quantity]
        );
      }
      console.log(`✅ Created ${ticketTypes.length} ticket types\n`);
    } else {
      console.log(`✅ Customers already exist (${existingCustomers.count} found), skipping customer and event creation\n`);
    }

    console.log('✨ Database seeding completed!\n');
    console.log('📋 Test Admin Logins:');
    console.log('   Super Admin    - Username: admin         | Password: admin123');
    console.log('   Event Manager  - Username: eventmanager  | Password: manager123');
    console.log('   Support        - Username: support       | Password: support123');
    console.log('   Superhero      - Username: superhero     | Password: hero123');
    console.log('   Basic Admin    - Username: basicadmin    | Password: admin123\n');
    console.log('📋 Test Customer Logins:');
    console.log('   Customer 1 - Email: john.doe@example.com    | Password: password123');
    console.log('   Customer 2 - Email: jane.smith@example.com  | Password: password123');
    console.log('   Customer 3 - Email: michael.j@example.com   | Password: password123');
    console.log('   Customer 4 - Email: sarah.w@example.com     | Password: password123\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase().then(() => {
  console.log('🎉 Seeding process finished!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Seeding process failed!');
  process.exit(1);
});