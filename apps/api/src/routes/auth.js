// apps/api/src/routes/auth.js — per DevSpec §13.1
// Thin HTTP contract: validate → controller
'use strict';

const router = require('express').Router();
const { validate, auth: v } = require('../validators');
const ctrl   = require('../controllers/auth.controller');

router.post('/send-otp',         validate(v.sendOtp),         ctrl.sendOtp);
router.post('/verify-otp',       validate(v.verifyOtp),       ctrl.verifyOtp);
router.post('/logout',                                         ctrl.logout);
router.post('/admin-send-otp',   validate(v.adminSendOtp),    ctrl.adminSendOtp);
router.post('/admin-verify-otp', validate(v.adminVerifyOtp),  ctrl.adminVerifyOtp);

module.exports = router;
