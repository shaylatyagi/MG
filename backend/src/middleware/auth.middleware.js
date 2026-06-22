/**
 * JWT Authentication Middleware — MobilityGrid
 * Apply to ALL owner and driver routes.
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');
const pool = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // CRITICAL: Normalize data before assigning to req.user
    req.user = {
      id: parseInt(decoded.id, 10),
      owner_code: decoded.owner_code || null,
      role: decoded.role || 'OWNER'
    };

    if (isNaN(req.user.id)) {
      console.error("DEBUG: Token decoded but ID is missing/invalid:", decoded);
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    // SECURITY: Validate session_token for DRIVER and OWNER roles.
    // When a new login happens, DB gets a new session_token. Any old JWT
    // still passes jwt.verify() but must be rejected here to prevent
    // stale sessions from accessing another user's data.
    if (['DRIVER', 'OWNER'].includes(decoded.role) && decoded.session_token) {
      const table = decoded.role === 'DRIVER' ? 'drivers' : 'owners';
      const dbRes = await pool.query(
        `SELECT session_token FROM public.${table} WHERE id = $1`,
        [req.user.id]
      );
      const dbToken = dbRes.rows[0]?.session_token;
      if (!dbToken || dbToken !== decoded.session_token) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.',
          code: 'SESSION_INVALIDATED'
        });
      }
    }

    next();
  } catch (err) {
    console.error("DEBUG: JWT Auth Error:", err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Verify admin — accepts JWT (role=admin) OR legacy x-admin-key header
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (_) {}
  }
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  const expected = process.env.ADMIN_SECRET_KEY;
  if (key && key === expected) {
    req.user = { id: 'admin', role: 'admin' };
    return next();
  }
  return next(new ApiError(403, 'Admin access denied', 'FORBIDDEN'));
};

// Role guard — use AFTER verifyToken
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return next(new ApiError(403, 'Insufficient permissions', 'FORBIDDEN'));
  next();
};

// Generate a signed JWT — includes full payload (id, role, owner_id, phone, permissions, session_token)
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

// Permission guard for owner/manager shared routes — use AFTER verifyToken
// OWNER: always allowed. MANAGER: must have perm === true in JWT permissions object.
const requirePermission = (perm) => (req, res, next) => {
  const { role, permissions } = req.user || {};
  if (role === 'OWNER' || role === 'admin') return next();
  if (role === 'MANAGER') {
    const perms = typeof permissions === 'string'
      ? JSON.parse(permissions)
      : (permissions || {});
    if (perms[perm]) return next();
    return next(new ApiError(403, `Permission denied: ${perm}`, 'FORBIDDEN'));
  }
  return next(new ApiError(403, 'Access denied', 'FORBIDDEN'));
};

module.exports = { verifyToken, verifyAdmin, requireRole, generateToken, requirePermission };
