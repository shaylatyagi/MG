// apps/api/src/routes/device.js — COM-02
// POST   /api/device/token  — register FCM push token
// DELETE /api/device/token  — remove on logout
'use strict';

const router           = require('express').Router();
const pool             = require('../config/db');
const { AppError }     = require('../utils/errors');

// All device routes require a valid JWT (set by global verifyToken in app.js)

// ── POST /api/device/token ────────────────────────────────────────────────────
router.post('/token', async (req, res, next) => {
  try {
    const { fcm_token, platform = 'web' } = req.body;
    if (!fcm_token?.trim())
      throw new AppError('fcm_token required', 400, 'VALIDATION_ERROR');

    const userId   = req.user.id;
    const userRole = req.user.role;

    await pool.query(
      `INSERT INTO public.device_tokens (user_id, user_role, fcm_token, platform, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, user_role, fcm_token)
       DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()`,
      [userId, userRole, fcm_token.trim(), platform]
    );

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── DELETE /api/device/token ──────────────────────────────────────────────────
router.delete('/token', async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token?.trim())
      throw new AppError('fcm_token required', 400, 'VALIDATION_ERROR');

    await pool.query(
      `DELETE FROM public.device_tokens
        WHERE user_id = $1 AND user_role = $2 AND fcm_token = $3`,
      [req.user.id, req.user.role, fcm_token.trim()]
    );

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
