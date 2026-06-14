const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const pool     = require('../config/db');
const { verifyToken } = require('../middleware/auth.middleware');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// ── S3 client ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || 'mobilitygrid-docs';

// Helper: upload buffer to S3, return key
async function uploadToS3(buffer, key, mimeType) {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
  }));
  return key;
}

// Helper: generate presigned view URL (valid 1 hour)
async function presignedUrl(key) {
  if (!key) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}

// Memory storage — file goes S3 directly from buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/jpg','application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── UPLOAD ──────────────────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { doc_type, user_type, user_id } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File required' });

    const uId   = parseInt(user_id) || req.user.id;
    const uType = (user_type || req.user.role).toUpperCase();
    const ext   = file.originalname.split('.').pop();
    const s3Key = `${uType.toLowerCase()}s/${uId}/${doc_type.toLowerCase()}_${Date.now()}.${ext}`;

    await uploadToS3(file.buffer, s3Key, file.mimetype);

    await pool.query(
      `INSERT INTO public.user_documents
         (user_id, user_type, doc_type, original_name, s3_key, file_size, mime_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET
         original_name = EXCLUDED.original_name,
         s3_key        = EXCLUDED.s3_key,
         file_size     = EXCLUDED.file_size,
         mime_type     = EXCLUDED.mime_type,
         status        = 'PENDING',
         uploaded_at   = NOW()`,
      [uId, uType, doc_type, file.originalname, s3Key, file.size, file.mimetype]
    );

    // Notify admin with uploader's name — fire-and-forget
    pool.query(
      `INSERT INTO public.notifications (user_type, title, message, created_at)
       VALUES ('ADMIN', $1, $2, NOW())`,
      [
        `📄 Document Uploaded: ${doc_type.replace(/_/g, ' ')}`,
        `${uType === 'OWNER' ? 'Owner' : uType === 'DRIVER' ? 'Driver' : uType} (ID ${uId}) uploaded ${doc_type.replace(/_/g, ' ')} — awaiting review`,
      ]
    ).catch(() => {});

    const view_url = await presignedUrl(s3Key);
    res.json({ success: true, s3Key, view_url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MY DOCS ─────────────────────────────────────────────────────────────────
router.get('/my-docs', verifyToken, async (req, res) => {
  try {
    const { user_id, user_type } = req.query;
    const uId   = parseInt(user_id) || req.user.id;
    const uType = (user_type || req.user.role).toUpperCase();

    const result = await pool.query(
      `SELECT * FROM public.user_documents
       WHERE user_id=$1 AND user_type=$2
       ORDER BY uploaded_at DESC`,
      [uId, uType]
    );

    // Generate presigned URLs for all docs
    const docs = await Promise.all(result.rows.map(async doc => ({
      ...doc,
      view_url: await presignedUrl(doc.s3_key).catch(() => null),
    })));

    res.json({ success: true, docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PRESIGNED URL (single doc) ───────────────────────────────────────────────
router.get('/view/:doc_id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public.user_documents WHERE id=$1`,
      [req.params.doc_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const doc = result.rows[0];
    const view_url = await presignedUrl(doc.s3_key);
    res.json({ success: true, view_url, doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ──────────────────────────────────────────────────────────────────
router.delete('/delete/:doc_id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM public.user_documents WHERE id=$1 AND user_id=$2 RETURNING s3_key`,
      [req.params.doc_id, req.user.id]
    );
    if (result.rows[0]?.s3_key) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: result.rows[0].s3_key })).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── AGREEMENT UPLOAD ────────────────────────────────────────────────────────
router.post('/agreement', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const { driverId } = req.body;
    const f = req.file;
    if (!f) return res.status(400).json({ success: false, message: 'File required' });

    const ext   = f.originalname.split('.').pop();
    const s3Key = `agreements/driver_${driverId}_${Date.now()}.${ext}`;

    await uploadToS3(f.buffer, s3Key, f.mimetype);

    await pool.query(
      `INSERT INTO public.user_documents
         (user_id, user_type, doc_type, original_name, s3_key, file_size, mime_type, status)
       VALUES ($1,'DRIVER','AGREEMENT',$2,$3,$4,$5,'PENDING')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET original_name=EXCLUDED.original_name, s3_key=EXCLUDED.s3_key,
         file_size=EXCLUDED.file_size, status='PENDING', uploaded_at=NOW()`,
      [driverId, f.originalname, s3Key, f.size, f.mimetype]
    );

    await pool.query(
      `UPDATE public.drivers SET agreement_uploaded=true, updated_at=NOW() WHERE id=$1`,
      [driverId]
    ).catch(() => {});

    // Notify admin — fire-and-forget
    pool.query(
      `INSERT INTO public.notifications (user_type, title, message, created_at)
       VALUES ('ADMIN', $1, $2, NOW())`,
      [
        '📄 New Agreement Uploaded',
        `Driver ID ${driverId} uploaded an agreement — awaiting review`,
      ]
    ).catch(() => {});

    const view_url = await presignedUrl(s3Key);
    res.json({ success: true, s3Key, view_url });
  } catch (err) {
    console.error('Agreement upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
