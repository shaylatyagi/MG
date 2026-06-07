// apps/api/src/middleware/validate.js
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const fields = errors.array().map(e => ({ field: e.path, message: e.msg }));
  next(new AppError('Request validation failed', 400, 'VALIDATION_ERROR'));
};

module.exports = { handleValidationErrors };
