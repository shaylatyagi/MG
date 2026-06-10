// apps/api/src/validators/collection.validators.js
'use strict';
const { body } = require('express-validator');

exports.recordCash = [
  body('driver_id').notEmpty().withMessage('driver_id is required'),
  body('amount')
    .isNumeric().withMessage('amount must be a number')
    .custom(v => Number(v) > 0).withMessage('amount must be greater than 0'),
];
