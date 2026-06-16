/**
 * driver.test.js — Validation-layer tests for /api/driver routes
 * DB is mocked — tests only Zod validation + HTTP contract.
 */

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

const driverToken = jwt.sign(
  { id: 42, role: 'DRIVER', phone: '9876543210' },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);
const authHeader = `Bearer ${driverToken}`;

describe('POST /api/driver/location', () => {
  test('400 — missing latitude', async () => {
    const res = await request(app)
      .post('/api/driver/location')
      .set('Authorization', authHeader)
      .send({ longitude: 73.8567 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — latitude out of range', async () => {
    const res = await request(app)
      .post('/api/driver/location')
      .set('Authorization', authHeader)
      .send({ latitude: 999, longitude: 73.8567 });
    expect(res.status).toBe(400);
  });

  test('400 — longitude out of range', async () => {
    const res = await request(app)
      .post('/api/driver/location')
      .set('Authorization', authHeader)
      .send({ latitude: 18.52, longitude: -999 });
    expect(res.status).toBe(400);
  });

  test('passes validation with valid coords', async () => {
    const db = require('../config/db');
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE drivers

    const res = await request(app)
      .post('/api/driver/location')
      .set('Authorization', authHeader)
      .send({ latitude: 18.5204, longitude: 73.8567 });
    expect(res.status).not.toBe(400);
  });
});

describe('POST /api/driver/sos', () => {
  test('400 — message too long', async () => {
    const res = await request(app)
      .post('/api/driver/sos')
      .set('Authorization', authHeader)
      .send({ message: 'x'.repeat(600) });
    expect(res.status).toBe(400);
  });

  test('400 — latitude out of range', async () => {
    const res = await request(app)
      .post('/api/driver/sos')
      .set('Authorization', authHeader)
      .send({ latitude: 999, longitude: 73.8 });
    expect(res.status).toBe(400);
  });

  test('passes validation with empty body (all fields optional)', async () => {
    const db = require('../config/db');
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post('/api/driver/sos')
      .set('Authorization', authHeader)
      .send({});
    // Validation passes — body may fail at DB level (mocked) but not at 400
    expect(res.status).not.toBe(400);
  });
});

describe('401 — unauthenticated driver routes', () => {
  test('POST /api/driver/location returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/driver/location')
      .send({ latitude: 18.52, longitude: 73.85 });
    expect(res.status).toBe(401);
  });

  test('POST /api/driver/sos returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/driver/sos')
      .send({});
    expect(res.status).toBe(401);
  });
});
