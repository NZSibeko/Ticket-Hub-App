const { dbOperations } = require('./database');

async function fixDatabase() {
  try {
    console.log('Checking payments table structure...\n');
    
    // Check current table structure
    const tableInfo = await dbOperations.all('PRAGMA table_info(payments)');
    console.log('Current payments table columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Check if created_at exists
    const hasCreatedAt = tableInfo.some(col => col.name === 'created_at');
    
    if (hasCreatedAt) {
      console.log('\n✅ created_at column already exists! No changes needed.');
    } else {
      console.log('\n📝 Adding created_at column to payments table...');
      
      await dbOperations.run(
        'ALTER TABLE payments ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
      );
      
      console.log('✅ Database schema updated successfully!\n');
      
      // Verify the change
      const updatedTableInfo = await dbOperations.all('PRAGMA table_info(payments)');
      console.log('Updated payments table columns:');
      updatedTableInfo.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }
    
    // Show some stats
    console.log('\n📊 Database Statistics:');
    const ticketCount = await dbOperations.get('SELECT COUNT(*) as count FROM tickets');
    console.log(`  - Total tickets: ${ticketCount.count}`);
    
    const paymentCount = await dbOperations.get('SELECT COUNT(*) as count FROM payments');
    console.log(`  - Total payment records: ${paymentCount.count}`);
    
    console.log('\n✅ Database check complete!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Column already exists! No changes needed.');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

fixDatabase();