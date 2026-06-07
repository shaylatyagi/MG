// apps/api/src/utils/errors.js — per DevSpec §12.3
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, _next) => {
  const status  = err.statusCode || 500;
  const code    = err.code       || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected error occurred';

  console.error(JSON.stringify({
    level: 'error', code, message, path: req.path,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  }));

  res.status(status).json({ success: false, error: { code, message } });
};

module.exports = { AppError, errorHandler };
