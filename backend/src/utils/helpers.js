/**
 * Shared Helper Utilities
 * backend/src/utils/helpers.js
 */

const pool = require('../config/db');

// ─── DATE PARSER ──────────────────────────────────────────────────────────────
const parseDate = (d) => {
  if (!d || d.trim() === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(d.trim())) {
    const [dd, mm, yyyy] = d.trim().split('-');
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d.trim())) {
    const [dd, mm, yyyy] = d.trim().split('/');
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  return null;
};

// ─── ASSIGNMENT HISTORY ───────────────────────────────────────────────────────
const logAssignment = async (driverId, vehicleId, ownerId, dailyRent, rentType) => {
  try {
    await pool.query(
      `UPDATE public.driver_vehicle_history 
       SET unassigned_at = NOW()
       WHERE driver_id = $1 AND unassigned_at IS NULL`,
      [driverId]
    );
    await pool.query(
      `INSERT INTO public.driver_vehicle_history 
       (driver_id, vehicle_id, owner_id, daily_rent, rent_type, reason)
       VALUES ($1, $2, $3, $4, $5, 'ASSIGNED')`,
      [driverId, vehicleId, ownerId || null, dailyRent || 0, rentType || 'DAILY']
    );
  } catch (e) { console.error('logAssignment error:', e.message); }
};

const logUnassignment = async (vehicleId) => {
  try {
    await pool.query(
      `UPDATE public.driver_vehicle_history
       SET unassigned_at = NOW(), reason = 'UNASSIGNED'
       WHERE vehicle_id = $1 AND unassigned_at IS NULL`,
      [vehicleId]
    );
  } catch (e) { console.error('logUnassignment error:', e.message); }
};

// ─── PREMIUM CHECK ────────────────────────────────────────────────────────────
const isPremium = async (ownerId) => {
  const r = await pool.query(
    `SELECT plan, plan_expires_at FROM public.owners WHERE id=$1`, [ownerId]
  );
  const o = r.rows[0];
  if (!o) return false;
  if (o.plan === 'PREMIUM') {
    if (!o.plan_expires_at || new Date(o.plan_expires_at) > new Date()) return true;
    await pool.query(`UPDATE public.owners SET plan='FREE' WHERE id=$1`, [ownerId]);
  }
  return false;
};

module.exports = { parseDate, logAssignment, logUnassignment, isPremium };