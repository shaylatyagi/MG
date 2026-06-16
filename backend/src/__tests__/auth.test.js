/**
 * Auth route tests — input validation layer
 *
 * These are "schema/contract" tests: they verify that bad input is rejected
 * with correct status codes BEFORE hitting the database. No DB connection needed.
 *
 * Run: npm test
 */

const request = require('supertest');

// Mock pool so tests never need a real DB
jest.mock('../config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
}));

// Mock scheduler so it doesn't error without DB
jest.mock('../services/scheduler.service', () => {});

const app = require('../app');

// ── Helper ────────────────────────────────────────────────────────────────────
const post = (path, body) => request(app).post(path).send(body);

// ── /api/auth/send-otp ────────────────────────────────────────────────────────
describe('POST /api/auth/send-otp', () => {
  it('rejects missing phone', async () => {
    const res = await post('/api/auth/send-otp', {});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects phone < 10 digits', async () => {
    const res = await post('/api/auth/send-otp', { phone_number: '98765' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects phone starting with 5 (invalid Indian number)', async () => {
    const res = await post('/api/auth/send-otp', { phone_number: '5123456789' });
    expect(res.status).toBe(400);
  });

  it('accepts valid phone', async () => {
    // DB mock returns no user → 404, but validation passes (not 400)
    const res = await post('/api/auth/send-otp', { phone_number: '9876543210', role: 'OWNER' });
    expect(res.status).not.toBe(400);
  });
});

// ── /api/auth/verify-otp ─────────────────────────────────────────────────────
describe('POST /api/auth/verify-otp', () => {
  it('rejects missing otp', async () => {
    const res = await post('/api/auth/verify-otp', { phone_number: '9876543210' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-numeric otp', async () => {
    const res = await post('/api/auth/verify-otp', { phone_number: '9876543210', otp: 'abcdef' });
    expect(res.status).toBe(400);
  });

  it('rejects otp < 6 digits', async () => {
    const res = await post('/api/auth/verify-otp', { phone_number: '9876543210', otp: '123' });
    expect(res.status).toBe(400);
  });
});

// ── /api/auth/login-pin ───────────────────────────────────────────────────────
describe('POST /api/auth/login-pin', () => {
  it('rejects missing role', async () => {
    const res = await post('/api/auth/login-pin', { phone_number: '9876543210', pin: '1234' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid role', async () => {
    const res = await post('/api/auth/login-pin', { phone_number: '9876543210', pin: '1234', role: 'SUPERADMIN' });
    expect(res.status).toBe(400);
  });

  it('rejects pin with letters', async () => {
    const res = await post('/api/auth/login-pin', { phone_number: '9876543210', pin: 'abcd', role: 'DRIVER' });
    expect(res.status).toBe(400);
  });

  it('rejects pin longer than 6 digits', async () => {
    const res = await post('/api/auth/login-pin', { phone_number: '9876543210', pin: '1234567', role: 'DRIVER' });
    expect(res.status).toBe(400);
  });

  it('accepts valid input (will fail at DB level, not validation)', async () => {
    const res = await post('/api/auth/login-pin', { phone_number: '9876543210', pin: '1234', role: 'DRIVER' });
    expect(res.status).not.toBe(400);
  });
});

// ── /api/auth/owner-signup ────────────────────────────────────────────────────
describe('POST /api/auth/owner-signup', () => {
  it('rejects invalid email', async () => {
    const res = await post('/api/auth/owner-signup', {
      full_name: 'Rahul Sharma', mobile_number: '9876543210', email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });

  it('rejects name with numbers', async () => {
    const res = await post('/api/auth/owner-signup', {
      full_name: 'R4hul', mobile_number: '9876543210', email: 'r@test.com',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing email', async () => {
    const res = await post('/api/auth/owner-signup', {
      full_name: 'Rahul', mobile_number: '9876543210',
    });
    expect(res.status).toBe(400);
  });
});

// ── /api/auth/admin-login ─────────────────────────────────────────────────────
describe('POST /api/auth/admin-login', () => {
  it('rejects missing password', async () => {
    const res = await post('/api/auth/admin-login', { phone_number: '9999999999' });
    expect(res.status).toBe(400);
  });

  it('rejects wrong credentials (env mismatch)', async () => {
    const res = await post('/api/auth/admin-login', { phone_number: '0000000000', password: 'wrong' });
    expect(res.status).toBe(500); // ADMIN_PHONE/PASSWORD not set in test env → server misconfiguration
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /unknown-route', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
