/**
 * Owner — Incentive Rules Routes
 * backend/src/routes/owner/incentive.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

router.get('/rules', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT * FROM public.owner_incentive_rules WHERE owner_id = $1`, [ownerId]
    );
    res.json(result.rows[0] || { is_enabled: false, rules: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rules', async (req, res) => {
  try {
    const { ownerId, isEnabled, rules } = req.body;
    await pool.query(
      `INSERT INTO public.owner_incentive_rules (owner_id, is_enabled, rules)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner_id) DO UPDATE
       SET is_enabled = $2, rules = $3, updated_at = NOW()`,
      [ownerId, isEnabled, JSON.stringify(rules)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/config', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT * FROM public.owner_incentive_config WHERE owner_id = $1`, [ownerId]
    );
    res.json(result.rows[0] || {
      is_enabled: false, min_active_hours: 12,
      incentive_type: 'FULL_WAIVER', incentive_value: 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/config', async (req, res) => {
  try {
    const { ownerId, isEnabled, minActiveHours, incentiveType, incentiveValue } = req.body;
    await pool.query(
      `INSERT INTO public.owner_incentive_config
         (owner_id, is_enabled, min_active_hours, incentive_type, incentive_value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (owner_id) DO UPDATE SET
         is_enabled = $2, min_active_hours = $3,
         incentive_type = $4, incentive_value = $5, updated_at = NOW()`,
      [ownerId, isEnabled, minActiveHours, incentiveType, incentiveValue || 0]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;