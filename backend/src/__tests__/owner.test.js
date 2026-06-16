/**
 * owner.test.js — Validation-layer tests for /api/owner routes
 * DB is mocked — tests only the Zod validation + HTTP contract.
 */

// ── Mock DB and services before loading app ───────────────────────────────────
jest.mock('../config/db', () => ({
  query:   jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() }),
}));
jest.mock('../services/scheduler.service', () => {});
jest.mock('../services/fcm', () => ({ sendSOS: jest.fn() }));
jest.mock('../middleware/rls.middleware', () => ({
  withRls:   (req, res, next) => next(),
  bypassRls: (req, res, next) => next(),
}));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../app');

// Create a valid owner JWT for authenticated requests
const ownerToken = jwt.sign(
  { id: 1, role: 'OWNER', company_id: 10, owner_id: 1 },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);
const authHeader = `Bearer ${ownerToken}`;

describe('POST /api/owner/drivers', () => {
  test('400 — missing name', async () => {
    const res = await request(app)
      .post('/api/owner/drivers')
      .set('Authorization', authHeader)
      .send({ phone: '9876543210' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — invalid phone (too short)', async () => {
    const res = await request(app)
      .post('/api/owner/drivers')
      .set('Authorization', authHeader)
      .send({ name: 'Ravi Kumar', phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('phone');
  });

  test('400 — phone starts with invalid digit', async () => {
    const res = await request(app)
      .post('/api/owner/drivers')
      .set('Authorization', authHeader)
      .send({ name: 'Ravi Kumar', phone: '1234567890' });
    expect(res.status).toBe(400);
  });

  test('passes validation with valid payload (DB mocked to return empty)', async () => {
    const db = require('../config/db');
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // getOwner
    db.query.mockResolvedValueOnce({ rows: [] });            // duplicate check
    db.query.mockResolvedValueOnce({ rows: [{ id: 99, name: 'Ravi Kumar' }] }); // insert

    const res = await request(app)
      .post('/api/owner/drivers')
      .set('Authorization', authHeader)
      .send({ name: 'Ravi Kumar', phone: '9876543210' });
    // Validation passes — may be 200/201 or 500 depending on DB mock path
    expect(res.status).not.toBe(400);
  });
});

describe('POST /api/owner/vehicles', () => {
  test('400 — missing registration_number', async () => {
    const res = await request(app)
      .post('/api/owner/vehicles')
      .set('Authorization', authHeader)
      .send({ make: 'Tata', model: 'Ace' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — registration_number too short', async () => {
    const res = await request(app)
      .post('/api/owner/vehicles')
      .set('Authorization', authHeader)
      .send({ registration_number: 'AB' });
    expect(res.status).toBe(400);
  });

  test('passes validation with valid payload', async () => {
    const db = require('../config/db');
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // getOwner

    const res = await request(app)
      .post('/api/owner/vehicles')
      .set('Authorization', authHeader)
      .send({ registration_number: 'MH12AB1234', make: 'Tata' });
    expect(res.status).not.toBe(400);
  });
});

describe('POST /api/owner/assign', () => {
  test('400 — missing vehicle_id', async () => {
    const res = await request(app)
      .post('/api/owner/assign')
      .set('Authorization', authHeader)
      .send({ driver_id: 5 });
    expect(res.status).toBe(400);
  });

  test('400 — driver_id not a number', async () => {
    const res = await request(app)
      .post('/api/owner/assign')
      .set('Authorization', authHeader)
      .send({ driver_id: 'abc', vehicle_id: 2 });
    expect(res.status).toBe(400);
  });
});

describe('401 — unauthenticated owner routes', () => {
  test('POST /api/owner/drivers returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/owner/drivers')
      .send({ name: 'Test', phone: '9876543210' });
    expect(res.status).toBe(401);
  });
});
