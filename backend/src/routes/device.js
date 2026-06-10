// backend/src/routes/device.js — COM-02
// POST   /api/device/token  — register FCM push token for authenticated user
// DELETE /api/device/token  — remove token on logout / permission revoke
'use strict';

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── POST /api/device/token ────────────────────────────────────────────────────
router.post('/token', async (req, res) => {
  const { fcm_token, platform = 'web' } = req.body;
  if (!fcm_token?.trim())
    return res.status(400).json({ success: false, message: 'fcm_token required' });

  const userId   = req.user.id;
  const userRole = req.user.role;        // 'driver' | 'owner' | 'manager'

  try {
    await pool.query(
      `INSERT INTO public.device_tokens (user_id, user_role, fcm_token, platform, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, user_role, fcm_token)
       DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()`,
      [userId, userRole, fcm_token.trim(), platform]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('device/token POST:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/device/token ──────────────────────────────────────────────────
router.delete('/token', async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token?.trim())
    return res.status(400).json({ success: false, message: 'fcm_token required' });

  try {
    await pool.query(
      `DELETE FROM public.device_tokens
        WHERE user_id = $1 AND user_role = $2 AND fcm_token = $3`,
      [req.user.id, req.user.role, fcm_token.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
