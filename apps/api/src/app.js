// apps/api/src/app.js — Full middleware chain per DevSpec §12.2
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { verifyToken }  = require('./middleware/auth');
const { requireRole }  = require('./middleware/roleCheck');
const { errorHandler } = require('./utils/errors');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) =>
    (!origin || ALLOWED.includes(origin)) ? cb(null, true) : cb(new Error('CORS')),
  credentials: true,
}));

// ── BODY PARSING ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── STRUCTURED LOGGING ────────────────────────────────────────
app.use(morgan((tokens, req, res) => JSON.stringify({
  ts:     tokens.date(req, res, 'iso'),
  method: tokens.method(req, res),
  path:   tokens.url(req, res),
  status: parseInt(tokens.status(req, res)),
  ms:     parseFloat(tokens['response-time'](req, res)),
  uid:    req.user?.id,
  role:   req.user?.role,
})));

// ── RATE LIMITING (Redis-backed in prod, memory in dev) ───────
let rateLimitStore;
if (process.env.REDIS_URL) {
  try {
    const redis = require('./config/redis');
    rateLimitStore = new RedisStore({ sendCommand: (...a) => redis.sendCommand(a) });
  } catch (_) {
    // fall back to memory store
  }
}
app.use('/api/', rateLimit({
  windowMs: 60_000, max: 100, standardHeaders: true,
  store: rateLimitStore,
  skip: () => process.env.NODE_ENV === 'test',
}));

// ── HEALTH CHECK (no auth) ────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── GLOBAL JWT VERIFICATION ───────────────────────────────────
app.use(verifyToken); // PUBLIC_PATHS are whitelisted inside verifyToken

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/driver',     requireRole('driver','owner','admin'),              require('./routes/driver'));
app.use('/api/owner',      requireRole('owner','admin'),                        require('./routes/owner'));
app.use('/api/vehicle',    requireRole('owner','admin'),                        require('./routes/vehicle'));
app.use('/api/assignment', requireRole('owner','manager','admin'),            require('./routes/assignment'));
app.use('/api/payment',    require('./routes/payment'));
app.use('/api/collection', requireRole('owner','manager','admin'),            require('./routes/collection'));
app.use('/api/admin',      requireRole('admin'),                                  require('./routes/admin'));
app.use('/api/manager',    requireRole('manager','owner','admin'),            require('./routes/manager'));
app.use('/api/kyc',        require('./routes/kyc'));
app.use('/api/uploads',    require('./routes/uploads'));
app.use('/api/chat',       require('./routes/chat'));

// ── CENTRALISED ERROR HANDLER (must be LAST) ──────────────────
app.use(errorHandler);

module.exports = app;
