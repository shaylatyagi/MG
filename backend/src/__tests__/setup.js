// Jest setup — load env vars before any test runs
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Ensure NODE_ENV is test so rate limits + morgan are skipped
process.env.NODE_ENV = 'test';

// Silence console.log/warn during tests (keep console.error for real failures)
global.console.log  = jest.fn();
global.console.warn = jest.fn();
