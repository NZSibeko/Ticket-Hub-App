const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');

async function safeGet(query, fallbackQuery = null) {
  try {
    return await dbOperations.get(query);
  } catch (error) {
    if (!fallbackQuery) throw error;
    return await dbOperations.get(fallbackQuery);
  }
}

async function safeAll(query, fallbackQuery = null) {
  try {
    return await dbOperations.all(query);
  } catch (error) {
    if (!fallbackQuery) throw error;
    return await dbOperations.all(fallbackQuery);
  }
}

router.get('/summary', async (req, res) => {
  try {
    const conversations = await safeGet(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN platform = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
        SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook,
        SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END) as instagram,
        SUM(CASE WHEN platform = 'twitter' THEN 1 ELSE 0 END) as twitter,
        SUM(CASE WHEN platform = 'tiktok' THEN 1 ELSE 0 END) as tiktok
      FROM support_conversations`,
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN platform = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
        SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook,
        SUM(CASE WHEN platform = 'instagram' THEN 1 ELSE 0 END) as instagram,
        SUM(CASE WHEN platform = 'twitter' THEN 1 ELSE 0 END) as twitter,
        SUM(CASE WHEN platform = 'tiktok' THEN 1 ELSE 0 END) as tiktok
      FROM conversations`
    );

    const tickets = await safeGet(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'urgent' AND status = 'open' THEN 1 ELSE 0 END) as urgent
      FROM support_tickets
    `);

    const recentConversationsRaw = await safeAll(
      `SELECT sc.conversation_id,
              COALESCE(
                NULLIF(sc.customer_name, ''),
                NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
                'Customer'
              ) as customer_name,
              cu.phone as customer_phone,
              sc.platform,
              sc.status,
              sc.last_activity,
              sc.created_at
       FROM support_conversations sc
       LEFT JOIN customers cu ON sc.customer_id = cu.customer_id
       ORDER BY datetime(COALESCE(sc.last_activity, sc.created_at, datetime('now'))) DESC
       LIMIT 8`,
      `SELECT c.conversation_id,
              COALESCE(
                NULLIF(c.customer_name, ''),
                NULLIF(TRIM(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')), ''),
                'Customer'
              ) as customer_name,
              cu.phone as customer_phone,
              c.platform,
              c.status,
              c.last_activity,
              c.created_at
       FROM conversations c
       LEFT JOIN customers cu ON c.customer_id = cu.customer_id
       ORDER BY datetime(COALESCE(c.last_activity, c.created_at, datetime('now'))) DESC
       LIMIT 8`
    );

    const urgentTickets = await safeAll(`
      SELECT ticket_id, subject, priority, status, created_at
      FROM support_tickets
      WHERE priority = 'urgent' AND status = 'open'
      ORDER BY datetime(COALESCE(created_at, datetime('now'))) DESC
      LIMIT 8
    `);

    const recentConversations = (recentConversationsRaw || []).map((item) => ({
      conversation_id: item.conversation_id,
      customer_name: item.customer_name || 'Customer',
      customer_phone: item.customer_phone || 'Not available',
      platform: item.platform || 'support',
      status: item.status || 'active',
      last_activity: item.last_activity || item.created_at || null,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalConversations: conversations?.total || 0,
          activeConversations: conversations?.active || 0,
          resolvedConversations: conversations?.resolved || 0,
          whatsappChats: conversations?.whatsapp || 0,
          facebookChats: conversations?.facebook || 0,
          instagramChats: conversations?.instagram || 0,
          twitterChats: conversations?.twitter || 0,
          tiktokChats: conversations?.tiktok || 0,
          totalTickets: tickets?.total || 0,
          openTickets: tickets?.open || 0,
          resolvedTickets: tickets?.resolved || 0,
          urgentOpenTickets: tickets?.urgent || 0,
        },
        recentConversations,
        urgentTickets: urgentTickets || [],
      }
    });
  } catch (error) {
    console.error('[SUPPORT WORKSPACE] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load support workspace summary' });
  }
});

module.exports = router;
