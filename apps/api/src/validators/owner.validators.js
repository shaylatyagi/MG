// apps/api/src/validators/owner.validators.js
'use strict';
const { body } = require('express-validator');

exports.createDriver = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required'),
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
];

exports.createVehicle = [
  body('registration_number')
    .trim()
    .notEmpty()
    .withMessage('registration_number is required'),
];

exports.createWalletEntry = [
  body('driver_id').notEmpty().withMessage('driver_id is required'),
  body('amount').isNumeric().withMessage('amount must be a number'),
  body('entry_type').notEmpty().withMessage('entry_type is required'),
];
