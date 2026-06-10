// apps/api/src/routes/assignment.js — per DevSpec §assignment
'use strict';

const router                      = require('express').Router();
const { requireRole }             = require('../middleware/roleCheck');
const { validate, assignment: v } = require('../validators');
const ctrl                        = require('../controllers/assignment.controller');

router.post('/assign',          requireRole('owner', 'admin'), validate(v.assign),   ctrl.assign);
router.post('/unassign',        requireRole('owner', 'admin'), validate(v.unassign), ctrl.unassign);
router.get('/history/:driverId',requireRole('owner', 'admin', 'manager'),            ctrl.getHistory);

module.exports = router;
