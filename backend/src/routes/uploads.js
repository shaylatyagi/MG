const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// Memory storage — demo ke liye (S3 nahi hai abhi)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── UPLOAD ──────────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { doc_type, user_type, user_id } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File required' });

    const uId   = parseInt(user_id) || req.user.id;
    const uType = user_type || req.user.role;
    const s3Key = `${uType.toLowerCase()}s/${uId}/${doc_type.toLowerCase()}`;

    await pool.query(
      `INSERT INTO public.user_documents
         (user_id, user_type, doc_type, original_name, s3_key, file_size, mime_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'UPLOADED')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET
         original_name = EXCLUDED.original_name,
         s3_key        = EXCLUDED.s3_key,
         file_size     = EXCLUDED.file_size,
         mime_type     = EXCLUDED.mime_type,
         status        = 'UPLOADED',
         uploaded_at   = NOW()`,
      [uId, uType, doc_type, file.originalname, s3Key, file.size, file.mimetype]
    );

    res.json({ success: true, message: 'Document saved!' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MY DOCS ─────────────────────────────────────────────────────────
router.get('/my-docs', verifyToken, async (req, res) => {
  try {
    const { user_id, user_type } = req.query;
    const uId   = parseInt(user_id) || req.user.id;
    const uType = user_type || req.user.role;

    const result = await pool.query(
      `SELECT * FROM public.user_documents
       WHERE user_id = $1 AND user_type = $2
       ORDER BY uploaded_at DESC`,
      [uId, uType]
    );

    // Demo: placeholder view_url (S3 nahi hai)
    const docs = result.rows.map(doc => ({
      ...doc,
      view_url: null  // S3 set hone pe real URL aayega
    }));

    res.json({ success: true, docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ──────────────────────────────────────────────────────────
router.delete('/delete/:doc_id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM public.user_documents WHERE id = $1 AND user_id = $2`,
      [req.params.doc_id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;