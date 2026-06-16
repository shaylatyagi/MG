/**
 * JWT Authentication Middleware — MobilityGrid
 * Apply to ALL owner and driver routes.
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');
const pool = require('../config/db');

// Verify JWT token (async — also validates single-device session token)
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    // Single-device session check: if JWT carries a session_token, verify it matches DB
    if (decoded.session_token && decoded.id && decoded.role !== 'admin' && decoded.role !== 'MANAGER') {
      const table = decoded.role === 'DRIVER' ? 'drivers' : 'owners';
      const dbRes = await pool.query(
        `SELECT session_token FROM public.${table} WHERE id=$1`,
        [decoded.id]
      );
      const stored = dbRes.rows[0]?.session_token;
      if (!stored || stored !== decoded.session_token) {
        throw new ApiError(401, 'Session expired. Please login again.', 'SESSION_EXPIRED');
      }
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
};

// Verify admin — accepts JWT (role=admin) OR legacy x-admin-key header
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(
        authHeader.split(' ')[1],
        process.env.JWT_SECRET
      );
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
