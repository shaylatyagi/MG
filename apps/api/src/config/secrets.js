// apps/api/src/config/secrets.js — AWS Secrets Manager in prod, .env in dev
async function loadSecrets() {
  if (process.env.NODE_ENV === 'production') {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: 'ap-south-1' });
    const ids = [
      '/mobilitygrid/production/database', '/mobilitygrid/production/jwt',
      '/mobilitygrid/production/admin',    '/mobilitygrid/production/payyantra',
      '/mobilitygrid/production/twilio',   '/mobilitygrid/production/aws',
      '/mobilitygrid/production/redis',    '/mobilitygrid/production/cors',
    ];
    await Promise.all(ids.map(async id => {
      try {
        const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: id }));
        Object.assign(process.env, JSON.parse(SecretString));
      } catch (err) {
        console.warn(`Could not load secret ${id}:`, err.message);
      }
    }));
  } else {
    // Dev: load from .env file
    try { require('dotenv').config({ path: '.env' }); } catch (_) {}
  }
}

module.exports = { loadSecrets };
