/**
 * Centralized Error Handler Middleware
 * Add this as the LAST middleware in index.js
 * Catches all errors thrown from any route
 */

class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Async wrapper — no more try/catch in every route
// Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Central error middleware — register LAST in index.js
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';
  const code       = err.code       || 'INTERNAL_ERROR';

  // Log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, message);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  });
};

// 404 handler — register BEFORE errorMiddleware in index.js
const notFoundMiddleware = (req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND'));
};

module.exports = { ApiError, asyncHandler, errorMiddleware, notFoundMiddleware };