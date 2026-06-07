const pool = require('../config/db');

/**
 * ADM-06: Best-effort admin audit logger.
 * Never throws — always .catch(() => {}) so it can't break a request.
 *
 * @param {string} action      - e.g. 'KYC_APPROVED', 'MANAGER_CREATED'
 * @param {string} entityType  - 'driver' | 'manager' | 'company'
 * @param {string|number} entityId
 * @param {string} performedBy - admin phone or 'system'
 * @param {object} details     - any extra context (stored as JSONB)
 */
const logAudit = (action, entityType, entityId, performedBy, details) => {
  pool.query(
    `INSERT INTO public.admin_audit_log (action, entity_type, entity_id, performed_by, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [action, entityType, String(entityId || ''), performedBy || 'admin', JSON.stringify(details || {})]
  ).catch(() => {}); // silent fail if table not yet migrated
};

module.exports = { logAudit };
