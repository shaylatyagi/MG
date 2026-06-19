/**
 * app.js — Express app factory (no server.listen here)
 * Imported by index.js (which calls listen) and by tests (which use supertest).
 */
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const logger     = require('./utils/logger');

const { errorMiddleware, notFoundMiddleware } = require('./middleware/error.middleware');

const ALLOWED_ORIGINS = [
  'https://mobilitygrid.in',
  'https://www.mobilitygrid.in',
  'https://partners.mobilitygrid.in',
  'https://mg-xi.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const app = express();

// ── Security & performance ────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());   // gzip all responses

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limits ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const rateLimit = require('express-rate-limit');
  app.use('/api/auth/send-otp', rateLimit({
    windowMs: 10 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many OTP requests, try after 10 minutes' },
  }));
  app.use('/api/auth/verify-otp', rateLimit({
    windowMs: 10 * 60 * 1000, max: 10,
    message: { error: 'Too many OTP attempts, try after 10 minutes' },
  }));
}

// ── Routes ────────────────────────────────────────────────────────────────────
const { verifyToken, verifyAdmin } = require('./middleware/auth.middleware');
const { withRls, bypassRls } = require('./middleware/rls.middleware');

app.use('/api/uploads',      require('./routes/uploads'));
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/driver',       require('./routes/driver'));
const paymentRoutes = require('./routes/payment');
app.use('/api/payment',      verifyToken, require('./routes/payment'));
app.use('/api/assignment',   verifyToken, require('./routes/assignment'));
app.use('/api/payment-links',require('./routes/paymentLinks'));
app.use('/api/admin',        verifyAdmin, bypassRls, require('./routes/admin'));
app.use('/api/owner',        withRls, require('./routes/owner'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/kyc',          require('./routes/kyc'));
app.use('/api/inspection',   verifyToken, require('./routes/inspection'));
app.use('/api/device',       verifyToken, require('./routes/device'));

// ── API Docs (Swagger UI via CDN — zero extra npm deps) ───────────────────────
const openApiSpec = require('./docs/openapi');

app.get('/api/docs/json', (req, res) => res.json(openApiSpec));

app.get('/api/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MobilityGrid API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`);
});

// ── Health checks ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const pool = require('./config/db');
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    res.json({
      status:   'ok',
      db:       'ok',
      latencyMs: Date.now() - start,
      ts:       new Date().toISOString(),
      env:      process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    logger.error('Health check DB failed', { error: err.message });
    res.status(503).json({
      status:   'degraded',
      db:       'error',
      error:    err.message,
      ts:       new Date().toISOString(),
    });
  }
});

app.get('/', (req, res) => res.json({ message: 'MobilityGrid API', version: '1.0.0' }));

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
