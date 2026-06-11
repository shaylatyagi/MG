// apps/api/src/routes/payment.js — per DevSpec §13.6
// Thin HTTP contract: requireRole → validate → controller
'use strict';

const router                  = require('express').Router();
const { requireRole }         = require('../middleware/roleCheck');
const { validate, payment: v } = require('../validators');
const ctrl                    = require('../controllers/payment.controller');

// POST /api/payment/initiate — driver only
router.post('/initiate',       requireRole('driver'), validate(v.initiatePayment), ctrl.initiatePayment);

// POST /api/payment/webhook — PUBLIC, HMAC-verified inside controller
router.post('/webhook',                                                             ctrl.webhook);

// GET /api/payment/status/:orderId
router.get('/status/:orderId', requireRole('driver', 'owner', 'admin'),            ctrl.getStatus);

// GET /api/payment/history
router.get('/history',         requireRole('driver', 'owner', 'admin'),            ctrl.getHistory);

// GET /api/payment/verify-by-reference/:orderId — manual re-sync
router.get('/verify-by-reference/:orderId', requireRole('driver', 'owner', 'admin'), ctrl.verifyByReference);

module.exports = router;


// ── Manager aliases (CRA calls /api/payment/owner/managers) ──────────────────
const managerCtrl = require('../controllers/manager.controller');
router.get('/owner/managers',        requireRole('owner', 'admin'), managerCtrl.list);
router.post('/owner/managers/add',   requireRole('owner', 'admin'), managerCtrl.create);
router.delete('/owner/managers/:id', requireRole('owner', 'admin'), managerCtrl.deactivate);
