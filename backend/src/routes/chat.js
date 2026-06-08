// backend/src/routes/chat.js
// Owner ↔ Driver in-app chat — COM-01
// POST /api/chat/send       — send a message
// GET  /api/chat/messages   — get messages for a driver thread
// GET  /api/chat/threads    — owner: list all driver threads
// POST /api/chat/read       — mark messages as read
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── POST /api/chat/send ───────────────────────────────────────────────────────
// Body: { driver_id, message }
// sender_type derived from JWT role
router.post('/send', async (req, res) => {
  const { driver_id, message } = req.body;
  if (!driver_id || !message?.trim())
    return res.status(400).json({ success: false, message: 'driver_id and message required' });

  try {
    const role        = req.user.role;
    const sender_type = role === 'driver' ? 'DRIVER' : 'OWNER';
    const owner_id    = role === 'owner'  ? req.user.id : null;

    // If driver is sending: ensure they are the driver
    if (role === 'driver' && req.user.id !== parseInt(driver_id))
      return res.status(403).json({ success: false, message: 'Drivers can only message from their own account' });

    // Get owner_id for driver-side sends
    let ownerId = owner_id;
    if (role === 'driver') {
      const ownerRow = await pool.query(
        'SELECT owner_id FROM drivers WHERE id = $1', [driver_id]
      );
      ownerId = ownerRow.rows[0]?.owner_id || null;
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (driver_id, owner_id, sender_type, message, is_read, created_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW())
       RETURNING id, driver_id, owner_id, sender_type, message, is_read, created_at`,
      [driver_id, ownerId, sender_type, message.trim()]
    );

    // Create in-app notification for recipient
    const notifUser  = sender_type === 'DRIVER' ? 'OWNER'  : 'DRIVER';
    const notifTitle = sender_type === 'DRIVER' ? '💬 Driver Message' : '💬 Owner Message';
    await pool.query(
      `INSERT INTO notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [driver_id, notifUser, notifTitle, message.trim().substring(0, 100)]
    ).catch(() => {});

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('chat/send:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/chat/messages?driver_id=&limit=50&before_id= ────────────────────
router.get('/messages', async (req, res) => {
  const { driver_id, limit = 50, before_id } = req.query;
  if (!driver_id)
    return res.status(400).json({ success: false, message: 'driver_id required' });

  try {
    // Access control: driver can only see their own thread; owner sees their drivers only
    if (req.user.role === 'driver' && req.user.id !== parseInt(driver_id))
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (req.user.role === 'owner') {
      const check = await pool.query(
        'SELECT id FROM drivers WHERE id = $1 AND owner_id = $2', [driver_id, req.user.id]
      );
      if (!check.rows.length)
        return res.status(403).json({ success: false, message: 'Driver not in your fleet' });
    }

    const conditions = ['driver_id = $1'];
    const params     = [driver_id];
    if (before_id) { params.push(before_id); conditions.push(`id < $${params.length}`); }

    const msgs = await pool.query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM chat_messages
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${parseInt(limit) || 50}`,
      params
    );

    // Mark unread messages as read (for the current user's role)
    const markRole = req.user.role === 'driver' ? 'OWNER' : 'DRIVER';
    await pool.query(
      `UPDATE chat_messages SET is_read = TRUE
       WHERE driver_id = $1 AND sender_type = $2 AND is_read = FALSE`,
      [driver_id, markRole]
    ).catch(() => {});

    res.json({ success: true, data: msgs.rows.reverse() }); // oldest first
  } catch (err) {
    console.error('chat/messages:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/chat/threads — owner: list all driver threads with last message ──
router.get('/threads', async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'manager')
    return res.status(403).json({ success: false, message: 'Owners/managers only' });

  try {
    const result = await pool.query(
      `SELECT
         d.id           AS driver_id,
         d.name         AS driver_name,
         d.phone_number,
         cm.message     AS last_message,
         cm.created_at  AS last_message_at,
         cm.sender_type AS last_sender,
         COUNT(CASE WHEN cm2.is_read = FALSE AND cm2.sender_type = 'DRIVER' THEN 1 END)::int AS unread_count
       FROM drivers d
       LEFT JOIN LATERAL (
         SELECT message, created_at, sender_type
         FROM chat_messages
         WHERE driver_id = d.id
         ORDER BY created_at DESC LIMIT 1
       ) cm ON TRUE
       LEFT JOIN chat_messages cm2 ON cm2.driver_id = d.id
       WHERE d.owner_id = $1 AND d.deleted_at IS NULL
       GROUP BY d.id, d.name, d.phone_number, cm.message, cm.created_at, cm.sender_type
       ORDER BY cm.created_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('chat/threads:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/chat/unread-count — driver: how many unread messages from owner ──
router.get('/unread-count', async (req, res) => {
  if (req.user.role !== 'driver')
    return res.status(403).json({ success: false, message: 'Drivers only' });
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS count FROM chat_messages
       WHERE driver_id = $1 AND sender_type = 'OWNER' AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true, count: r.rows[0]?.count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
