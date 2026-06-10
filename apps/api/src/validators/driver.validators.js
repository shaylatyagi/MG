// apps/api/src/validators/driver.validators.js
'use strict';
const { body } = require('express-validator');

exports.createSos = [
  body('lat').isNumeric().withMessage('lat must be a number'),
  body('lng').isNumeric().withMessage('lng must be a number'),
];
