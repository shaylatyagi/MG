// apps/api/src/middleware/roleCheck.js
const { AppError } = require('../utils/errors');

/**
 * requireRole('owner', 'admin') — user must have one of the listed roles
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user)
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  if (!roles.includes(req.user.role))
    return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
  next();
};

/**
 * requirePermission('record_cash') — manager must have specific permission in JWT
 */
const requirePermission = (permission) => (req, res, next) => {
  const perms = req.user?.permissions || [];
  if (!perms.includes(permission))
    return next(new AppError(`Permission '${permission}' required`, 403, 'FORBIDDEN'));
  next();
};

/**
 * requireAdminKey — admin routes need BOTH JWT role=admin AND x-admin-key (§13.8)
 */
const requireAdminKey = (req, res, next) => {
  const key      = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!key || key !== expected)
    return next(new AppError('Admin key required', 403, 'FORBIDDEN'));
  next();
};

module.exports = { requireRole, requirePermission, requireAdminKey };
