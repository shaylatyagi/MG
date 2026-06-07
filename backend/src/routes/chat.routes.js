const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/send', async (req, res) => {
  try {
    const { driverPhone, message, senderType, ownerId } = req.body;
    const driver = await pool.query(
      'SELECT id, full_name FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    const { id: driverId, full_name } = driver.rows[0];

    await pool.query(
      `INSERT INTO public.chat_messages (driver_id, owner_id, sender_type, message)
       VALUES ($1, $2, $3, $4)`,
      [driverId, ownerId || 1, senderType || 'DRIVER', message]
    );

    if (senderType === 'DRIVER') {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'OWNER', $2, $3, NOW())`,
        [driverId, `💬 ${full_name}`, message.substring(0, 80)]
      ).catch(() => {});
    } else {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'DRIVER', '💬 Owner Message', $2, NOW())`,
        [driverId, `Owner: "${message.substring(0, 50)}"`]
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/messages', async (req, res) => {
  try {
    const { driverPhone, ownerId } = req.query;
    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.json([]);
    const driverId = driver.rows[0].id;

    const messages = await pool.query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM public.chat_messages WHERE driver_id = $1
       ORDER BY created_at ASC LIMIT 100`, [driverId]
    );
    await pool.query(
      `UPDATE public.chat_messages SET is_read = TRUE WHERE driver_id = $1 AND sender_type != $2`,
      [driverId, ownerId ? 'OWNER' : 'DRIVER']
    ).catch(() => {});

    res.json(messages.rows);
  } catch(err) { res.json([]); }
});

router.get('/unread', async (req, res) => {
  try {
    const { driverPhone, viewerType } = req.query;
    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.json({ count: 0 });
    const result = await pool.query(
      `SELECT COUNT(*) FROM public.chat_messages
       WHERE driver_id = $1 AND is_read = FALSE AND sender_type != $2`,
      [driver.rows[0].id, viewerType || 'DRIVER']
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch(err) { res.json({ count: 0 }); }
});

module.exports = router;