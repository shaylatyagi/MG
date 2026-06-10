// apps/api/src/validators/kyc.validators.js
'use strict';
const { body } = require('express-validator');

const VALID_DOC_TYPES = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'DRIVING_LICENCE', 'BANK_ACCOUNT'];

exports.uploadDocument = [
  body('document_type')
    .isIn(VALID_DOC_TYPES)
    .withMessage(`document_type must be one of: ${VALID_DOC_TYPES.join(', ')}`),
];

exports.rejectDocument = [
  body('reason').notEmpty().withMessage('reason is required'),
];
