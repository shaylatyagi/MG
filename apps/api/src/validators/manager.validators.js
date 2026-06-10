// apps/api/src/validators/manager.validators.js
'use strict';
const { body } = require('express-validator');

exports.create = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
];
