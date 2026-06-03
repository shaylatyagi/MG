/**
 * JWT Authentication Middleware
 * Apply to ALL owner and driver routes
 */

const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');

// Verify JWT token — blocks request if invalid
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    }
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
};

// Verify admin key — for admin panel routes
const verifyAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  const expected = process.env.ADMIN_SECRET_KEY || 'mg_admin_2026_secret';
  if (!key || key !== expected) {
    return next(new ApiError(403, 'Admin access denied', 'FORBIDDEN'));
  }
  next();
};

// Check user role — use AFTER verifyToken
// Usage: router.get('/path', verifyToken, requireRole('OWNER'), handler)
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Insufficient permissions', 'FORBIDDEN'));
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, requireRole };