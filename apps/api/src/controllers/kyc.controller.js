// apps/api/src/controllers/kyc.controller.js — DevSpec §kyc
'use strict';

const pool       = require('../config/db');
const s3Service  = require('../services/s3');
const { AppError } = require('../utils/errors');

const VALID_DOC_TYPES = [
  'AADHAAR_FRONT',
  'AADHAAR_BACK',
  'PAN',
  'DRIVING_LICENCE',
  'BANK_ACCOUNT',
];

// GET /api/kyc/status — driver's own KYC status map
exports.getStatus = async (req, res, next) => {
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
};

// POST /api/kyc/upload — multer is applied in the route, file in req.file
exports.uploadDocument = async (req, res, next) => {
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

    const { s3_key, file_url } = await s3Service.uploadDocument({
      buffer:       req.file.buffer,
      originalname: req.file.originalname,
      mimetype:     req.file.mimetype,
      entityId:     String(driverId),
      docType:      documentType,
    });

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
};

// GET /api/kyc/documents/:driverId — owner or admin view
exports.listDocuments = async (req, res, next) => {
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
};

// PUT /api/kyc/approve/:documentId — admin only
exports.approveDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const adminId        = req.user.id;

    const { rowCount, rows } = await pool.query(
      `UPDATE public.kyc_documents
          SET status           = 'VERIFIED',
              reviewed_by      = $1,
              reviewed_at      = NOW(),
              rejection_reason = NULL
        WHERE id = $2
        RETURNING id, document_type, status, reviewed_at`,
      [adminId, documentId]
    );
    if (rowCount === 0) throw new AppError('Document not found', 404, 'NOT_FOUND');

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/kyc/reject/:documentId — admin only
exports.rejectDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { reason }     = req.body;
    const adminId        = req.user.id;

    if (!reason) throw new AppError('reason is required', 400, 'VALIDATION_ERROR');

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
};
