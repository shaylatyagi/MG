// apps/api/src/routes/manager.js — per DevSpec §manager
'use strict';

const router                    = require('express').Router();
const { requireRole }           = require('../middleware/roleCheck');
const { validate, manager: v }  = require('../validators');
const ctrl                      = require('../controllers/manager.controller');

router.get('/',    requireRole('owner', 'admin'),                       ctrl.list);
router.post('/',   requireRole('owner', 'admin'), validate(v.create),   ctrl.create);
router.delete('/:id', requireRole('owner', 'admin'),                    ctrl.deactivate);

module.exports = router;
