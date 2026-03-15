const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

router.get('/summary', async (req, res) => {
  try {
    const user = req.user || {};
    const userId = user.userId || user.id || user.support_id || null;
    const userEmail = user.email || null;

    const assignedEvents = await dbOperations.get(
      `SELECT COUNT(*) as count
       FROM events
       WHERE (created_by = ? OR user_type = 'event_support_consultant')
         AND archived != 1`,
      [userEmail]
    ).catch(() => ({ count: 0 }));

    const scans = await dbOperations.get(
      `SELECT COUNT(*) as count
       FROM ticket_scans
       WHERE scanned_by_user_id = ?`,
      [String(userId || '')]
    ).catch(() => ({ count: 0 }));

    const openIssues = await dbOperations.get(
      `SELECT COUNT(*) as count
       FROM support_tasks
       WHERE status IN ('open', 'in_progress')`,
    ).catch(() => ({ count: 0 }));

    const escalations = await dbOperations.get(
      `SELECT COUNT(*) as count
       FROM support_tasks
       WHERE priority = 'high' AND status IN ('open', 'in_progress')`,
    ).catch(() => ({ count: 0 }));

    const recentTasks = await dbOperations.all(
      `SELECT id, title, status, priority, due_at, created_at
       FROM support_tasks
       ORDER BY datetime(COALESCE(due_at, created_at, datetime('now'))) DESC
       LIMIT 10`
    ).catch(() => []);

    const recentEvents = await dbOperations.all(
      `SELECT event_id, event_name, status, start_date, location
       FROM events
       WHERE archived != 1
       ORDER BY datetime(COALESCE(start_date, created_at, datetime('now'))) DESC
       LIMIT 6`
    ).catch(() => []);

    res.json({
      success: true,
      data: {
        stats: {
          assignedEvents: assignedEvents?.count || 0,
          ticketsScanned: scans?.count || 0,
          openEventIssues: openIssues?.count || 0,
          escalations: escalations?.count || 0,
        },
        tasks: recentTasks || [],
        events: recentEvents || [],
      }
    });
  } catch (error) {
    console.error('[EVENT SUPPORT WORKSPACE] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load event support workspace' });
  }
});

module.exports = router;
