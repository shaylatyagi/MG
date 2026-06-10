// apps/api/src/validators/admin.validators.js
'use strict';
const { body } = require('express-validator');

exports.createCompany = [
  body('company_name').trim().notEmpty().withMessage('company_name is required'),
];

exports.updateCompanyStatus = [
  body('status')
    .isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE'])
    .withMessage('status must be ACTIVE, SUSPENDED, or INACTIVE'),
];

exports.rejectKyc = [
  body('reason').notEmpty().withMessage('rejection reason is required'),
];
