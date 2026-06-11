// apps/api/src/middleware/auth.js — per DevSpec §12.4
const jwt = require('jsonwebtoken');

const PUBLIC_PATHS = [
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/admin-login',
  '/api/auth/admin-send-otp',
  '/api/auth/admin-verify-otp',
  '/api/payment/webhook',
  '/health',
];

exports.verifyToken = (req, res, next) => {
  if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(`${p}/`)))
    return next();

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });

  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Token invalid or expired' } });
  }
};

exports.generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
