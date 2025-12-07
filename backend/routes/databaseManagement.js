const express = require('express');
const router = express.Router();
const DatabaseManagementService = require('../services/DatabaseManagementService');
const SystemLogsService = require('../services/SystemLogsService');

const dbManagementService = new DatabaseManagementService();
const systemLogsService = new SystemLogsService();

// Database Backup
router.post('/backup', async (req, res) => {
  try {
    const { backupType = 'manual', backupName = null } = req.body;
    const result = await dbManagementService.backupDatabase(backupType, backupName);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database Restore
router.post('/restore', async (req, res) => {
  try {
    const { backupFilename } = req.body;
    
    if (!backupFilename) {
      return res.status(400).json({ success: false, error: 'Backup filename is required' });
    }
    
    const result = await dbManagementService.restoreDatabase(backupFilename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database Optimization
router.post('/optimize', async (req, res) => {
  try {
    const result = await dbManagementService.optimizeDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database Integrity Check
router.get('/integrity-check', async (req, res) => {
  try {
    const result = await dbManagementService.checkDatabaseIntegrity();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clean Old Data
router.post('/clean-old-data', async (req, res) => {
  try {
    const { daysToKeep = 30, dryRun = false } = req.body;
    const result = await dbManagementService.cleanOldData(daysToKeep, dryRun);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Database Statistics
router.get('/statistics', async (req, res) => {
  try {
    const result = await dbManagementService.getDatabaseStatistics();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Backups
router.get('/backups', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await dbManagementService.listBackups(parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Backup
router.delete('/backups/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await dbManagementService.deleteBackup(filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// SYSTEM LOGS ENDPOINTS
// ============================

// Get System Logs
router.get('/system-logs', async (req, res) => {
  try {
    const {
      level,
      module,
      startDate,
      endDate,
      search,
      limit = 100,
      offset = 0
    } = req.query;

    const result = await systemLogsService.getSystemLogs({
      level,
      module,
      startDate,
      endDate,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Log Statistics
router.get('/system-logs/statistics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const result = await systemLogsService.getLogStatistics(timeRange);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export Logs
router.get('/system-logs/export', async (req, res) => {
  try {
    const { format = 'json', level, module, startDate, endDate, search } = req.query;
    
    const filters = { level, module, startDate, endDate, search };
    const result = await systemLogsService.exportLogs(format, filters);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    // Set appropriate headers for download
    const contentType = {
      'json': 'application/json',
      'csv': 'text/csv',
      'text': 'text/plain'
    }[format] || 'application/json';

    const filename = `system-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear Old Logs
router.delete('/system-logs/old', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const result = await systemLogsService.clearOldLogs(daysToKeep);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Acknowledge Warnings
router.put('/system-logs/acknowledge', async (req, res) => {
  try {
    const { warningIds, acknowledgedBy = req.user?.email || 'admin' } = req.body;
    const result = await systemLogsService.acknowledgeWarnings(warningIds, acknowledgedBy);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log System Event (for testing/internal use)
router.post('/system-logs/log', async (req, res) => {
  try {
    const { level = 'INFO', module = 'API', message, details = {}, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await systemLogsService.logSystemEvent(level, module, message, details, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule Automatic Backups
router.post('/schedule-automatic-backups', async (req, res) => {
  try {
    const { intervalHours = 24 } = req.body;
    dbManagementService.scheduleAutomaticBackups(intervalHours);
    
    res.json({
      success: true,
      message: `Automatic backups scheduled every ${intervalHours} hours`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monitor Log Levels
router.get('/monitor-logs', async (req, res) => {
  try {
    const result = await systemLogsService.monitorLogLevels();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;