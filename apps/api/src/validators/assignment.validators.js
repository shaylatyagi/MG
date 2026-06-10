// apps/api/src/validators/assignment.validators.js
'use strict';
const { body } = require('express-validator');

exports.assign = [
  body('driver_id').notEmpty().withMessage('driver_id is required'),
  body('vehicle_id').notEmpty().withMessage('vehicle_id is required'),
];

exports.unassign = [
  body('driver_id').notEmpty().withMessage('driver_id is required'),
  body('vehicle_id').notEmpty().withMessage('vehicle_id is required'),
];
