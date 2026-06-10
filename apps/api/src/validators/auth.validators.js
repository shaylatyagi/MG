// apps/api/src/validators/auth.validators.js
'use strict';
const { body } = require('express-validator');

exports.sendOtp = [
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
];

exports.verifyOtp = [
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('6-digit OTP required'),
];

exports.adminSendOtp = [
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
  body('admin_secret')
    .notEmpty()
    .withMessage('admin_secret is required'),
];

exports.adminVerifyOtp = [
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('6-digit OTP required'),
  body('admin_secret')
    .notEmpty()
    .withMessage('admin_secret is required'),
];
