// apps/api/src/routes/admin.js — per DevSpec §13.8
// Dual-factor: JWT role=admin + x-admin-key header
'use strict';

const router                   = require('express').Router();
const { requireAdminKey }      = require('../middleware/roleCheck');
const { validate, admin: v }   = require('../validators');
const ctrl                     = require('../controllers/admin.controller');

router.use(requireAdminKey);

router.get('/platform-stats',            ctrl.getPlatformStats);
router.get('/companies',                 ctrl.listCompanies);
router.post('/companies',                validate(v.createCompany),        ctrl.createCompany);
router.patch('/companies/:id/status',    validate(v.updateCompanyStatus),  ctrl.updateCompanyStatus);
router.get('/companies/:id/owners',      ctrl.getCompanyOwners);
router.get('/owners/:id/drivers',        ctrl.getOwnerDrivers);
router.get('/drivers/:id',               ctrl.getDriverDetail);
router.get('/kyc/summary',               ctrl.getKycSummary);
router.get('/kyc/pending',               ctrl.getKycPending);
router.get('/kyc/all',                   ctrl.getAllKyc);
router.patch('/kyc/:id/approve',                                           ctrl.approveKyc);
router.patch('/kyc/:id/reject',          validate(v.rejectKyc),            ctrl.rejectKyc);
router.get('/audit-logs',                ctrl.getAuditLogs);

module.exports = router;
