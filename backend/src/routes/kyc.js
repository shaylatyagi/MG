// backend/src/routes/kyc.js
// =====================================================================
// KYC VERIFICATION — API Setu Integration
// Future-proof: swap provider via KYC_PROVIDER env variable
//
// .env additions needed:
//   KYC_PROVIDER=setu              # setu | signzy | digio | hyperverge
//   SETU_BASE_URL=https://dg-sandbox.setu.co   # sandbox
//   SETU_CLIENT_ID=your_client_id
//   SETU_CLIENT_SECRET=your_secret
//   SETU_PRODUCT_ID=your_product_instance_id   # from Setu dashboard
// =====================================================================
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

const PROVIDER = process.env.KYC_PROVIDER || 'payyantra';
const SETU_BASE   = process.env.SETU_BASE_URL     || 'https://dg-sandbox.setu.co';
const SETU_ID     = process.env.SETU_CLIENT_ID;
const SETU_SECRET = process.env.SETU_CLIENT_SECRET;
const SETU_PID    = process.env.SETU_PRODUCT_ID;
// ── Payyantra UAT KYC provider ────────────────────────────────────────────────
// Base URL: https://secure-api-uat.payyantra.com
// Switch to prod by changing PAYYANTRA_KYC_BASE_URL env var
const PY_BASE   = process.env.PAYYANTRA_KYC_BASE_URL || 'https://secure-api-uat.payyantra.com';
const PY_HEADERS = () => ({
  'x-api-key':    process.env.PAYYANTRA_KYC_API_KEY,
  'x-secret-key': process.env.PAYYANTRA_KYC_SECRET_KEY,
  'Content-Type': 'application/json',
});

const kycProviders = {
  payyantra: {
    // ── PAN ──────────────────────────────────────────────────────────────────
    verifyPAN: async (panNumber, clientRef) => {
      const res  = await fetch(`${PY_BASE}/api/v1/pans/details`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ pan: panNumber, client_ref_num: clientRef, consent: true }),
      });
      const data = await res.json();
      const r    = data?.data?.result || {};
      return {
        verified: res.ok && data?.data?.verificationStatus === 'SUCCESS',
        name:     r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : null,
        status:   data?.data?.verificationStatus,
        raw:      data,
      };
    },

    // ── Aadhaar DigiLocker — step 1: initiate (sends OTP to Aadhaar-linked mobile) ──
    initiateAadhaar: async (aadhaarNumber) => {
      const res  = await fetch(`${PY_BASE}/api/v1/aadhaar/request`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ aadhaar: aadhaarNumber, consent: true }),
      });
      const data = await res.json();
      return {
        success:   res.ok && !data?.error,
        requestId: data?.data?.request_id || data?.request_id || null,
        message:   data?.message || (res.ok ? 'OTP sent' : 'Failed to initiate Aadhaar'),
        raw:       data,
      };
    },

    // ── Aadhaar DigiLocker — step 2: verify OTP ──────────────────────────────
    verifyAadhaar: async (requestId, otp) => {
      const res  = await fetch(`${PY_BASE}/api/v1/aadhaar/verify`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ request_id: requestId, otp }),
      });
      const data = await res.json();
      const r    = data?.data?.result || {};
      return {
        verified: res.ok && data?.data?.verificationStatus === 'SUCCESS',
        name:     r.name || null,
        last4:    r.aadhaar_number ? r.aadhaar_number.slice(-4) : null,
        raw:      data,
      };
    },

    // ── Driving License ───────────────────────────────────────────────────────
    verifyDL: async (dlNumber, dob) => {
      const res  = await fetch(`${PY_BASE}/api/v1/driving-license/details`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ dl_number: dlNumber, dob, consent: true }),
      });
      const data = await res.json();
      const r    = data?.data?.result || {};
      return {
        verified: res.ok && data?.data?.verificationStatus === 'SUCCESS',
        name:     r.name || null,
        expiry:   r.validity_to || null,
        status:   data?.data?.verificationStatus,
        raw:      data,
      };
    },

    // ── Bank Account Penny Drop ───────────────────────────────────────────────
    verifyBank: async (accountNumber, ifsc, beneficiaryName, clientRef) => {
      const res  = await fetch(`${PY_BASE}/api/v1/bank-accounts/verify`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({
          ifsc,
          accountNumber,
          beneficiaryName: beneficiaryName || '',
          paymentMode:     'IMPSPENNY',
          client_ref_num:  clientRef,
        }),
      });
      const data = await res.json();
      return {
        verified:    res.ok && data?.data?.verificationStatus === 'SUCCESS',
        accountName: data?.data?.result?.beneficiaryName || null,
        bankName:    data?.data?.result?.bankName || null,
        raw:         data,
      };
    },
  },
};

const kyc = kycProviders[PROVIDER] || kycProviders.setu;

// Helper: save KYC result to DB
const saveKycResult = async (phone, docType, verified, verifiedName) => {
  try {
    const colMap = { aadhaar: 'aadhaar_last4', pan: 'pan_number', dl: 'driving_license_number' };
    if (colMap[docType] && verifiedName) {
      await pool.query(
        `UPDATE auth.vehicle_drivers SET ${colMap[docType]}=$1
         WHERE user_id=(SELECT id FROM auth.users WHERE mobile_number=$2)`,
        [verifiedName, phone]
      );
    }
  } catch (_) {}
};


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-pan
// Body: { phone, pan_number }
// ─────────────────────────────────────────────────────────────────────
router.post('/verify-pan', async (req, res) => {
  try {
    const { phone, pan_number } = req.body;
    if (!pan_number || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid PAN format (e.g. ABCDE1234F)' });
    const crypto = require('crypto'); // File ke top par ye add karna padega
const clientRef = crypto.randomUUID();
const result = await kyc.verifyPAN(pan_number.toUpperCase(), clientRef);

    if (phone) await saveKycResult(phone, 'pan', result.verified, pan_number.toUpperCase());

    res.json({
      success:  result.verified,
      verified: result.verified,
      name:     result.name,
      status:   result.status,
      message:  result.verified ? '✅ PAN Verified' : '❌ PAN could not be verified',
    });
  } catch (err) {
    console.error('PAN verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/aadhaar-initiate
// Body: { aadhaar_number }
// ─────────────────────────────────────────────────────────────────────
router.post('/aadhaar-initiate', async (req, res) => {
  try {
    const { aadhaar_number } = req.body;
    if (!aadhaar_number || !/^\d{12}$/.test(aadhaar_number))
      return res.status(400).json({ success: false, message: 'Aadhaar must be 12 digits' });

    const result = await kyc.initiateAadhaar(aadhaar_number);
    res.json({
      success:   result.success,
      requestId: result.requestId,
      message:   result.success ? 'OTP sent to Aadhaar registered mobile' : result.message,
    });
  } catch (err) {
    console.error('Aadhaar initiate error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/aadhaar-verify
// Body: { phone, request_id, otp }
// ─────────────────────────────────────────────────────────────────────
router.post('/aadhaar-verify', async (req, res) => {
  try {
    const { phone, request_id, otp } = req.body;
    if (!request_id || !otp)
      return res.status(400).json({ success: false, message: 'request_id and otp required' });

    const result = await kyc.verifyAadhaar(request_id, otp);
    if (phone && result.last4) await saveKycResult(phone, 'aadhaar', result.verified, result.last4);

    res.json({
      success:  result.verified,
      verified: result.verified,
      name:     result.name,
      message:  result.verified ? '✅ Aadhaar Verified' : '❌ OTP invalid or Aadhaar mismatch',
    });
  } catch (err) {
    console.error('Aadhaar verify error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-dl
// Body: { phone, dl_number, dob }  (dob: YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────
router.post('/verify-dl', async (req, res) => {
  try {
    const { phone, dl_number, dob } = req.body;
    if (!dl_number) return res.status(400).json({ success: false, message: 'DL number required' });

    const result = await kyc.verifyDL(dl_number.toUpperCase(), dob);
    if (phone && result.verified) await saveKycResult(phone, 'dl', result.verified, dl_number.toUpperCase());

    res.json({
      success:  result.verified,
      verified: result.verified,
      name:     result.name,
      expiry:   result.expiry,
      status:   result.status,
      message:  result.verified ? '✅ Driving License Verified' : '❌ DL verification failed',
    });
  } catch (err) {
    console.error('DL verify error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-bank
// Body: { phone, account_number, ifsc }
// ─────────────────────────────────────────────────────────────────────
router.post('/verify-bank', async (req, res) => {
  try {
    const { account_number, ifsc } = req.body;
    if (!account_number || !ifsc)
      return res.status(400).json({ success: false, message: 'Account number and IFSC required' });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid IFSC format' });

    const result = await kyc.verifyBank(account_number, ifsc.toUpperCase());
    res.json({
      success:     result.verified,
      verified:    result.verified,
      accountName: result.accountName,
      bankName:    result.bankName,
      message:     result.verified ? '✅ Bank Account Verified' : '❌ Account verification failed',
    });
  } catch (err) {
    console.error('Bank verify error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});



// ── Document upload — unified S3 + user_documents flow ────────────
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const kycS3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const KYC_BUCKET = process.env.AWS_S3_BUCKET || 'mobilitygrid-docs';

const kycDocUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|pdf/.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, PDF allowed'), ok);
  },
});

// POST /api/kyc/upload-document — called by DriverPWA KYC tab
// Field: 'document' (matches DriverPWA FormData.append('document', file))
// Body:  type | doc_type  (DriverPWA sends type='AADHAAR'|'PAN'|'DL'|'BANK')
router.post('/upload-document', kycDocUpload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File required (field: document)' });

    // Resolve driver ID — JWT is authoritative; body driver_id only fallback when no JWT
    // Prevents a logged-in driver from uploading docs on behalf of a different driver_id
    let driverId = null;
    if (req.headers.authorization) {
      try {
        const jwt     = require('jsonwebtoken');
        const decoded = jwt.verify(
          req.headers.authorization.replace('Bearer ', ''),
          process.env.JWT_SECRET || 'your_jwt_secret_key_here'
        );
        driverId = decoded.id || decoded.driver_id || null;
      } catch (_) {}
    }
    if (!driverId && req.body.driver_id) driverId = parseInt(req.body.driver_id); // fallback only
    if (!driverId && req.body.phone) {
      const r = await pool.query(
        'SELECT id FROM public.drivers WHERE mobile_number = $1', [req.body.phone]
      );
      if (r.rows.length) driverId = r.rows[0].id;
    }
    if (!driverId) return res.status(400).json({ success: false, message: 'Could not identify driver' });

    // Normalize doc type — DriverPWA sends AADHAAR / PAN / DL / BANK
    const rawType = ((req.body.type || req.body.doc_type || 'DOCUMENT')).toUpperCase();

    // Upload buffer to S3
    const ext   = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const s3Key = `drivers/${driverId}/${rawType.toLowerCase()}_${Date.now()}.${ext}`;

    await kycS3.send(new PutObjectCommand({
      Bucket:      KYC_BUCKET,
      Key:         s3Key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    // Upsert into public.user_documents (same table as uploads.js)
    await pool.query(
      `INSERT INTO public.user_documents
         (user_id, user_type, doc_type, original_name, s3_key, file_size, mime_type, status)
       VALUES ($1,'DRIVER',$2,$3,$4,$5,$6,'PENDING')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET
         original_name = EXCLUDED.original_name,
         s3_key        = EXCLUDED.s3_key,
         file_size     = EXCLUDED.file_size,
         mime_type     = EXCLUDED.mime_type,
         status        = 'PENDING',
         uploaded_at   = NOW()`,
      [driverId, rawType, file.originalname, s3Key, file.size, file.mimetype]
    );

    // Mark kyc_status as PARTIAL if still at initial PENDING
    await pool.query(
      `UPDATE public.drivers SET kyc_status='PARTIAL', updated_at=NOW()
       WHERE id=$1 AND kyc_status='PENDING'`,
      [driverId]
    ).catch(() => {});

    // Notify admin — fire-and-forget
    pool.query(
      `INSERT INTO public.notifications (user_type, title, message, created_at)
       VALUES ('ADMIN', $1, $2, NOW())`,
      [
        `📄 New KYC Document: ${rawType}`,
        `Driver ID ${driverId} uploaded ${rawType} — awaiting review`,
      ]
    ).catch(() => {});

    res.json({ success: true, doc_type: rawType, s3_key: s3Key, status: 'PENDING' });
  } catch (err) {
    console.error('KYC upload-document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kyc/ocr
// Accepts an image file + doc_type, extracts fields using Gemini Vision (FREE)
// Returns: { success, doc_type, fields: { number, name, dob, ... } }
// API key from: aistudio.google.com  — free tier, no credit card needed
// ─────────────────────────────────────────────────────────────────────────────
const ocrUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/ocr', ocrUpload.single('document'), async (req, res) => {
  const file    = req.file;
  const docType = (req.body.doc_type || '').toUpperCase();

  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  if (!['AADHAAR','PAN','DL','BANK'].includes(docType)) {
    return res.status(400).json({ success: false, message: 'doc_type must be AADHAAR|PAN|DL|BANK' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ success: false, message: 'OCR not available — set GEMINI_API_KEY on Render (free from aistudio.google.com)' });
  }

  const prompts = {
    AADHAAR: `Extract from this Aadhaar card image:
- aadhaar_number: the 12-digit number (digits only, no spaces)
- name: cardholder full name as printed
- dob: date of birth in YYYY-MM-DD format
- gender: MALE or FEMALE
- address: full address as printed
Return ONLY valid JSON. Example: {"aadhaar_number":"123412341234","name":"Ravi Kumar","dob":"1990-05-14","gender":"MALE","address":"123 Main St"}`,

    PAN: `Extract from this PAN card image:
- pan_number: 10-character PAN (format ABCDE1234F, uppercase)
- name: cardholder name exactly as printed
- dob: date of birth in YYYY-MM-DD format if visible
Return ONLY valid JSON. Example: {"pan_number":"ABCDE1234F","name":"Ravi Kumar","dob":"1990-05-14"}`,

    DL: `Extract from this Driving License image:
- dl_number: license number exactly as printed
- name: holder full name
- dob: date of birth in YYYY-MM-DD format
Return ONLY valid JSON. Example: {"dl_number":"DL0420110149646","name":"Ravi Kumar","dob":"1990-05-14"}`,

    BANK: `Extract from this bank cheque or passbook image:
- account_number: bank account number (digits only)
- ifsc: IFSC code (11 characters, e.g. SBIN0001234)
- bank_name: name of the bank
- account_holder: account holder name
Return ONLY valid JSON. Example: {"account_number":"123456789012","ifsc":"SBIN0001234","bank_name":"State Bank of India","account_holder":"Ravi Kumar"}`,
  };

  try {
    const base64   = file.buffer.toString('base64');
    const mimeType = file.mimetype.startsWith('image/') ? file.mimetype : 'image/jpeg';

    const geminiRes = await fetch(
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompts[docType] },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { maxOutputTokens: 512, temperature: 0 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini OCR error:', err);
      return res.status(502).json({ success: false, message: 'OCR service error' });
    }

    const geminiData = await geminiRes.json();
    const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let fields = {};
    try {
      const match = rawText.match(/\{[\s\S]*?\}/);
      if (match) fields = JSON.parse(match[0]);
    } catch {
      fields = { raw: rawText };
    }

    res.json({ success: true, doc_type: docType, fields });
  } catch (err) {
    console.error('KYC OCR error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// GET /api/kyc/status?phone=xxx
// Returns verified status for each KYC field
// ─────────────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ success: false, message: 'phone required' });
  try {
    const r = await pool.query(
      `SELECT d.aadhaar_last4, d.pan_number, d.driving_license_number,
              d.bank_account_number, d.bank_ifsc
       FROM public.drivers d
       WHERE d.mobile_number = $1`,
      [phone]
    );
    if (!r.rows[0]) return res.json({ success: true, status: {} });
    const row = r.rows[0];
    res.json({
      success: true,
      status: {
        aadhaar: row.aadhaar_last4 ? 'verified' : 'pending',
        pan:     row.pan_number    ? 'verified' : 'pending',
        dl:      row.driving_license_number ? 'verified' : 'pending',
        bank:    (row.bank_account_number || row.bank_ifsc) ? 'verified' : 'pending',
      },
      values: {
        aadhaar: row.aadhaar_last4 || '',
        pan:     row.pan_number    || '',
        dl:      row.driving_license_number || '',
        bank_acc: row.bank_account_number || '',
        bank_ifsc: row.bank_ifsc || '',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;

// =====================================================================
// ADD TO index.js / app.js:
//   const kycRoutes = require('./src/routes/kyc');
//   app.use('/api/kyc', kycRoutes);
// =====================================================================