/**
 * JWT Authentication Middleware — MobilityGrid
 * Apply to ALL owner and driver routes.
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');

// Verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
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

module.exports = { verifyToken, verifyAdmin, requireRole };
