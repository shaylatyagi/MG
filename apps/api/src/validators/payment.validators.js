// apps/api/src/validators/payment.validators.js
'use strict';
const { body, param } = require('express-validator');

exports.initiatePayment = [
  body('amount')
    .isNumeric()
    .withMessage('amount must be a number')
    .custom(v => Number(v) > 0)
    .withMessage('amount must be greater than 0'),
];

exports.getStatus = [
  param('orderId')
    .notEmpty()
    .withMessage('orderId is required'),
];
