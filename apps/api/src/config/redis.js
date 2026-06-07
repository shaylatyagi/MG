// apps/api/src/config/redis.js — ioredis client
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err) =>
  console.warn(JSON.stringify({ level: 'warn', event: 'redis_error', message: err.message }))
);

module.exports = redis;
