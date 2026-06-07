/**
 * Owner — Manager Role Routes (Premium Feature)
 * backend/src/routes/owner/manager.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { isPremium } = require('../../utils/helpers');

router.get('/', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!await isPremium(ownerId))
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
    const r = await pool.query(
      `SELECT * FROM public.managers WHERE owner_id=$1 AND status='ACTIVE' ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, managers: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/add', async (req, res) => {
  try {
    const { ownerId, fullName, mobileNumber, permissions } = req.body;
    if (!await isPremium(ownerId))
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });

    const exists = await pool.query(
      `SELECT id FROM public.managers WHERE mobile_number=$1 AND status='ACTIVE'`, [mobileNumber]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: 'This number is already a manager' });

    const code = 'MGR' + Math.random().toString(36).substr(2,6).toUpperCase();
    const r = await pool.query(
      `INSERT INTO public.managers (owner_id, full_name, mobile_number, manager_code, permissions)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ownerId, fullName, mobileNumber, code, JSON.stringify(permissions || {})]
    );
    res.json({ success: true, manager: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:managerId/permissions', async (req, res) => {
  try {
    const { ownerId, permissions } = req.body;
    if (!await isPremium(ownerId))
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
    await pool.query(
      `UPDATE public.managers SET permissions=$1 WHERE id=$2 AND owner_id=$3`,
      [JSON.stringify(permissions), req.params.managerId, ownerId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:managerId', async (req, res) => {
  try {
    const { ownerId } = req.query;
    await pool.query(
      `UPDATE public.managers SET status='REMOVED' WHERE id=$1 AND owner_id=$2`,
      [req.params.managerId, ownerId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    const r = await pool.query(
      `SELECT m.*, o.full_name as owner_name, o.owner_code, o.mobile_number as owner_phone
       FROM public.managers m JOIN public.owners o ON o.id = m.owner_id
       WHERE m.mobile_number=$1 AND m.status='ACTIVE'`, [phone]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not a manager' });
    res.json({ success: true, manager: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upgrade', async (req, res) => {
  try {
    const { ownerId, months = 1 } = req.body;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    await pool.query(
      `UPDATE public.owners SET plan='PREMIUM', plan_expires_at=$1 WHERE id=$2`,
      [expires, ownerId]
    );
    res.json({ success: true, expires_at: expires });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/plan', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const r = await pool.query(
      `SELECT plan, plan_expires_at FROM public.owners WHERE id=$1`, [ownerId]
    );
    const o = r.rows[0];
    const premium = o?.plan === 'PREMIUM' && (!o.plan_expires_at || new Date(o.plan_expires_at) > new Date());
    res.json({ plan: o?.plan || 'FREE', is_premium: premium, expires_at: o?.plan_expires_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;