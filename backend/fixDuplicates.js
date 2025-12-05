const { dbOperations } = require('./database');

(async () => {
  try {
    console.log('Starting database cleanup...');
    
    // 1. Fix duplicate system_metrics
    console.log('Fixing duplicate system_metrics...');
    await dbOperations.run(`
      DELETE FROM system_metrics 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM system_metrics 
        GROUP BY metric_key
      )
    `);
    
    // 2. Fix duplicate dashboard_metrics
    console.log('Fixing duplicate dashboard_metrics...');
    await dbOperations.run(`
      DELETE FROM dashboard_metrics 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM dashboard_metrics 
        GROUP BY key
      )
    `);
    
    // 3. Fix duplicate dashboard_user_list
    console.log('Fixing duplicate dashboard_user_list...');
    await dbOperations.run(`
      DELETE FROM dashboard_user_list 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM dashboard_user_list 
        GROUP BY email
      )
    `);
    
    // 4. Fix duplicate blocked_ips
    console.log('Fixing duplicate blocked_ips...');
    await dbOperations.run(`
      DELETE FROM blocked_ips 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM blocked_ips 
        GROUP BY ip_address
      )
    `);
    
    // 5. Count remaining records
    const metricsCount = await dbOperations.get('SELECT COUNT(*) as count FROM system_metrics');
    const dashboardMetricsCount = await dbOperations.get('SELECT COUNT(*) as count FROM dashboard_metrics');
    const usersCount = await dbOperations.get('SELECT COUNT(*) as count FROM dashboard_user_list');
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`   System metrics: ${metricsCount.count} records`);
    console.log(`   Dashboard metrics: ${dashboardMetricsCount.count} records`);
    console.log(`   Dashboard users: ${usersCount.count} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
})();