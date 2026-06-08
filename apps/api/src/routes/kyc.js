// apps/api/src/routes/kyc.js — per DevSpec §kyc routes
const path               = require('path');
const fs                 = require('fs');
const router             = require('express').Router();
const multer             = require('multer');
const pool               = require('../config/db');
const { requireRole }    = require('../middleware/roleCheck');
const { AppError }       = require('../utils/errors');

// ── Document type whitelist ───────────────────────────────────────────────────
const VALID_DOC_TYPES = [
  'AADHAAR_FRONT',
  'AADHAAR_BACK',
  'PAN',
  'DRIVING_LICENCE',
  'BANK_ACCOUNT',
];

// ── Multer — memoryStorage for S3 (or tmp fallback) ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype))
      return cb(new AppError('Only JPEG, PNG, WebP, or PDF allowed', 400, 'VALIDATION_ERROR'));
    cb(null, true);
  },
});

// ── Inline upload helper: S3 when configured, local tmp in dev ───────────────
const uploadToS3OrLocal = async (buffer, originalname, mimetype, driverId, documentType) => {
  const isS3Configured = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );

  const ext      = path.extname(originalname) || '.bin';
  const filename = `kyc/${driverId}/${documentType}_${Date.now()}${ext}`;

  if (!isS3Configured) {
    const tmpDir    = path.join(process.cwd(), 'tmp', 'kyc', driverId);
    fs.mkdirSync(tmpDir, { recursive: true });
    const localPath = path.join(tmpDir, `${documentType}_${Date.now()}${ext}`);
    fs.writeFileSync(localPath, buffer);
    console.log(JSON.stringify({ level: 'info', event: 'kyc_local_save', localPath }));
    return { s3_key: filename, file_url: `local://${localPath}` };
  }

  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.AWS_S3_BUCKET,
    Key:         filename,
    Body:        buffer,
    ContentType: mimetype,
  }));
  const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${filename}`;
  return { s3_key: filename, file_url: fileUrl };
};

// GET /api/kyc/status — driver's own KYC status
router.get(
  '/status',
  requireRole('driver'),
  async (req, res, next) => {
    try {
      const driverId = req.user.id;

      const { rows } = await pool.query(
        `SELECT document_type, status, uploaded_at, rejection_reason
           FROM public.kyc_documents
          WHERE driver_id = $1`,
        [driverId]
      );

      const statusMap = {};
      for (const docType of VALID_DOC_TYPES) {
        const found = rows.find(r => r.document_type === docType);
        statusMap[docType] = found
          ? {
              status:           found.status,
              uploaded_at:      found.uploaded_at,
              rejection_reason: found.rejection_reason || null,
            }
          : { status: 'PENDING', uploaded_at: null, rejection_reason: null };
      }

      res.json({ success: true, data: statusMap });
    } catch (err) { next(err); }
  }
);

// POST /api/kyc/upload — driver uploads a document
router.post(
  '/upload',
  requireRole('driver'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const driverId     = req.user.id;
      const documentType = req.body.document_type;

      if (!documentType || !VALID_DOC_TYPES.includes(documentType))
        throw new AppError(
          `document_type must be one of: ${VALID_DOC_TYPES.join(', ')}`,
          400, 'VALIDATION_ERROR'
        );
      if (!req.file)
        throw new AppError('File is required', 400, 'VALIDATION_ERROR');

      const { s3_key, file_url } = await uploadToS3OrLocal(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        driverId,
        documentType
      );

      const { rows } = await pool.query(
        `INSERT INTO public.kyc_documents
           (driver_id, document_type, s3_key, file_url, status, uploaded_at)
         VALUES ($1, $2, $3, $4, 'PENDING_REVIEW', NOW())
         ON CONFLICT (driver_id, document_type) DO UPDATE
           SET s3_key           = $3,
               file_url         = $4,
               status           = 'PENDING_REVIEW',
               uploaded_at      = NOW(),
               rejection_reason = NULL,
               reviewed_by      = NULL,
               reviewed_at      = NULL
         RETURNING id, document_type, status, uploaded_at`,
        [driverId, documentType, s3_key, file_url]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// GET /api/kyc/documents/:driverId — owner or admin view
router.get(
  '/documents/:driverId',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const { driverId } = req.params;

      const { rows } = await pool.query(
        `SELECT id, document_type, file_url, status, uploaded_at,
                rejection_reason, reviewed_by, reviewed_at
           FROM public.kyc_documents
          WHERE driver_id = $1
          ORDER BY document_type`,
        [driverId]
      );

      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  }
);

// PUT /api/kyc/approve/:documentId — admin only
router.put(
  '/approve/:documentId',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      const adminId        = req.user.id;

      const { rowCount, rows } = await pool.query(
        `UPDATE public.kyc_documents
            SET status      = 'VERIFIED',
                reviewed_by = $1,
                reviewed_at = NOW(),
                rejection_reason = NULL
          WHERE id = $2
          RETURNING id, document_type, status, reviewed_at`,
        [adminId, documentId]
      );
      if (rowCount === 0) throw new AppError('Document not found', 404, 'NOT_FOUND');

      res.json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// PUT /api/kyc/reject/:documentId — admin only
router.put(
  '/reject/:documentId',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      const { reason }     = req.body;
      const adminId        = req.user.id;

      if (!reason)
        throw new AppError('reason is required', 400, 'VALIDATION_ERROR');

      const { rowCount, rows } = await pool.query(
        `UPDATE public.kyc_documents
            SET status           = 'REJECTED',
                rejection_reason = $1,
                reviewed_by      = $2,
                reviewed_at      = NOW()
          WHERE id = $3
          RETURNING id, document_type, status, rejection_reason, reviewed_at`,
        [reason, adminId, documentId]
      );
      if (rowCount === 0) throw new AppError('Document not found', 404, 'NOT_FOUND');

      res.json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

module.exports = router;
