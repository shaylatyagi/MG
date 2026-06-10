// apps/api/src/validators/vehicle.validators.js
'use strict';
const { body } = require('express-validator');

exports.create = [
  body('registration_number').trim().notEmpty().withMessage('registration_number is required'),
];

exports.updateStatus = [
  body('status')
    .isIn(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'])
    .withMessage('status must be AVAILABLE, ASSIGNED, MAINTENANCE, or INACTIVE'),
];
