/**
 * logger.js — Lightweight structured logger
 * Outputs JSON in production, pretty format in development.
 */

const isProd = process.env.NODE_ENV === 'production';
const isTest  = process.env.NODE_ENV === 'test';

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const MAX_LEVEL = isProd ? LEVELS.info : LEVELS.debug;

function log(level, message, meta) {
  if (isTest) return;
  if (LEVELS[level] > MAX_LEVEL) return;

  if (isProd) {
    process.stdout.write(JSON.stringify({
      ts:  new Date().toISOString(),
      lvl: level,
      msg: message,
      ...(meta || {}),
    }) + '\n');
  } else {
    const prefix = {
      error: '\x1b[31m[ERROR]\x1b[0m',
      warn:  '\x1b[33m[WARN] \x1b[0m',
      info:  '\x1b[36m[INFO] \x1b[0m',
      http:  '\x1b[35m[HTTP] \x1b[0m',
      debug: '\x1b[90m[DEBUG]\x1b[0m',
    }[level] || '[LOG]  ';
    const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    process.stdout.write(`${prefix} ${message}${metaStr}\n`);
  }
}

const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  http:  (msg, meta) => log('http',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};

module.exports = logger;
