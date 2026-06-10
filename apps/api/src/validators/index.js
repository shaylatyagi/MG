// apps/api/src/validators/index.js
// Re-exports all validator schemas + the validate() middleware factory.
'use strict';

const { validationResult, body, param, query } = require('express-validator');
const { AppError } = require('../utils/errors');

/**
 * validate(schemas) — run express-validator checks and throw on first error.
 * Use as middleware: router.post('/foo', validate([body('x').notEmpty()]), controller.foo)
 *
 * @param {import('express-validator').ValidationChain[]} schemas
 */
const validate = (schemas) => [
  ...schemas,
  (req, _res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const first = errors.array()[0];
    next(new AppError(`${first.path}: ${first.msg}`, 400, 'VALIDATION_ERROR'));
  },
];

module.exports = {
  validate,

  auth: require('./auth.validators'),
  driver: require('./driver.validators'),
  owner: require('./owner.validators'),
  payment: require('./payment.validators'),
  vehicle: require('./vehicle.validators'),
  assignment: require('./assignment.validators'),
  collection: require('./collection.validators'),
  manager: require('./manager.validators'),
  kyc: require('./kyc.validators'),
  admin: require('./admin.validators'),
};
