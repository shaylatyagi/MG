// backend/src/routes/inspection.js
// Vehicle pre-delivery & return inspection — 4-direction photos + AI damage compare
// ─────────────────────────────────────────────────────────────────────────────────
// Endpoints:
//   POST /api/inspection/start          — create inspection record (DELIVERY | RETURN)
//   POST /api/inspection/:id/photo      — upload one photo (front/rear/left/right)
//   POST /api/inspection/compare        — Claude Vision damage diff
//   GET  /api/inspection/:assignmentId  — fetch all inspections for an assignment
// ─────────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const pool     = require('../config/db');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// ── S3 client (reuse same bucket as KYC docs) ────────────────────────────────
const s3 = new S3Client({
  region:      process.env.AWS_REGION      || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || 'mobilitygrid-docs';

// ── Multer — memory storage (max 8 MB per photo) ─────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── Helper: stream S3 object → Buffer ────────────────────────────────────────
async function s3ToBuffer(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res  = await s3.send(cmd);
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── Helper: s3Key → public-style URL (for response only, not auth) ───────────
const s3Url = (key) =>
  `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inspection/start
// Body: { assignment_id, vehicle_id, driver_id, type: 'DELIVERY'|'RETURN' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { assignment_id, vehicle_id, driver_id, type } = req.body;
  if (!assignment_id || !type || !['DELIVERY','RETURN'].includes(type)) {
    return res.status(400).json({ error: 'assignment_id and type (DELIVERY|RETURN) required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO public.vehicle_inspections
         (assignment_id, vehicle_id, driver_id, inspection_type)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [assignment_id, vehicle_id, driver_id, type]
    );
    res.json({ success: true, inspection_id: result.rows[0].id });
  } catch (err) {
    console.error('inspection start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inspection/:id/photo
// Form-data: file (image), direction: front|rear|left|right
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/photo', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { direction } = req.body;
  const file = req.file;

  const VALID_DIRS = ['front','rear','left','right'];
  if (!VALID_DIRS.includes(direction)) {
    return res.status(400).json({ error: 'direction must be front|rear|left|right' });
  }
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Check inspection exists
    const check = await pool.query(
      'SELECT id, inspection_type FROM public.vehicle_inspections WHERE id=$1', [id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Inspection not found' });

    const ext   = file.mimetype.split('/')[1] || 'jpg';
    const s3Key = `inspections/${id}/${direction}_${Date.now()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         s3Key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    const col = `photo_${direction}`;
    await pool.query(
      `UPDATE public.vehicle_inspections SET ${col}=$1 WHERE id=$2`,
      [s3Key, id]
    );

    res.json({ success: true, direction, s3_key: s3Key, url: s3Url(s3Key) });
  } catch (err) {
    console.error('inspection photo error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inspection/compare
// Body: { assignment_id }
// Fetches DELIVERY + RETURN inspections, runs Claude Vision comparison
// ─────────────────────────────────────────────────────────────────────────────
router.post('/compare', async (req, res) => {
  const { assignment_id } = req.body;
  if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(503).json({ error: 'Set GEMINI_API_KEY on Render — free from aistudio.google.com' });

  try {
    const rows = await pool.query(
      `SELECT * FROM public.vehicle_inspections
       WHERE assignment_id=$1 ORDER BY created_at ASC`,
      [assignment_id]
    );
    if (rows.rows.length < 2) {
      return res.status(400).json({ error: 'Need both DELIVERY and RETURN inspections to compare' });
    }

    const delivery = rows.rows.find(r => r.inspection_type === 'DELIVERY');
    const returnInsp = rows.rows.find(r => r.inspection_type === 'RETURN');

    if (!delivery || !returnInsp) {
      return res.status(400).json({ error: 'Missing DELIVERY or RETURN inspection' });
    }

    // Build image pairs for each direction that has both photos
    const DIRS = ['front','rear','left','right'];
    const imageParts = [];
    const availableDirs = [];

    for (const dir of DIRS) {
      const delKey = delivery[`photo_${dir}`];
      const retKey = returnInsp[`photo_${dir}`];
      if (!delKey || !retKey) continue;

      availableDirs.push(dir);

      // Download from S3 and encode as base64
      const delBuf = await s3ToBuffer(delKey);
      const retBuf = await s3ToBuffer(retKey);

      imageParts.push(
        { type: 'text', text: `=== ${dir.toUpperCase()} — BEFORE DELIVERY ===` },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: delBuf.toString('base64') } },
        { type: 'text', text: `=== ${dir.toUpperCase()} — AFTER RETURN ===` },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: retBuf.toString('base64') } }
      );
    }

    if (imageParts.length === 0) {
      return res.status(400).json({ error: 'No matching direction photos found in both inspections' });
    }

    const prompt = [
      { type: 'text', text:
        `You are an expert vehicle damage inspector for a fleet management company in India.\n\n` +
        `Compare the vehicle photos taken BEFORE delivery to the driver and AFTER the vehicle was returned.\n` +
        `For each direction (${availableDirs.join(', ')}), identify:\n` +
        `1. Any NEW scratches, dents, cracks, or damage that was NOT present before delivery\n` +
        `2. Severity: Minor (cosmetic only) | Moderate (affects value) | Severe (safety concern)\n` +
        `3. Estimated location on the vehicle\n\n` +
        `Respond in this exact JSON format:\n` +
        `{\n  "damage_detected": true/false,\n  "summary": "one sentence summary",\n  "directions": {\n    "front": { "new_damage": true/false, "severity": null|"Minor"|"Moderate"|"Severe", "description": "..." },\n    "rear": {...},\n    "left": {...},\n    "right": {...}\n  },\n  "recommendation": "No action needed|Request repair cost from driver|Escalate to insurance"\n}`
      },
      ...imageParts,
    ];

    // Build Gemini parts array: text prompt + image pairs
    const geminiParts = [{ text: prompt[0].text }]; // the text instruction
    for (let i = 1; i < prompt.length; i++) {
      const p = prompt[i];
      if (p.type === 'text') {
        geminiParts.push({ text: p.text });
      } else if (p.type === 'image') {
        geminiParts.push({ inline_data: { mime_type: 'image/jpeg', data: p.source.data } });
      }
    }

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: geminiParts }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0 },
        }),
      }
    );

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return res.status(502).json({ error: 'AI comparison failed', detail: err });
    }

    const aiData  = await aiRes.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse AI JSON response
    let report;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: rawText, damage_detected: false };
    } catch {
      report = { summary: rawText, damage_detected: false };
    }

    // Save report to DB
    await pool.query(
      `UPDATE public.vehicle_inspections
       SET ai_damage_report=$1, damage_detected=$2
       WHERE id=$3`,
      [JSON.stringify(report), report.damage_detected || false, returnInsp.id]
    );

    res.json({ success: true, report });
  } catch (err) {
    console.error('inspection compare error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inspection/:assignmentId
// Returns all inspections for a given assignment
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:assignmentId', async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT id, inspection_type,
              photo_front, photo_rear, photo_left, photo_right,
              ai_damage_report, damage_detected, created_at
       FROM public.vehicle_inspections
       WHERE assignment_id=$1
       ORDER BY created_at ASC`,
      [req.params.assignmentId]
    );

    // Convert s3 keys to display URLs
    const mapped = rows.rows.map(r => ({
      ...r,
      photo_front: r.photo_front ? s3Url(r.photo_front) : null,
      photo_rear:  r.photo_rear  ? s3Url(r.photo_rear)  : null,
      photo_left:  r.photo_left  ? s3Url(r.photo_left)  : null,
      photo_right: r.photo_right ? s3Url(r.photo_right) : null,
      ai_damage_report: r.ai_damage_report
        ? (typeof r.ai_damage_report === 'string' ? JSON.parse(r.ai_damage_report) : r.ai_damage_report)
        : null,
    }));

    res.json({ success: true, inspections: mapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
