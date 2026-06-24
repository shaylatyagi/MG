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
// ── Payyantra / Validatey KYC providers ──────────────────────────────────────
// PAN, Aadhaar, DL, Bank  → secure-api-uat (existing, working)
// GST, Voter ID           → validatey-api   (Validatey / Secure Grid product)
// Switch to prod by changing env vars on Render.
const PY_BASE        = process.env.PAYYANTRA_KYC_BASE_URL  || 'https://secure-api-uat.payyantra.com';
const VALIDATEY_BASE = process.env.VALIDATEY_BASE_URL      || 'https://validatey-api.payyantra.com';
const PY_HEADERS = () => ({
  'x-api-key':    process.env.PAYYANTRA_KYC_API_KEY,
  'x-secret-key': process.env.PAYYANTRA_KYC_SECRET_KEY,
  'Content-Type': 'application/json',
});

const kycProviders = {
  payyantra: {
    // ── PAN (Validatey — validatey-api.payyantra.com) ─────────────────────────
    verifyPAN: async (panNumber, clientRef) => {
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/pans/details`, {
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

    // ── Aadhaar DigiLocker — step 1: create session (Validatey) ─────────────
    initiateAadhaarDigilocker: async ({ clientRef, name, mobile, emailId, redirectionUrl, notifyUrl }) => {
      const body = { client_ref_num: clientRef, name, mobile };
      if (emailId)        body.emailId        = emailId;
      if (redirectionUrl) body.redirectionUrl = redirectionUrl;
      if (notifyUrl)      body.notifyUrl      = notifyUrl;
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/aadhaar/digilocker/sessions`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return {
        success:     res.ok && data?.success,
        publicId:    data?.data?.publicId    || null,
        sessionCode: data?.data?.sessionCode || null,
        kycUrl:      data?.data?.kycUrl      || null,
        message:     data?.data?.message     || (res.ok ? 'DigiLocker session created' : 'Failed to initiate Aadhaar'),
        raw:         data,
      };
    },

    // ── Aadhaar DigiLocker — step 2: poll session status (Validatey) ────────
    checkAadhaarStatus: async (publicId) => {
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/aadhaar/digilocker/sessions/${publicId}?sync=true`, {
        headers: PY_HEADERS(),
      });
      const data = await res.json();
      const result = data?.data?.result || {};
      return {
        success:      res.ok,
        status:       data?.data?.status             || 'PENDING',
        verified:     data?.data?.verificationStatus === 'SUCCESS',
        name:         result.name                    || null,
        maskedAadhaar: result.maskedAadhaarNumber    || null,
        dob:          result.dob                     || null,
        address:      result.address?.fullAddress    || null,
        raw:          data,
      };
    },

    // ── Driving Licence (Validatey — validatey-api.payyantra.com) ────────────
    // Endpoint: POST /api/v1/driving-licences/details
    // dob must be DD/MM/YYYY — convert from YYYY-MM-DD if needed
    verifyDL: async (dlNumber, dob) => {
      // Normalize DOB: accept YYYY-MM-DD or DD/MM/YYYY, always send DD/MM/YYYY
      let dobFormatted = dob || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dobFormatted)) {
        const [y, m, d] = dobFormatted.split('-');
        dobFormatted = `${d}/${m}/${y}`;
      }
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/driving-licences/details`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ dlNumber, dob: dobFormatted, client_ref_num: require('crypto').randomUUID(), consent: true }),
      });
      const data = await res.json();
      const d    = data?.data || {};
      const r    = d.result || {};
      return {
        verified: res.ok && d.verificationStatus === 'SUCCESS',
        name:     r.name    || d.name   || null,
        expiry:   r.validity?.to || r.validity_to || null,
        status:   d.verificationStatus,
        raw:      data,
      };
    },

    // ── Bank Account Penny Drop (Validatey — validatey-api.payyantra.com) ────
    verifyBank: async (accountNumber, ifsc, beneficiaryName, clientRef) => {
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/bank-accounts/verify`, {
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

    // ── GST Verification (Validatey — validatey-api.payyantra.com) ───────────
    // Endpoint: POST /api/v1/gstins/details
    // Fields in data.data directly: legalName, tradeName, verificationStatus
    verifyGST: async (gstin, clientRef) => {
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/gstins/details`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ gstin, client_ref_num: clientRef, consent: true }),
      });
      const data = await res.json();
      const d    = data?.data || {};
      return {
        verified:     res.ok && d.verificationStatus === 'SUCCESS',
        businessName: d.legalName || d.tradeName || null,
        regStatus:    d.registrationStatus || null,
        status:       d.verificationStatus,
        raw:          data,
      };
    },

    // ── Voter ID Verification (Validatey — validatey-api.payyantra.com) ──────
    // Endpoint: POST /api/v1/voters/details
    // Field: epicNumber (the EPIC number printed on the voter ID card)
    verifyVoterID: async (epicNumber, clientRef) => {
      const res  = await fetch(`${VALIDATEY_BASE}/api/v1/voters/details`, {
        method: 'POST',
        headers: PY_HEADERS(),
        body: JSON.stringify({ epicNumber, client_ref_num: clientRef, consent: true }),
      });
      const data = await res.json();
      const d    = data?.data || {};
      return {
        verified:   res.ok && d.verificationStatus === 'SUCCESS',
        name:       d.name || d.result?.name || null,
        epicStatus: d.epicStatus || null,
        status:     d.verificationStatus,
        raw:        data,
      };
    },
  },
};

const kyc = kycProviders[PROVIDER] || kycProviders.setu;

// Helper: save KYC result to DB
const saveKycResult = async (phone, docType, verified, verifiedName) => {
  try {
    const colMap = { aadhaar: 'aadhaar_number', pan: 'pan_number', dl: 'driving_license_number' };
    const col = colMap[docType];
    if (col && verifiedName) {
      // Update public.drivers by phone_number
      await pool.query(
        `UPDATE public.drivers SET ${col}=$1, updated_at=NOW()
         WHERE mobile_number=$2 OR phone_number=$2`,
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
// Payyantra DigiLocker flow — returns kycUrl for driver to open
// Body: { name, mobile, email?, redirect_url? }
// Returns: { success, publicId, kycUrl, sessionCode, message }
// ─────────────────────────────────────────────────────────────────────
router.post('/aadhaar-initiate', async (req, res) => {
  try {
    const { name, mobile, email, redirect_url } = req.body;
    if (!name || !mobile)
      return res.status(400).json({ success: false, message: 'name and mobile required' });

    const crypto    = require('crypto');
    const clientRef = crypto.randomUUID();
    const notifyUrl = `${process.env.BACKEND_URL || 'https://mg-qw5s.onrender.com'}/api/kyc/aadhaar-webhook`;

    const result = await kyc.initiateAadhaarDigilocker({
      clientRef,
      name,
      mobile,
      emailId:        email        || undefined,
      redirectionUrl: redirect_url || undefined,
      notifyUrl,
    });

    console.log('[KYC] aadhaar-initiate raw:', JSON.stringify(result.raw));
    if (!result.success) {
      console.error('[KYC] aadhaar-initiate FAILED:', result.message, '| raw:', JSON.stringify(result.raw));
    }

    res.json({
      success:     result.success,
      publicId:    result.publicId,
      kycUrl:      result.kycUrl,
      sessionCode: result.sessionCode,
      message:     result.success ? result.message : (result.raw?.message || result.message),
    });
  } catch (err) {
    console.error('Aadhaar initiate error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// GET /api/kyc/aadhaar-status/:publicId?phone=xxx
// Poll until status = SUCCESS or FAILED
// ─────────────────────────────────────────────────────────────────────
router.get('/aadhaar-status/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { phone }    = req.query;

    const result = await kyc.checkAadhaarStatus(publicId);

    if (result.verified && phone && result.maskedAadhaar) {
      const last4 = result.maskedAadhaar.replace(/\D/g, '').slice(-4);
      await saveKycResult(phone, 'aadhaar', true, last4);
    }

    res.json({
      success:       result.success,
      status:        result.status,
      verified:      result.verified,
      name:          result.name,
      maskedAadhaar: result.maskedAadhaar,
      message:       result.verified
        ? '✅ Aadhaar Verified'
        : result.status === 'FAILED'
          ? '❌ Aadhaar verification failed'
          : 'Verification in progress...',
    });
  } catch (err) {
    console.error('Aadhaar status error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/aadhaar-webhook
// Payyantra webhook — fires on verification.completed / .failed
// ─────────────────────────────────────────────────────────────────────
router.post('/aadhaar-webhook', async (req, res) => {
  try {
    const { publicId, status } = req.body;
    console.log('[KYC Webhook] received:', { publicId, status });
    if (status === 'SUCCESS' && publicId) {
      const result = await kyc.checkAadhaarStatus(publicId);
      if (result.verified) {
        console.log('[KYC Webhook] SUCCESS — name:', result.name, 'masked:', result.maskedAadhaar);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[KYC Webhook] error:', err.message);
    res.status(500).json({ error: err.message });
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

    const result = await kyc.verifyDL(dl_number.toUpperCase(), dob || '');
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


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/verify-voter-id
// Body: { phone, voter_id }
// ─────────────────────────────────────────────────────────────────────
router.post('/verify-voter-id', async (req, res) => {
  try {
    const { phone, epic_number } = req.body;
    if (!epic_number) return res.status(400).json({ success: false, message: 'epic_number required (EPIC / Voter ID number as printed on card)' });

    const crypto = require('crypto');
    const result = await kyc.verifyVoterID(epic_number.toUpperCase(), crypto.randomUUID());

    if (phone && result.verified) {
      await pool.query(
        `UPDATE public.drivers SET voter_id=$1, updated_at=NOW() WHERE mobile_number=$2 OR phone_number=$2`,
        [epic_number.toUpperCase(), phone]
      ).catch(() => {});
    }

    res.json({
      success:    result.verified,
      verified:   result.verified,
      name:       result.name,
      epicStatus: result.epicStatus,
      status:     result.status,
      message:    result.verified ? '✅ Voter ID Verified' : '❌ Voter ID verification failed',
    });
  } catch (err) {
    console.error('Voter ID verify error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// =====================================================================
// OWNER KYC ROUTES  —  /api/kyc/owner/*
// All routes accept owner_id (admin use) or owner JWT (verifyToken)
// =====================================================================

// Helper: resolve owner_id from JWT or body
function resolveOwnerId(req) {
  if (req.user?.role === 'OWNER') return req.user.id;
  if (req.body?.owner_id) return parseInt(req.body.owner_id);
  return null;
}

// Helper: update owner KYC flags and kyc_status
async function updateOwnerKyc(ownerId, fields) {
  const sets = Object.entries(fields)
    .map(([k], i) => `${k}=$${i + 2}`)
    .join(', ');
  const vals = Object.values(fields);
  await pool.query(
    `UPDATE public.owners SET ${sets}, updated_at=NOW() WHERE id=$1`,
    [ownerId, ...vals]
  );
  // Recalculate kyc_status
  const r = await pool.query(
    `SELECT gst_verified, pan_verified, aadhaar_verified, bank_verified FROM public.owners WHERE id=$1`,
    [ownerId]
  );
  if (r.rows[0]) {
    const row = r.rows[0];
    const verified = [row.gst_verified, row.pan_verified, row.aadhaar_verified, row.bank_verified];
    const status = verified.every(Boolean) ? 'VERIFIED'
                 : verified.some(Boolean)  ? 'PARTIAL'
                 : 'PENDING';
    await pool.query(
      `UPDATE public.owners SET kyc_status=$1 WHERE id=$2`,
      [status, ownerId]
    );
  }
}


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/owner/verify-pan
// Body: { owner_id, pan_number }  — or owner JWT
// ─────────────────────────────────────────────────────────────────────
router.post('/owner/verify-pan', async (req, res) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) return res.status(400).json({ success: false, message: 'owner_id required' });

    const { pan_number } = req.body;
    if (!pan_number || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid PAN format (e.g. ABCDE1234F)' });

    const crypto = require('crypto');
    const result = await kyc.verifyPAN(pan_number.toUpperCase(), crypto.randomUUID());

    if (result.verified) {
      await pool.query(
        `UPDATE public.owners SET pan_number=$1, pan_verified=true, updated_at=NOW() WHERE id=$2`,
        [pan_number.toUpperCase(), ownerId]
      );
      await updateOwnerKyc(ownerId, {});
    }

    res.json({
      success: result.verified, verified: result.verified,
      name: result.name, status: result.status,
      message: result.verified ? '✅ PAN Verified' : '❌ PAN could not be verified',
    });
  } catch (err) {
    console.error('Owner PAN verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/owner/verify-gst
// Body: { owner_id, gst_number }
// ─────────────────────────────────────────────────────────────────────
router.post('/owner/verify-gst', async (req, res) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) return res.status(400).json({ success: false, message: 'owner_id required' });

    const { gst_number } = req.body;
    if (!gst_number || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid GSTIN format (e.g. 09ABCDE1234F1Z5)' });

    const crypto = require('crypto');
    const result = await kyc.verifyGST(gst_number.toUpperCase(), crypto.randomUUID());

    if (result.verified) {
      await pool.query(
        `UPDATE public.owners SET gst_number=$1, gst_verified=true, updated_at=NOW() WHERE id=$2`,
        [gst_number.toUpperCase(), ownerId]
      );
      await updateOwnerKyc(ownerId, {});
    }

    res.json({
      success: result.verified, verified: result.verified,
      businessName: result.businessName, status: result.status,
      message: result.verified ? '✅ GST Verified' : '❌ GST could not be verified',
    });
  } catch (err) {
    console.error('Owner GST verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/owner/verify-bank
// Body: { owner_id, account_number, ifsc }
// ─────────────────────────────────────────────────────────────────────
router.post('/owner/verify-bank', async (req, res) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) return res.status(400).json({ success: false, message: 'owner_id required' });

    const { account_number, ifsc } = req.body;
    if (!account_number || !ifsc)
      return res.status(400).json({ success: false, message: 'account_number and ifsc required' });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid IFSC format' });

    const crypto = require('crypto');
    const result = await kyc.verifyBank(account_number, ifsc.toUpperCase(), '', crypto.randomUUID());

    if (result.verified) {
      await pool.query(
        `UPDATE public.owners SET bank_account_number=$1, bank_ifsc=$2, bank_verified=true, updated_at=NOW() WHERE id=$3`,
        [account_number, ifsc.toUpperCase(), ownerId]
      );
      await updateOwnerKyc(ownerId, {});
    }

    res.json({
      success: result.verified, verified: result.verified,
      accountName: result.accountName, bankName: result.bankName,
      message: result.verified ? '✅ Bank Account Verified' : '❌ Bank verification failed',
    });
  } catch (err) {
    console.error('Owner bank verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/owner/aadhaar-initiate
// Body: { owner_id, name, mobile, email?, redirect_url? }
// ─────────────────────────────────────────────────────────────────────
router.post('/owner/aadhaar-initiate', async (req, res) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) return res.status(400).json({ success: false, message: 'owner_id required' });

    const { name, mobile, email, redirect_url } = req.body;
    if (!name || !mobile)
      return res.status(400).json({ success: false, message: 'name and mobile required' });

    const crypto    = require('crypto');
    const clientRef = crypto.randomUUID();
    const notifyUrl = `${process.env.BACKEND_URL || 'https://mg-qw5s.onrender.com'}/api/kyc/owner/aadhaar-webhook`;

    const result = await kyc.initiateAadhaarDigilocker({
      clientRef, name, mobile,
      emailId:        email        || undefined,
      redirectionUrl: redirect_url || undefined,
      notifyUrl,
    });

    // Store ownerId in a lightweight in-memory map for webhook correlation
    // (in prod, store publicId→ownerId in DB for reliability)
    if (result.publicId) {
      global._ownerAadhaarSessions = global._ownerAadhaarSessions || {};
      global._ownerAadhaarSessions[result.publicId] = ownerId;
    }

    res.json({
      success: result.success, publicId: result.publicId,
      kycUrl: result.kycUrl, sessionCode: result.sessionCode,
      message: result.success ? result.message : (result.raw?.message || result.message),
    });
  } catch (err) {
    console.error('Owner aadhaar initiate error:', err.message);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// GET /api/kyc/owner/aadhaar-status/:publicId?owner_id=xxx
// ─────────────────────────────────────────────────────────────────────
router.get('/owner/aadhaar-status/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const ownerId = req.query.owner_id
      ? parseInt(req.query.owner_id)
      : (global._ownerAadhaarSessions || {})[publicId] || null;

    const result = await kyc.checkAadhaarStatus(publicId);

    if (result.verified && ownerId) {
      const last4 = result.maskedAadhaar?.replace(/\D/g, '').slice(-4) || null;
      await pool.query(
        `UPDATE public.owners SET aadhaar_last4=$1, aadhaar_verified=true, updated_at=NOW() WHERE id=$2`,
        [last4, ownerId]
      ).catch(() => {});
      await updateOwnerKyc(ownerId, {}).catch(() => {});
    }

    res.json({
      success: result.success, status: result.status, verified: result.verified,
      name: result.name, maskedAadhaar: result.maskedAadhaar,
      message: result.verified ? '✅ Aadhaar Verified'
             : result.status === 'FAILED' ? '❌ Aadhaar verification failed'
             : 'Verification in progress...',
    });
  } catch (err) {
    console.error('Owner aadhaar status error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/owner/aadhaar-webhook
// ─────────────────────────────────────────────────────────────────────
router.post('/owner/aadhaar-webhook', async (req, res) => {
  try {
    const { publicId, status } = req.body;
    console.log('[KYC Owner Webhook] received:', { publicId, status });
    if (status === 'SUCCESS' && publicId) {
      const ownerId = (global._ownerAadhaarSessions || {})[publicId] || null;
      const result  = await kyc.checkAadhaarStatus(publicId);
      if (result.verified && ownerId) {
        const last4 = result.maskedAadhaar?.replace(/\D/g, '').slice(-4) || null;
        await pool.query(
          `UPDATE public.owners SET aadhaar_last4=$1, aadhaar_verified=true, updated_at=NOW() WHERE id=$2`,
          [last4, ownerId]
        ).catch(() => {});
        await updateOwnerKyc(ownerId, {}).catch(() => {});
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[KYC Owner Webhook] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// GET /api/kyc/owner/status?owner_id=xxx
// ─────────────────────────────────────────────────────────────────────
router.get('/owner/status', async (req, res) => {
  try {
    const ownerId = req.query.owner_id ? parseInt(req.query.owner_id)
                  : req.user?.role === 'OWNER' ? req.user.id : null;
    if (!ownerId) return res.status(400).json({ success: false, message: 'owner_id required' });

    const r = await pool.query(
      `SELECT gst_number, gst_verified, pan_number, pan_verified,
              aadhaar_last4, aadhaar_verified, bank_account_number, bank_ifsc, bank_verified,
              kyc_status
       FROM public.owners WHERE id=$1`,
      [ownerId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Owner not found' });
    const row = r.rows[0];
    res.json({
      success: true,
      kyc_status: row.kyc_status,
      status: {
        gst:    row.gst_verified    ? 'verified' : 'pending',
        pan:    row.pan_verified    ? 'verified' : 'pending',
        aadhaar: row.aadhaar_verified ? 'verified' : 'pending',
        bank:   row.bank_verified   ? 'verified' : 'pending',
      },
      values: {
        gst:      row.gst_number          || '',
        pan:      row.pan_number          || '',
        aadhaar:  row.aadhaar_last4       || '',
        bank_acc: row.bank_account_number || '',
        bank_ifsc: row.bank_ifsc          || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// =====================================================================
// COMPANY KYC ROUTES  —  /api/kyc/company/*
// =====================================================================

async function updateCompanyKyc(companyId) {
  const r = await pool.query(
    `SELECT gst_verified, pan_verified FROM public.companies WHERE id=$1`,
    [companyId]
  );
  if (r.rows[0]) {
    const row = r.rows[0];
    const status = (row.gst_verified && row.pan_verified) ? 'VERIFIED'
                 : (row.gst_verified || row.pan_verified) ? 'PARTIAL'
                 : 'PENDING';
    await pool.query(
      `UPDATE public.companies SET kyc_status=$1 WHERE id=$2`,
      [status, companyId]
    );
  }
}


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/company/verify-gst
// Body: { company_id, gst_number }
// ─────────────────────────────────────────────────────────────────────
router.post('/company/verify-gst', async (req, res) => {
  try {
    const { company_id, gst_number } = req.body;
    if (!company_id) return res.status(400).json({ success: false, message: 'company_id required' });
    if (!gst_number || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid GSTIN format' });

    const crypto = require('crypto');
    const result = await kyc.verifyGST(gst_number.toUpperCase(), crypto.randomUUID());

    if (result.verified) {
      await pool.query(
        `UPDATE public.companies SET gst_number=$1, gst_verified=true WHERE id=$2`,
        [gst_number.toUpperCase(), company_id]
      );
      await updateCompanyKyc(company_id);
    }

    res.json({
      success: result.verified, verified: result.verified,
      businessName: result.businessName, status: result.status,
      message: result.verified ? '✅ GST Verified' : '❌ GST could not be verified',
    });
  } catch (err) {
    console.error('Company GST verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// POST /api/kyc/company/verify-pan
// Body: { company_id, pan_number }
// ─────────────────────────────────────────────────────────────────────
router.post('/company/verify-pan', async (req, res) => {
  try {
    const { company_id, pan_number } = req.body;
    if (!company_id) return res.status(400).json({ success: false, message: 'company_id required' });
    if (!pan_number || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase()))
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });

    const crypto = require('crypto');
    const result = await kyc.verifyPAN(pan_number.toUpperCase(), crypto.randomUUID());

    if (result.verified) {
      await pool.query(
        `UPDATE public.companies SET pan_number=$1, pan_verified=true WHERE id=$2`,
        [pan_number.toUpperCase(), company_id]
      );
      await updateCompanyKyc(company_id);
    }

    res.json({
      success: result.verified, verified: result.verified,
      name: result.name, status: result.status,
      message: result.verified ? '✅ PAN Verified' : '❌ PAN could not be verified',
    });
  } catch (err) {
    console.error('Company PAN verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────
// GET /api/kyc/company/status?company_id=xxx
// ─────────────────────────────────────────────────────────────────────
router.get('/company/status', async (req, res) => {
  try {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ success: false, message: 'company_id required' });

    const r = await pool.query(
      `SELECT gst_number, gst_verified, pan_number, pan_verified, kyc_status
       FROM public.companies WHERE id=$1`,
      [company_id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Company not found' });
    const row = r.rows[0];
    res.json({
      success: true,
      kyc_status: row.kyc_status,
      status: {
        gst: row.gst_verified ? 'verified' : 'pending',
        pan: row.pan_verified ? 'verified' : 'pending',
      },
      values: {
        gst: row.gst_number || '',
        pan: row.pan_number || '',
      },
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