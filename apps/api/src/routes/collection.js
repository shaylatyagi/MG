// apps/api/src/routes/collection.js — per DevSpec §collection
'use strict';

const router                       = require('express').Router();
const { requireRole, requirePermission } = require('../middleware/roleCheck');
const { validate, collection: v }  = require('../validators');
const ctrl                         = require('../controllers/collection.controller');

router.post('/cash',
  requireRole('owner', 'manager'),
  requirePermission('record_cash'),
  validate(v.recordCash),
  ctrl.recordCash
);

router.get('/summary',    requireRole('owner', 'admin', 'manager'), ctrl.getSummary);
router.get('/by-driver',  requireRole('owner', 'admin', 'manager'), ctrl.getByDriver);

module.exports = router;
