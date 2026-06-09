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

const PROVIDER    = process.env.KYC_PROVIDER     || 'setu';
const SETU_BASE   = process.env.SETU_BASE_URL     || 'https://dg-sandbox.setu.co';
const SETU_ID     = process.env.SETU_CLIENT_ID;
const SETU_SECRET = process.env.SETU_CLIENT_SECRET;
const SETU_PID    = process.env.SETU_PRODUCT_ID;

// ── Provider-agnostic KYC adapter ──────────────────────────────────
const kycProviders = {
  setu: {

    // ── Get JWT token from Setu ──
    getToken: async () => {
      const res = await fetch(`${SETU_BASE}/auth/token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientID: SETU_ID, secret: SETU_SECRET }),
      });
      const data = await res.json();
      if (!data?.data?.token) throw new Error('Setu token fetch failed: ' + JSON.stringify(data));
      return data.data.token;
    },

    // ── PAN Verification ──
    verifyPAN: async (panNumber) => {
      const token = await kycProviders.setu.getToken();
      const res = await fetch(`${SETU_BASE}/api/verify/pan`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'x-product-instance-id': SETU_PID },
        body:    JSON.stringify({ pan: panNumber }),
      });
      const data = await res.json();
      return {
        verified: res.ok && data?.data?.valid === true,
        name:     data?.data?.name      || null,
        status:   data?.data?.panStatus || null,
        raw:      data,
      };
    },

    // ── Aadhaar OTP — Step 1: Initiate ──
    initiateAadhaar: async (aadhaarNumber) => {
      const token = await kycProviders.setu.getToken();
      const res = await fetch(`${SETU_BASE}/api/okyc/initiate`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'x-product-instance-id': SETU_PID },
        body:    JSON.stringify({ aadhaar: aadhaarNumber }),
      });
      const data = await res.json();
      return {
        success:   res.ok,
        requestId: data?.data?.requestId || null,
        message:   data?.message         || 'OTP sent',
        raw:       data,
      };
    },

    // ── Aadhaar OTP — Step 2: Verify ──
    verifyAadhaar: async (requestId, otp) => {
      const token = await kycProviders.setu.getToken();
      const res = await fetch(`${SETU_BASE}/api/okyc/verify`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'x-product-instance-id': SETU_PID },
        body:    JSON.stringify({ requestId, otp }),
      });
      const data = await res.json();
      return {
        verified: res.ok && data?.data?.aadhaarData != null,
        name:     data?.data?.aadhaarData?.name   || null,
        address:  data?.data?.aadhaarData?.address || null,
        last4:    data?.data?.maskedAadhaarNumber?.slice(-4) || null,
        raw:      data,
      };
    },

    // ── Driving License Verification ──
    verifyDL: async (dlNumber, dob) => {
      const token = await kycProviders.setu.getToken();
      const res = await fetch(`${SETU_BASE}/api/verify/driving-licence`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'x-product-instance-id': SETU_PID },
        body:    JSON.stringify({ dlNumber, dateOfBirth: dob }),
      });
      const data = await res.json();
      return {
        verified: res.ok && data?.data?.status === 'VALID',
        name:     data?.data?.name          || null,
        expiry:   data?.data?.validUpto     || null,
        status:   data?.data?.status        || null,
        raw:      data,
      };
    },

    // ── Bank Account Penny Drop ──
    verifyBank: async (accountNumber, ifsc) => {
      const token = await kycProviders.setu.getToken();
      const res = await fetch(`${SETU_BASE}/api/verify/bank-account`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json',
                   'x-product-instance-id': SETU_PID },
        body:    JSON.stringify({ accountNumber, ifsc }),
      });
      const data = await res.json();
      return {
        verified:     res.ok && data?.data?.accountExists === true,
        accountName:  data?.data?.accountHolderName || null,
        bankName:     data?.data?.bankName           || null,
        raw:          data,
      };
    },
  },

  // ── Future providers can be added here ──
  // signzy: { verifyPAN: ..., verifyAadhaar: ..., ... },
  // hyperverge: { ... },
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

    const result = await kyc.verifyPAN(pan_number.toUpperCase());

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



// ── Document upload (mirrors /api/driver/kyc/upload) ───────────────
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const kycDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|pdf/.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, PDF allowed'), ok);
  },
});

const VALID_DOC_TYPES = ['aadhaar_front','aadhaar_back','pan','driving_licence','bank_account','license','photo'];

// POST /api/kyc/upload-document — called by DriverPWA KYC tab
router.post('/upload-document', kycDocUpload.single('file'), async (req, res) => {
  try {
    const { doc_type, driver_id, phone } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File required' });

    // Resolve driver ID from JWT if available, else from body param
    let driverId = driver_id;
    if (!driverId && req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          req.headers.authorization.replace('Bearer ', ''),
          process.env.JWT_SECRET || 'your_jwt_secret_key_here'
        );
        driverId = decoded.id || decoded.driver_id;
      } catch (_) {}
    }
    if (!driverId && phone) {
      const r = await pool.query('SELECT id FROM public.drivers WHERE mobile_number = $1', [phone]);
      if (r.rows.length) driverId = r.rows[0].id;
    }
    if (!driverId) return res.status(400).json({ success: false, message: 'Could not identify driver' });

    const docType = doc_type || 'license';
    const ext     = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const s3Key   = `drivers/${driverId}/${docType}/${uuidv4()}.${ext}`;

    await pool.query(
      `INSERT INTO public.documents (entity_type, entity_id, doc_type, s3_key, status, uploaded_at)
       VALUES ('driver', $1, $2, $3, 'pending', NOW())
       ON CONFLICT (entity_type, entity_id, doc_type)
       DO UPDATE SET s3_key = EXCLUDED.s3_key, status = 'pending',
                     rejection_reason = NULL, reviewed_at = NULL,
                     uploaded_at = NOW()`,
      [driverId, docType, s3Key]
    );

    await pool.query(
      `UPDATE public.drivers SET kyc_status = 'PARTIAL', updated_at = NOW()
       WHERE id = $1 AND kyc_status = 'PENDING'`,
      [driverId]
    );

    res.json({ success: true, doc_type: docType, s3_key: s3Key, status: 'pending' });
  } catch (err) {
    console.error('KYC upload-document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;

// =====================================================================
// ADD TO index.js / app.js:
//   const kycRoutes = require('./src/routes/kyc');
//   app.use('/api/kyc', kycRoutes);
// =====================================================================