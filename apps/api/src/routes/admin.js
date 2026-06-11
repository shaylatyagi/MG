// apps/api/src/routes/admin.js — per DevSpec §13.8
// Dual-factor: JWT role=admin + x-admin-key header
'use strict';

const router                   = require('express').Router();
const { requireAdminKey }      = require('../middleware/roleCheck');
const { validate, admin: v }   = require('../validators');
const ctrl                     = require('../controllers/admin.controller');

router.use(requireAdminKey);

// Platform
router.get('/platform-stats',                ctrl.getPlatformStats);

// Companies
router.get('/companies',                     ctrl.listCompanies);
router.post('/companies',                    validate(v.createCompany),       ctrl.createCompany);
router.patch('/companies/:id/status',        validate(v.updateCompanyStatus), ctrl.updateCompanyStatus);
router.get('/companies/:id/owners',          ctrl.getCompanyOwners);

// Owners > Drivers
router.get('/owners/:id/drivers',            ctrl.getOwnerDrivers);

// Drivers
router.post('/drivers',                      ctrl.createDriver);
router.get('/drivers/:id',                   ctrl.getDriverDetail);
router.patch('/drivers/:id/status',          ctrl.updateDriverStatus);

// Vehicles
router.get('/vehicles',                      ctrl.listVehicles);

// Transactions (ADM-03)
router.get('/transactions',                  ctrl.listTransactions);

// KYC — driver-level
router.get('/kyc/summary',                   ctrl.getKycSummary);
router.get('/kyc/pending',                   ctrl.getKycPending);
router.get('/kyc/all',                       ctrl.getAllKyc);
router.patch('/kyc/:id/approve',             ctrl.approveKyc);
router.patch('/kyc/:id/reject',              validate(v.rejectKyc), ctrl.rejectKyc);

// Documents — per-document (KYC-06)
router.get('/documents',                     ctrl.listDocuments);
router.patch('/documents/:id/approve',       ctrl.approveDocument);
router.patch('/documents/:id/reject',        ctrl.rejectDocument);

// Audit log
router.get('/audit-logs',                    ctrl.getAuditLogs);

module.exports = router;
