// apps/api/src/routes/vehicle.js — per DevSpec §vehicle
'use strict';

const router                  = require('express').Router();
const { requireRole }         = require('../middleware/roleCheck');
const { validate, vehicle: v } = require('../validators');
const ctrl                    = require('../controllers/vehicle.controller');

router.get('/',             requireRole('owner', 'admin', 'manager'),                ctrl.list);
router.post('/',            requireRole('owner', 'admin'), validate(v.create),        ctrl.create);
router.put('/:id',          requireRole('owner', 'admin'),                            ctrl.update);
router.put('/:id/status',   requireRole('owner', 'admin'), validate(v.updateStatus),  ctrl.updateStatus);
router.get('/:id/history',  requireRole('owner', 'admin', 'manager'),                 ctrl.getHistory);

module.exports = router;
