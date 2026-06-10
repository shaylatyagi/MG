// apps/api/src/routes/kyc.js — per DevSpec §kyc
'use strict';

const multer                = require('multer');
const router                = require('express').Router();
const { requireRole }       = require('../middleware/roleCheck');
const { validate, kyc: v }  = require('../validators');
const ctrl                  = require('../controllers/kyc.controller');
const { AppError }          = require('../utils/errors');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype))
      return cb(new AppError('Only JPEG, PNG, WebP, or PDF allowed', 400, 'VALIDATION_ERROR'));
    cb(null, true);
  },
});

router.get('/status',                    requireRole('driver'),                      ctrl.getStatus);
router.post('/upload',                   requireRole('driver'), upload.single('file'), ctrl.uploadDocument);
router.get('/documents/:driverId',       requireRole('owner', 'admin'),              ctrl.listDocuments);
router.put('/approve/:documentId',       requireRole('admin'),                       ctrl.approveDocument);
router.put('/reject/:documentId',        requireRole('admin'), validate(v.rejectDocument), ctrl.rejectDocument);

module.exports = router;
