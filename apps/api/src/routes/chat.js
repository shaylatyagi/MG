// apps/api/src/routes/chat.js — COM-01 in-app chat (owner ↔ driver)
// New schema: chat_messages(sender_id, sender_role, recipient_id, recipient_role, body, read_at)
// API surface kept backward-compatible with CRA frontend expectations
'use strict';

const router = require('express').Router();
const pool   = require('../config/db');

// All chat routes require auth (verifyToken already applied globally in app.js)

// ── POST /api/chat/send ───────────────────────────────────────────────────────
// Body: { driver_id, message }
router.post('/send', async (req, res, next) => {
  try {
    const { driver_id, message } = req.body;
    if (!driver_id || !message?.trim())
      return res.status(400).json({ success: false, message: 'driver_id and message required' });

    const role = req.user.role;
    const driverId = parseInt(driver_id, 10);

    // Drivers can only send from their own account
    if (role === 'driver' && req.user.id !== driverId)
      return res.status(403).json({ success: false, message: 'Drivers can only message from their own account' });

    let senderId, senderRole, recipientId, recipientRole;

    if (role === 'driver') {
      // Driver → owner: look up owner_id from drivers table
      const ownerRow = await pool.query(
        'SELECT owner_id FROM public.drivers WHERE id = $1', [driverId]
      );
      const ownerId = ownerRow.rows[0]?.owner_id;
      if (!ownerId) return res.status(404).json({ success: false, message: 'Driver not found' });
      senderId     = driverId;
      senderRole   = 'driver';
      recipientId  = ownerId;
      recipientRole = 'owner';
    } else {
      // Owner → driver: verify driver belongs to this owner
      const check = await pool.query(
        'SELECT id FROM public.drivers WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [driverId, req.user.id]
      );
      if (!check.rows.length)
        return res.status(403).json({ success: false, message: 'Driver not in your fleet' });
      senderId      = req.user.id;
      senderRole    = 'owner';
      recipientId   = driverId;
      recipientRole = 'driver';
    }

    const result = await pool.query(
      `INSERT INTO public.chat_messages
         (sender_id, sender_role, recipient_id, recipient_role, body, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, sender_role, body AS message, read_at, created_at`,
      [senderId, senderRole, recipientId, recipientRole, message.trim()]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id:          row.id,
        sender_type: row.sender_role.toUpperCase(),
        message:     row.message,
        is_read:     row.read_at !== null,
        created_at:  row.created_at,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/chat/messages?driver_id=&limit=50&before_id= ────────────────────
router.get('/messages', async (req, res, next) => {
  try {
    const { driver_id, limit = 50, before_id } = req.query;
    if (!driver_id)
      return res.status(400).json({ success: false, message: 'driver_id required' });

    const driverId = parseInt(driver_id, 10);

    // Access control
    if (req.user.role === 'driver' && req.user.id !== driverId)
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (req.user.role === 'owner') {
      const check = await pool.query(
        'SELECT id FROM public.drivers WHERE id = $1 AND owner_id = $2', [driverId, req.user.id]
      );
      if (!check.rows.length)
        return res.status(403).json({ success: false, message: 'Driver not in your fleet' });
    }

    // Fetch all messages in this thread (either as sender or recipient involving this driver)
    const conditions = [
      `(sender_id = $1 AND sender_role = 'driver') OR (recipient_id = $1 AND recipient_role = 'driver')`
    ];
    const params = [driverId];
    if (before_id) { params.push(before_id); conditions.push(`id < $${params.length}`); }

    const msgs = await pool.query(
      `SELECT id, sender_role, body AS message, read_at, created_at
       FROM public.chat_messages
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${parseInt(limit) || 50}`,
      params
    );

    // Mark as read (messages sent TO the current user)
    const myRole = req.user.role;
    await pool.query(
      `UPDATE public.chat_messages SET read_at = NOW()
       WHERE recipient_id = $1 AND recipient_role = $2
         AND (sender_id = $3 OR ($3 = 0))
         AND read_at IS NULL`,
      [req.user.id, myRole, myRole === 'driver' ? 0 : driverId]
    ).catch(() => {});

    const data = msgs.rows.reverse().map(r => ({
      id:          r.id,
      sender_type: r.sender_role.toUpperCase(),
      message:     r.message,
      is_read:     r.read_at !== null,
      created_at:  r.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── GET /api/chat/threads — owner: list all driver threads with last message ──
router.get('/threads', async (req, res, next) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'manager')
      return res.status(403).json({ success: false, message: 'Owners/managers only' });

    const result = await pool.query(
      `SELECT
         d.id                AS driver_id,
         d.name              AS driver_name,
         d.phone_number,
         last_msg.body       AS last_message,
         last_msg.created_at AS last_message_at,
         last_msg.sender_role AS last_sender,
         COUNT(CASE WHEN cm.read_at IS NULL AND cm.sender_role = 'driver' THEN 1 END)::int AS unread_count
       FROM public.drivers d
       LEFT JOIN LATERAL (
         SELECT body, created_at, sender_role
         FROM public.chat_messages
         WHERE (sender_id = d.id AND sender_role = 'driver')
            OR (recipient_id = d.id AND recipient_role = 'driver')
         ORDER BY created_at DESC LIMIT 1
       ) last_msg ON TRUE
       LEFT JOIN public.chat_messages cm ON (
         (cm.sender_id = d.id AND cm.sender_role = 'driver') OR
         (cm.recipient_id = d.id AND cm.recipient_role = 'driver')
       )
       WHERE d.owner_id = $1 AND d.deleted_at IS NULL
       GROUP BY d.id, d.name, d.phone_number,
                last_msg.body, last_msg.created_at, last_msg.sender_role
       ORDER BY last_msg.created_at DESC NULLS LAST`,
      [req.user.id]
    );

    const data = result.rows.map(r => ({
      ...r,
      last_sender: r.last_sender ? r.last_sender.toUpperCase() : null,
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── GET /api/chat/unread-count — driver: unread messages from owner ──────────
router.get('/unread-count', async (req, res, next) => {
  try {
    if (req.user.role !== 'driver')
      return res.status(403).json({ success: false, message: 'Drivers only' });

    const r = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.chat_messages
       WHERE recipient_id = $1 AND recipient_role = 'driver' AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ success: true, count: r.rows[0]?.count || 0 });
  } catch (err) { next(err); }
});

module.exports = router;
