// backend/database_config.js
const path = require('path');
const fs = require('fs');

class DatabaseConfig {
  constructor() {
    this.possiblePaths = [
      'consolidated_tickethub.db',
      'database.db',
      'ticket_hub.db',
      'ticket-hub.db'
    ];
    
    this.preferredPath = 'consolidated_tickethub.db';
  }
  
  findDatabase() {
    for (const dbName of this.possiblePaths) {
      const dbPath = path.resolve(__dirname, dbName);
      if (fs.existsSync(dbPath)) {
        console.log(`📁 Found database: ${dbName}`);
        return {
          name: dbName,
          path: dbPath,
          size: this.getFileSize(dbPath)
        };
      }
    }
    
    // If no database found, return the preferred path
    const preferredPath = path.resolve(__dirname, this.preferredPath);
    console.log(`📁 Creating new database: ${this.preferredPath}`);
    return {
      name: this.preferredPath,
      path: preferredPath,
      size: '0 MB'
    };
  }
  
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      return `${sizeMB} MB`;
    } catch (error) {
      return 'Unknown';
    }
  }
  
  getDatabaseInfo() {
    const dbInfo = this.findDatabase();
    
    // Check for other database files
    const allDbs = [];
    this.possiblePaths.forEach(dbName => {
      const dbPath = path.resolve(__dirname, dbName);
      if (fs.existsSync(dbPath)) {
        allDbs.push({
          name: dbName,
          path: dbPath,
          size: this.getFileSize(dbPath),
          isPrimary: dbName === dbInfo.name
        });
      }
    });
    
    return {
      primary: dbInfo,
      all: allDbs,
      count: allDbs.length
    };
  }
  
  migrateToConsolidated(sourceDb) {
    console.log(`🔄 Migrating from ${sourceDb} to consolidated_tickethub.db`);
    
    const sourcePath = path.resolve(__dirname, sourceDb);
    const targetPath = path.resolve(__dirname, 'consolidated_tickethub.db');
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source database ${sourceDb} not found`);
    }
    
    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied ${sourceDb} to consolidated_tickethub.db`);
    
    return targetPath;
  }
}

module.exports = new DatabaseConfig();