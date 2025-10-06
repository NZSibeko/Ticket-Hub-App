const { dbOperations } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Check if data already exists
    const existingCustomers = await dbOperations.get('SELECT COUNT(*) as count FROM customers');
    
    // If data exists, still check if admins exist and create them if not
    const existingAdmins = await dbOperations.get('SELECT COUNT(*) as count FROM admins');
    
    if (existingAdmins.count === 0) {
      console.log('👔 No admin users found. Seeding admin users...');
      
      // SEED ADMIN USERS
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
        }
      ];

      for (const admin of admins) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        await dbOperations.run(
          `INSERT INTO admins (admin_id, username, email, password_hash, role)
           VALUES (?, ?, ?, ?, ?)`,
          [admin.admin_id, admin.username, admin.email, passwordHash, admin.role]
        );
        console.log(`✅ Created admin: ${admin.username}`);
      }
      console.log(`✅ Created ${admins.length} admin users\n`);
    }

    if (existingCustomers.count === 0) {
      console.log('📝 Seeding customers...');
      
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
          created_by: customers[0].customer_id
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
          created_by: customers[0].customer_id
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
    }

    console.log('✨ Database seeding completed!\n');
    console.log('🔐 Test Admin Logins:');
    console.log('   Super Admin - Username: admin / Password: admin123');
    console.log('   Event Manager - Username: eventmanager / Password: manager123\n');
    console.log('🔐 Test Customer Login:');
    console.log('   Email: john.doe@example.com / Password: password123\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase().then(() => process.exit(0));