// apps/api/src/routes/owner.js — per DevSpec §13.2
// Thin HTTP contract: requireRole → validate → controller
'use strict';

const router                = require('express').Router();
const { requireRole, requirePermission } = require('../middleware/roleCheck');
const { validate, owner: v } = require('../validators');
const ctrl                  = require('../controllers/owner.controller');

router.get('/dashboard-stats',         requireRole('owner', 'admin', 'manager'),                       ctrl.getDashboardStats);
router.get('/drivers',                 requireRole('owner', 'admin', 'manager'),                       ctrl.listDrivers);
router.post('/drivers',                requireRole('owner', 'admin'), validate(v.createDriver),         ctrl.createDriver);
router.get('/drivers/:id',             requireRole('owner', 'admin', 'manager'),                       ctrl.getDriver);
router.put('/drivers/:id/deactivate',  requireRole('owner', 'admin'),                                  ctrl.deactivateDriver);
router.get('/vehicles',                requireRole('owner', 'admin', 'manager'),                       ctrl.listVehicles);
router.post('/vehicles',               requireRole('owner', 'admin'), validate(v.createVehicle),        ctrl.createVehicle);
router.get('/collections/trend',       requireRole('owner', 'admin', 'manager'),                       ctrl.getCollectionTrend);
router.post('/wallet-entry',           requireRole('owner', 'admin', 'manager'),
                                       requirePermission('record_cash'),
                                       validate(v.createWalletEntry),                                  ctrl.createWalletEntry);

module.exports = router;
