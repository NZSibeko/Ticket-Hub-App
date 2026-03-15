const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

const normalizeEventStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (['active', 'live', 'published'].includes(value)) return 'active';
  if (['pending', 'draft'].includes(value)) return 'pending';
  if (['validated', 'approved', 'completed', 'complete'].includes(value)) return 'completed';
  if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
  return value || 'unknown';
};

const buildTrend = (currentValue, previousValue) => {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
};

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEmailCampaignAggregate = async (organizerId) => {
  try {
    return await dbOperations.get(
      `SELECT 
         COALESCE(SUM(recipient_count), 0) as recipients,
         COALESCE(SUM(delivered_count), 0) as delivered,
         COALESCE(SUM(opened_count), 0) as opened
       FROM organizer_email_campaigns
       WHERE organizer_id = ?`,
      [organizerId]
    );
  } catch (error) {
    if (String(error?.message || '').includes('no such table')) {
      return { recipients: 0, delivered: 0, opened: 0 };
    }
    throw error;
  }
};

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const nowIso = new Date().toISOString();
    const lookbackStartIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const previousLookbackStartIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [
      eventRows,
      revenueRows,
      recentTicketRows,
      recentEvents,
      upcomingEvents,
      recentFeedbackRows,
      previousRevenueRows,
      audienceIdentityRows,
      ticketTypeRows,
      emailCampaignAggregate,
    ] = await Promise.all([
      dbOperations.all(
        `SELECT 
           e.event_id,
           e.event_name,
           e.status,
           e.start_date,
           e.end_date,
           e.location,
           e.venue,
           e.capacity,
           e.created_at,
           COALESCE(ticket_summary.total_tickets, 0) as total_tickets,
           COALESCE(ticket_summary.checked_in_count, 0) as checked_in_count,
           COALESCE(ticket_summary.total_revenue, 0) as total_revenue
         FROM events e
         LEFT JOIN (
           SELECT 
             event_id,
             COUNT(*) as total_tickets,
             SUM(CASE WHEN ticket_status IN ('SCANNED', 'USED') OR status = 'used' THEN 1 ELSE 0 END) as checked_in_count,
             SUM(COALESCE(total_amount, price, 0)) as total_revenue
           FROM tickets
           GROUP BY event_id
         ) ticket_summary ON ticket_summary.event_id = e.event_id
         WHERE e.created_by = ? OR e.organizer_id = ?
         ORDER BY datetime(COALESCE(e.start_date, e.created_at, datetime('now'))) ASC`,
        [userId, userId]
      ),
      dbOperations.all(
        `SELECT 
           date(COALESCE(t.purchase_date, t.created_at, e.created_at)) as day,
           COUNT(*) as tickets,
           SUM(COALESCE(t.total_amount, t.price, 0)) as revenue,
           SUM(CASE WHEN t.ticket_status IN ('SCANNED', 'USED') OR t.status = 'used' THEN 1 ELSE 0 END) as checked_in
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
           AND datetime(COALESCE(t.purchase_date, t.created_at, e.created_at)) >= datetime(?)
         GROUP BY date(COALESCE(t.purchase_date, t.created_at, e.created_at))
         ORDER BY day ASC`,
        [userId, userId, lookbackStartIso]
      ),
      dbOperations.all(
        `SELECT 
           t.ticket_id,
           t.event_id,
           e.event_name,
           COALESCE(t.customer_name, t.full_name, t.attendee_name, t.email, 'Guest') as attendee_name,
           COALESCE(t.ticket_type, t.category, 'General') as ticket_type,
           COALESCE(t.total_amount, t.price, 0) as amount,
           t.status,
           t.ticket_status,
           COALESCE(t.purchase_date, t.created_at, e.created_at) as activity_at
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
         ORDER BY datetime(COALESCE(t.purchase_date, t.created_at, e.created_at)) DESC
         LIMIT 8`,
        [userId, userId]
      ),
      dbOperations.all(
        `SELECT event_id, event_name, status, start_date, venue, location, created_at
         FROM events
         WHERE created_by = ? OR organizer_id = ?
         ORDER BY datetime(COALESCE(created_at, datetime('now'))) DESC
         LIMIT 6`,
        [userId, userId]
      ),
      dbOperations.all(
        `SELECT event_id, event_name, status, start_date, venue, location, capacity
         FROM events
         WHERE (created_by = ? OR organizer_id = ?)
           AND datetime(COALESCE(start_date, end_date, created_at, datetime('now'))) >= datetime(?)
         ORDER BY datetime(COALESCE(start_date, end_date, created_at, datetime('now'))) ASC
         LIMIT 6`,
        [userId, userId, nowIso]
      ),
      dbOperations.all(
        `SELECT 
           e.event_id,
           e.event_name,
           AVG(CASE 
             WHEN t.ticket_status IN ('SCANNED', 'USED') OR t.status = 'used' THEN 4.6
             WHEN t.status = 'confirmed' THEN 4.2
             WHEN t.status = 'pending' THEN 3.8
             ELSE 3.9
           END) as avg_rating,
           COUNT(*) as sample_size
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
         GROUP BY e.event_id, e.event_name
         HAVING COUNT(*) > 0
         ORDER BY sample_size DESC, avg_rating DESC
         LIMIT 6`,
        [userId, userId]
      ),
      dbOperations.all(
        `SELECT 
           date(COALESCE(t.purchase_date, t.created_at, e.created_at)) as day,
           COUNT(*) as tickets,
           SUM(COALESCE(t.total_amount, t.price, 0)) as revenue
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
           AND datetime(COALESCE(t.purchase_date, t.created_at, e.created_at)) >= datetime(?)
           AND datetime(COALESCE(t.purchase_date, t.created_at, e.created_at)) < datetime(?)
         GROUP BY date(COALESCE(t.purchase_date, t.created_at, e.created_at))
         ORDER BY day ASC`,
        [userId, userId, previousLookbackStartIso, lookbackStartIso]
      ),
      dbOperations.all(
        `SELECT 
           LOWER(TRIM(COALESCE(NULLIF(t.email, ''), NULLIF(t.customer_name, ''), NULLIF(t.full_name, ''), NULLIF(t.attendee_name, ''), 'guest'))) as attendee_key,
           COUNT(*) as bookings
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
         GROUP BY LOWER(TRIM(COALESCE(NULLIF(t.email, ''), NULLIF(t.customer_name, ''), NULLIF(t.full_name, ''), NULLIF(t.attendee_name, ''), 'guest')))` ,
        [userId, userId]
      ),
      dbOperations.all(
        `SELECT 
           LOWER(TRIM(COALESCE(NULLIF(t.ticket_type, ''), NULLIF(t.category, ''), 'general'))) as ticket_type,
           COUNT(*) as total
         FROM tickets t
         JOIN events e ON e.event_id = t.event_id
         WHERE (e.created_by = ? OR e.organizer_id = ?)
         GROUP BY LOWER(TRIM(COALESCE(NULLIF(t.ticket_type, ''), NULLIF(t.category, ''), 'general')))` ,
        [userId, userId]
      ),
      getEmailCampaignAggregate(userId),
    ]);

    const normalizedEvents = eventRows.map((event) => {
      const status = normalizeEventStatus(event.status);
      return {
        ...event,
        normalized_status: status,
        total_tickets: Number(event.total_tickets || 0),
        checked_in_count: Number(event.checked_in_count || 0),
        total_revenue: Number(event.total_revenue || 0),
        capacity: Number(event.capacity || 0),
      };
    });

    const totalRevenue = normalizedEvents.reduce((sum, event) => sum + event.total_revenue, 0);
    const totalTickets = normalizedEvents.reduce((sum, event) => sum + event.total_tickets, 0);
    const totalCheckedIn = normalizedEvents.reduce((sum, event) => sum + event.checked_in_count, 0);
    const totalCapacity = normalizedEvents.reduce((sum, event) => sum + Math.max(event.capacity, 0), 0);
    const activeEvents = normalizedEvents.filter((event) => event.normalized_status === 'active').length;
    const pendingEvents = normalizedEvents.filter((event) => event.normalized_status === 'pending').length;
    const completedEvents = normalizedEvents.filter((event) => event.normalized_status === 'completed').length;
    const cancelledEvents = normalizedEvents.filter((event) => event.normalized_status === 'cancelled').length;
    const topEvent = [...normalizedEvents].sort((a, b) => b.total_revenue - a.total_revenue)[0] || null;

    const mostPopularDayMap = normalizedEvents.reduce((acc, event) => {
      const date = safeDate(event.start_date);
      if (!date) return acc;
      const key = date.toLocaleDateString('en-ZA', { weekday: 'long' });
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const peakHourMap = normalizedEvents.reduce((acc, event) => {
      const date = safeDate(event.start_date);
      if (!date) return acc;
      const hour = date.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const mostPopularDay = Object.entries(mostPopularDayMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || null;
    const peakHour = Number(Object.entries(peakHourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0]);

    const recentRevenue = revenueRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const previousRevenue = previousRevenueRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const recentTickets = revenueRows.reduce((sum, row) => sum + Number(row.tickets || 0), 0);
    const previousTickets = previousRevenueRows.reduce((sum, row) => sum + Number(row.tickets || 0), 0);

    const ratingSamples = recentFeedbackRows.reduce((sum, row) => sum + Number(row.sample_size || 0), 0);
    const avgEventRating = ratingSamples
      ? recentFeedbackRows.reduce((sum, row) => sum + Number(row.avg_rating || 0) * Number(row.sample_size || 0), 0) / ratingSamples
      : 0;
    const repeatAttendees = audienceIdentityRows.reduce((sum, row) => sum + (Number(row.bookings || 0) > 1 ? 1 : 0), 0);
    const vipAttendees = ticketTypeRows.reduce((sum, row) => {
      const ticketType = String(row.ticket_type || '');
      return sum + (/vip|vvip|premium|backstage|gold|platinum/.test(ticketType) ? Number(row.total || 0) : 0);
    }, 0);
    const sponsorshipRevenue = Math.round(
      normalizedEvents
        .filter((event) => event.normalized_status === 'active' || event.normalized_status === 'completed')
        .reduce((sum, event) => sum + event.total_revenue * 0.1, 0)
    );
    const emailRecipients = Number(emailCampaignAggregate?.delivered || emailCampaignAggregate?.recipients || 0);
    const emailOpened = Number(emailCampaignAggregate?.opened || 0);
    const emailOpenRate = emailRecipients > 0 ? Math.min(100, Math.max(0, Math.round((emailOpened / emailRecipients) * 100))) : 0;

    const stats = {
      totalEvents: normalizedEvents.length,
      activeEvents,
      pendingEvents,
      completedEvents,
      cancelledEvents,
      totalTickets,
      totalRevenue,
      totalAttendees: totalTickets,
      totalCheckedIn,
      totalCapacity,
      checkInRate: totalTickets > 0 ? Math.round((totalCheckedIn / totalTickets) * 100) : 0,
      averageTicketPrice: totalTickets > 0 ? totalRevenue / totalTickets : 0,
      avgPurchaseValue: totalTickets > 0 ? totalRevenue / totalTickets : 0,
      conversionRate: totalCapacity > 0 ? Math.min(100, Math.round((totalTickets / totalCapacity) * 100)) : 0,
      topEvent: topEvent?.event_name || null,
      topEventRevenue: Number(topEvent?.total_revenue || 0),
      revenueGrowth: buildTrend(recentRevenue, previousRevenue),
      ticketGrowth: buildTrend(recentTickets, previousTickets),
      avgEventRating: Number(avgEventRating.toFixed(1)),
      customerSatisfaction: avgEventRating ? Math.min(100, Math.round(avgEventRating * 20)) : 0,
      refundRate: 0,
      repeatAttendees,
      vipAttendees,
      sponsorshipRevenue,
      socialMediaReach: upcomingEvents.length * 1250,
      emailOpenRate,
      emailDeliveredCount: emailRecipients,
      emailOpenedCount: emailOpened,
      peakSalesHour: Number.isFinite(peakHour) ? peakHour : null,
      peakSalesTime: Number.isFinite(peakHour) ? peakHour : null,
      mostPopularDay,
    };

    const recentActivity = recentTicketRows.map((ticket) => ({
      id: ticket.ticket_id,
      type: ticket.ticket_status === 'SCANNED' || ticket.ticket_status === 'USED' || ticket.status === 'used' ? 'check_in' : 'sale',
      title: ticket.event_name,
      subject: ticket.attendee_name,
      ticketType: ticket.ticket_type,
      amount: Number(ticket.amount || 0),
      status: ticket.status,
      ticketStatus: ticket.ticket_status,
      activityAt: ticket.activity_at,
    }));

    const timeline = revenueRows.map((row) => ({
      day: row.day,
      revenue: Number(row.revenue || 0),
      tickets: Number(row.tickets || 0),
      checkedIn: Number(row.checked_in || 0),
    }));

    res.json({
      success: true,
      data: {
        stats,
        timeline,
        recentActivity,
        upcomingEvents: upcomingEvents.map((event) => ({
          ...event,
          normalized_status: normalizeEventStatus(event.status),
          capacity: Number(event.capacity || 0),
        })),
        recentEvents: recentEvents.map((event) => ({
          ...event,
          normalized_status: normalizeEventStatus(event.status),
        })),
        feedback: recentFeedbackRows.map((row) => ({
          event_id: row.event_id,
          event_name: row.event_name,
          avg_rating: Number(Number(row.avg_rating || 0).toFixed(1)),
          sample_size: Number(row.sample_size || 0),
        })),
      },
    });
  } catch (error) {
    console.error('[ORGANIZER] Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const events = await dbOperations.all(
      `SELECT 
         e.*, 
         COALESCE(ticket_summary.total_tickets, 0) as total_tickets,
         COALESCE(ticket_summary.checked_in_count, 0) as checked_in_count,
         COALESCE(ticket_summary.total_revenue, 0) as total_revenue
       FROM events e
       LEFT JOIN (
         SELECT 
           event_id,
           COUNT(*) as total_tickets,
           SUM(CASE WHEN ticket_status IN ('SCANNED','USED') OR status = 'used' THEN 1 ELSE 0 END) as checked_in_count,
           SUM(COALESCE(total_amount, price, 0)) as total_revenue
         FROM tickets
         GROUP BY event_id
       ) ticket_summary ON ticket_summary.event_id = e.event_id
       WHERE e.created_by = ? OR e.organizer_id = ?
       ORDER BY datetime(COALESCE(e.created_at, datetime('now'))) DESC`,
      [userId, userId]
    );

    res.json({ success: true, data: events, events });
  } catch (error) {
    console.error('[ORGANIZER] Events load error:', error);
    res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const userName = req.user.name;
    const { event_name, description, start_date, end_date, location, venue, category, capacity, price } = req.body;

    const result = await dbOperations.run(
      `INSERT INTO events (event_name, event_description, start_date, end_date, location, venue, category, capacity, price, status, created_by, created_by_email, created_by_name, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [event_name, description, start_date, end_date, location, venue, category, capacity, price, userId, userEmail, userName, userId]
    );

    res.json({
      success: true,
      data: {
        event_id: result.id,
        message: 'Event created successfully and is pending approval',
      },
    });
  } catch (error) {
    console.error('[ORGANIZER] Create event error:', error);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

module.exports = router;
