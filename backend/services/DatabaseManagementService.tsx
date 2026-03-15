const { dbOperations } = require('../database');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DatabaseManagementService {
  backupPath;

  constructor() {
    this.backupPath = path.resolve(__dirname, '..', 'backups');
    this.ensureBackupDirectory();
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      console.log(`Backup directory ready: ${this.backupPath}`);
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  // Database Backup
  async backupDatabase(backupType = 'manual', backupName = null) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = backupName || `backup-${timestamp}.db`;
    const backupFilepath = path.join(this.backupPath, backupFilename);
    const sourceDbPath = path.resolve(__dirname, '..', 'ticket_hub.db');

    try {
      console.log(`Starting database backup: ${backupFilename}`);
      
      // Check if source database exists
      try {
        await fs.access(sourceDbPath);
      } catch {
        throw new Error(`Source database not found: ${sourceDbPath}`);
      }

      // Copy database file
      await fs.copyFile(sourceDbPath, backupFilepath);
      
      // Get backup size
      const stats = await fs.stat(backupFilepath);
      const sizeBytes = stats.size;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      
      const duration = Date.now() - startTime;
      
      // Log backup
      await this.logBackup({
        backup_type: backupType,
        filename: backupFilename,
        size_bytes: sizeBytes,
        status: 'success',
        duration_seconds: Math.round(duration / 1000),
        details: `Backup completed successfully. Size: ${sizeMB} MB`
      });

      // Update system metrics
      await this.updateBackupMetrics();
      
      console.log(`✅ Backup completed: ${backupFilename} (${sizeMB} MB)`);
      
      return {
        success: true,
        filename: backupFilename,
        sizeMB: sizeMB,
        duration: duration,
        filepath: backupFilepath
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logBackup({
        backup_type: backupType,
        filename: backupFilename,
        size_bytes: 0,
        status: 'failed',
        duration_seconds: Math.round(duration / 1000),
        details: `Backup failed: ${error.message}`
      });

      console.error(`❌ Backup failed:`, error);
      
      return {
        success: false,
        error: error.message,
        duration: duration
      };
    }
  }

  // Database Restore
  async restoreDatabase(backupFilename) {
    const startTime = Date.now();
    const backupFilepath = path.join(this.backupPath, backupFilename);
    const targetDbPath = path.resolve(__dirname, '..', 'ticket_hub.db');

    try {
      console.log(`Starting database restore from: ${backupFilename}`);
      
      // Check if backup exists
      try {
        await fs.access(backupFilepath);
      } catch {
        throw new Error(`Backup file not found: ${backupFilename}`);
      }

      // Create a backup of current database before restore
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const preRestoreBackup = `pre-restore-${timestamp}.db`;
      const preRestorePath = path.join(this.backupPath, preRestoreBackup);
      
      try {
        await fs.copyFile(targetDbPath, preRestorePath);
        console.log(`Created pre-restore backup: ${preRestoreBackup}`);
      } catch (error) {
        console.warn('Could not create pre-restore backup:', error.message);
      }

      // Stop any running processes that might be using the database
      // This is important for SQLite to avoid locking issues
      
      // Copy backup to main database
      await fs.copyFile(backupFilepath, targetDbPath);
      
      const duration = Date.now() - startTime;
      
      // Log restore
      await this.logBackup({
        backup_type: 'restore',
        filename: backupFilename,
        size_bytes: 0,
        status: 'success',
        duration_seconds: Math.round(duration / 1000),
        details: `Database restored from ${backupFilename}. Pre-restore backup: ${preRestoreBackup}`
      });

      console.log(`✅ Database restored from: ${backupFilename}`);
      
      return {
        success: true,
        message: `Database restored successfully from ${backupFilename}`,
        duration: duration,
        preRestoreBackup: preRestoreBackup
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logBackup({
        backup_type: 'restore',
        filename: backupFilename,
        size_bytes: 0,
        status: 'failed',
        duration_seconds: Math.round(duration / 1000),
        details: `Restore failed: ${error.message}`
      });

      console.error(`❌ Restore failed:`, error);
      
      return {
        success: false,
        error: error.message,
        duration: duration
      };
    }
  }

  // Database Optimization
  async optimizeDatabase() {
    const startTime = Date.now();

    try {
      console.log('Starting database optimization...');
      
      // Run VACUUM to rebuild database file and reduce size
      await dbOperations.run('VACUUM');
      
      // Run ANALYZE to update statistics
      await dbOperations.run('ANALYZE');
      
      // Reindex all tables
      const tables = await dbOperations.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      for (const table of tables) {
        try {
          await dbOperations.run(`REINDEX ${table.name}`);
        } catch (error) {
          console.warn(`Could not reindex table ${table.name}:`, error.message);
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Log optimization
      await this.logDatabaseOperation({
        operation_type: 'optimization',
        status: 'success',
        duration_seconds: Math.round(duration / 1000),
        details: 'Database optimized: VACUUM, ANALYZE, and REINDEX completed'
      });

      // Get database size after optimization
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      const stats = await fs.stat(dbPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Database optimization completed. Size: ${sizeMB} MB`);
      
      return {
        success: true,
        message: 'Database optimization completed successfully',
        duration: duration,
        sizeMB: sizeMB,
        operations: ['VACUUM', 'ANALYZE', 'REINDEX']
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logDatabaseOperation({
        operation_type: 'optimization',
        status: 'failed',
        duration_seconds: Math.round(duration / 1000),
        details: `Optimization failed: ${error.message}`
      });

      console.error(`❌ Database optimization failed:`, error);
      
      return {
        success: false,
        error: error.message,
        duration: duration
      };
    }
  }

  // Database Integrity Check
  async checkDatabaseIntegrity() {
    const startTime = Date.now();

    try {
      console.log('Starting database integrity check...');
      
      // Run integrity check
      const integrityCheck = await dbOperations.get('PRAGMA integrity_check');
      
      // Check foreign key constraints
      const foreignKeyCheck = await dbOperations.get('PRAGMA foreign_key_check');
      
      // Get database statistics
      const pageCount = await dbOperations.get('PRAGMA page_count');
      const pageSize = await dbOperations.get('PRAGMA page_size');
      const totalSize = (pageCount.page_count * pageSize.page_size) / (1024 * 1024);
      
      const duration = Date.now() - startTime;
      
      const result = {
        integrity_check: integrityCheck,
        foreign_key_check: foreignKeyCheck || 'No errors',
        page_count: pageCount.page_count,
        page_size: pageSize.page_size,
        total_size_mb: totalSize.toFixed(2),
        duration: duration
      };
      
      // Log integrity check
      await this.logDatabaseOperation({
        operation_type: 'integrity_check',
        status: integrityCheck.integrity_check === 'ok' ? 'success' : 'warning',
        duration_seconds: Math.round(duration / 1000),
        details: `Integrity check: ${integrityCheck.integrity_check}. Size: ${totalSize.toFixed(2)} MB`
      });

      if (integrityCheck.integrity_check === 'ok') {
        console.log(`✅ Database integrity check passed. Size: ${totalSize.toFixed(2)} MB`);
      } else {
        console.warn(`⚠ Database integrity issues found:`, integrityCheck);
      }
      
      return {
        success: integrityCheck.integrity_check === 'ok',
        ...result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logDatabaseOperation({
        operation_type: 'integrity_check',
        status: 'failed',
        duration_seconds: Math.round(duration / 1000),
        details: `Integrity check failed: ${error.message}`
      });

      console.error(`❌ Database integrity check failed:`, error);
      
      return {
        success: false,
        error: error.message,
        duration: duration
      };
    }
  }

  // Clean Old Data
  async cleanOldData(daysToKeep = 30, dryRun = false) {
    const startTime = Date.now();
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

    try {
      console.log(`Cleaning data older than ${daysToKeep} days...`);
      
      const tablesToClean = [
        { table: 'performance_metrics', dateField: 'created_at' },
        { table: 'security_logs', dateField: 'created_at', where: "severity NOT IN ('high', 'critical')" },
        { table: 'user_activity_logs', dateField: 'created_at' },
        { table: 'system_resource_metrics', dateField: 'created_at' },
        { table: 'api_performance_metrics', dateField: 'created_at' },
        { table: 'database_query_metrics', dateField: 'created_at' },
        { table: 'cache_performance_metrics', dateField: 'created_at' }
      ];

      const results = {
        totalDeleted: 0,
        tableResults: []
      };

      for (const tableInfo of tablesToClean) {
        try {
          // Count rows to be deleted
          let countQuery = `SELECT COUNT(*) as count FROM ${tableInfo.table} WHERE ${tableInfo.dateField} < ?`;
          if (tableInfo.where) {
            countQuery += ` AND ${tableInfo.where}`;
          }
          
          const countResult = await dbOperations.get(countQuery, [cutoffDate]);
          const countToDelete = countResult?.count || 0;
          
          if (countToDelete > 0) {
            if (!dryRun) {
              // Actually delete the data
              let deleteQuery = `DELETE FROM ${tableInfo.table} WHERE ${tableInfo.dateField} < ?`;
              const deleteParams = [cutoffDate];
              
              if (tableInfo.where) {
                deleteQuery += ` AND ${tableInfo.where}`;
              }
              
              const deleteResult = await dbOperations.run(deleteQuery, deleteParams);
              
              results.tableResults.push({
                table: tableInfo.table,
                deleted: deleteResult.changes || 0,
                dryRun: false
              });
              
              results.totalDeleted += deleteResult.changes || 0;
            } else {
              // Dry run - just report what would be deleted
              results.tableResults.push({
                table: tableInfo.table,
                wouldDelete: countToDelete,
                dryRun: true
              });
              
              results.totalDeleted += countToDelete;
            }
          }
        } catch (error) {
          console.warn(`Could not clean table ${tableInfo.table}:`, error.message);
          results.tableResults.push({
            table: tableInfo.table,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      
      // Log cleanup
      await this.logDatabaseOperation({
        operation_type: dryRun ? 'cleanup_dry_run' : 'cleanup',
        status: 'success',
        duration_seconds: Math.round(duration / 1000),
        details: `Cleaned ${results.totalDeleted} records from ${results.tableResults.length} tables${dryRun ? ' (dry run)' : ''}`
      });

      console.log(`✅ Cleanup completed. Total records ${dryRun ? 'that would be' : ''} deleted: ${results.totalDeleted}`);
      
      return {
        success: true,
        dryRun: dryRun,
        ...results,
        duration: duration,
        cutoffDate: cutoffDate
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logDatabaseOperation({
        operation_type: 'cleanup',
        status: 'failed',
        duration_seconds: Math.round(duration / 1000),
        details: `Cleanup failed: ${error.message}`
      });

      console.error(`❌ Data cleanup failed:`, error);
      
      return {
        success: false,
        error: error.message,
        duration: duration,
        dryRun: dryRun
      };
    }
  }

  // Get Database Statistics
  async getDatabaseStatistics() {
    try {
      // Get all table names
      const tables = await dbOperations.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      
      const tableStats = [];
      let totalRows = 0;
      let totalSize = 0;

      for (const table of tables) {
        try {
          // Get row count
          const rowCount = await dbOperations.get(`SELECT COUNT(*) as count FROM ${table.name}`);
          const count = rowCount?.count || 0;
          totalRows += count;
          
          // Estimate size (approximate)
          const sizeEstimate = await dbOperations.get(
            `SELECT SUM(length(CAST(rowid AS TEXT)) + 100) as estimated_size FROM ${table.name}`
          );
          const size = sizeEstimate?.estimated_size || 0;
          totalSize += size;
          
          // Get schema info
          const schema = await dbOperations.all(`PRAGMA table_info(${table.name})`);
          
          tableStats.push({
            table: table.name,
            rowCount: count,
            estimatedSizeKB: Math.round(size / 1024),
            columnCount: schema.length,
            columns: schema.map(col => col.name)
          });
        } catch (error) {
          tableStats.push({
            table: table.name,
            error: error.message
          });
        }
      }

      // Get actual file size
      const dbPath = path.resolve(__dirname, '..', 'ticket_hub.db');
      let fileSizeMB: string | number = 0;
      try {
        const stats = await fs.stat(dbPath);
        fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      } catch (error) {
        console.warn('Could not get database file size:', error.message);
      }

      // Get index information
      const indexes = await dbOperations.all(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
      );

      // Get database settings
      const pageSize = await dbOperations.get('PRAGMA page_size');
      const pageCount = await dbOperations.get('PRAGMA page_count');
      const journalMode = await dbOperations.get('PRAGMA journal_mode');
      const synchronous = await dbOperations.get('PRAGMA synchronous');
      const foreignKeys = await dbOperations.get('PRAGMA foreign_keys');

      return {
        success: true,
        statistics: {
          totalTables: tables.length,
          totalRows: totalRows,
          estimatedTotalSizeKB: Math.round(totalSize / 1024),
          actualFileSizeMB: fileSizeMB,
          totalIndexes: indexes.length,
          indexes: indexes.map(idx => ({ name: idx.name, table: idx.tbl_name })),
          settings: {
            pageSize: pageSize.page_size,
            pageCount: pageCount.page_count,
            journalMode: journalMode.journal_mode,
            synchronous: synchronous.synchronous,
            foreignKeys: foreignKeys.foreign_keys
          }
        },
        tables: tableStats
      };

    } catch (error) {
      console.error('Error getting database statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // List Backups
  async listBackups(limit = 20) {
    try {
      const files = await fs.readdir(this.backupPath);
      
      const backups = [];
      for (const file of files) {
        if (file.endsWith('.db')) {
          try {
            const filepath = path.join(this.backupPath, file);
            const stats = await fs.stat(filepath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            backups.push({
              filename: file,
              sizeMB: sizeMB,
              created: stats.birthtime || stats.ctime,
              modified: stats.mtime,
              path: filepath
            });
          } catch (error) {
            console.warn(`Could not read backup file ${file}:`, error.message);
          }
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      return {
        success: true,
        total: backups.length,
        backups: backups.slice(0, limit),
        backupPath: this.backupPath
      };

    } catch (error) {
      console.error('Error listing backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete Backup
  async deleteBackup(filename) {
    try {
      const filepath = path.join(this.backupPath, filename);
      
      // Check if file exists
      await fs.access(filepath);
      
      // Delete the file
      await fs.unlink(filepath);
      
      console.log(`Deleted backup: ${filename}`);
      
      return {
        success: true,
        message: `Backup ${filename} deleted successfully`
      };

    } catch (error) {
      console.error(`Error deleting backup ${filename}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods
  async logBackup(backupData) {
    try {
      await dbOperations.run(`
        INSERT INTO backup_logs 
        (backup_type, filename, size_bytes, status, duration_seconds, details, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        backupData.backup_type,
        backupData.filename,
        backupData.size_bytes,
        backupData.status,
        backupData.duration_seconds,
        backupData.details,
        backupData.created_by || 'system'
      ]);
    } catch (error) {
      console.error('Error logging backup:', error);
    }
  }

  async logDatabaseOperation(operationData) {
    try {
      await dbOperations.run(`
        INSERT INTO system_config_logs 
        (config_key, old_value, new_value, change_type, reason, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        `database.${operationData.operation_type}`,
        null,
        operationData.status,
        operationData.operation_type,
        operationData.details
      ]);
    } catch (error) {
      console.error('Error logging database operation:', error);
    }
  }

  async updateBackupMetrics() {
    try {
      // Get latest backup info
      const latestBackup = await dbOperations.get(`
        SELECT * FROM backup_logs 
        WHERE status = 'success' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (latestBackup) {
        await dbOperations.run(`
          UPDATE system_metrics 
          SET metric_value = ?, updated_at = datetime('now') 
          WHERE metric_key = 'last_backup_time'
        `, [latestBackup.created_at]);
        
        await dbOperations.run(`
          UPDATE system_metrics 
          SET metric_value = ?, updated_at = datetime('now') 
          WHERE metric_key = 'last_backup_status'
        `, [latestBackup.status]);
      }
    } catch (error) {
      console.error('Error updating backup metrics:', error);
    }
  }

  // Schedule Automatic Backups
  scheduleAutomaticBackups(intervalHours = 24) {
    console.log(`Scheduling automatic backups every ${intervalHours} hours`);
    
    setInterval(async () => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `auto-backup-${timestamp}.db`;
        
        console.log(`Starting automatic backup: ${backupName}`);
        
        const result = await this.backupDatabase('automatic', backupName);
        
        if (result.success) {
          console.log(`✅ Automatic backup completed: ${backupName}`);
          
          // Clean old automatic backups (keep last 7)
          const backups = await this.listBackups(50);
          const autoBackups = backups.backups.filter(b => 
            b.filename.startsWith('auto-backup-')
          );
          
          if (autoBackups.length > 7) {
            const toDelete = autoBackups.slice(7);
            for (const backup of toDelete) {
              await this.deleteBackup(backup.filename);
              console.log(`Deleted old automatic backup: ${backup.filename}`);
            }
          }
        } else {
          console.error(`❌ Automatic backup failed:`, result.error);
        }
      } catch (error) {
        console.error('Error in automatic backup schedule:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

module.exports = DatabaseManagementService;