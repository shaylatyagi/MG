// apps/api/src/routes/driver.js — per DevSpec §13.3
// Thin HTTP contract: requireRole → validate → controller
'use strict';

const router                = require('express').Router();
const { requireRole }       = require('../middleware/roleCheck');
const { validate, driver: v } = require('../validators');
const ctrl                  = require('../controllers/driver.controller');

router.get('/profile',          requireRole('driver', 'owner', 'admin'),              ctrl.getProfile);
router.put('/profile',          requireRole('driver'), validate(v.updateProfile),   ctrl.updateProfile);
router.get('/activity/ping',    requireRole('driver'),                               ctrl.activityPing);
router.get('/wallet',           requireRole('driver', 'owner', 'admin'),             ctrl.getWallet);
router.get('/ledger',           requireRole('driver', 'owner', 'admin'),             ctrl.getLedger);
router.post('/sos',             requireRole('driver'), validate(v.createSos),        ctrl.createSos);
router.get('/notifications',    requireRole('driver', 'owner', 'admin'),             ctrl.getNotifications);

module.exports = router;
