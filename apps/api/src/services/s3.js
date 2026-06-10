// apps/api/src/services/s3.js — DevSpec §external-services
// Handles KYC document uploads to AWS S3 with local-disk fallback for dev.
// Controllers/routes MUST NOT import @aws-sdk directly.
'use strict';

const path = require('path');
const fs   = require('fs');

function isS3Configured() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * Upload a file buffer to S3 (or local tmp in dev).
 *
 * @param {{ buffer: Buffer, originalname: string, mimetype: string, entityId: string, docType: string }} opts
 * @returns {{ s3_key: string, file_url: string }}
 */
exports.uploadDocument = async ({ buffer, originalname, mimetype, entityId, docType }) => {
  const ext      = path.extname(originalname) || '.bin';
  const filename = `kyc/${entityId}/${docType}_${Date.now()}${ext}`;

  if (!isS3Configured()) {
    const tmpDir    = path.join(process.cwd(), 'tmp', 'kyc', String(entityId));
    fs.mkdirSync(tmpDir, { recursive: true });
    const localPath = path.join(tmpDir, `${docType}_${Date.now()}${ext}`);
    fs.writeFileSync(localPath, buffer);
    console.log(JSON.stringify({ level: 'info', event: 's3_local_save', localPath }));
    return { s3_key: filename, file_url: `local://${localPath}` };
  }

  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.AWS_S3_BUCKET,
    Key:         filename,
    Body:        buffer,
    ContentType: mimetype,
  }));

  const region   = process.env.AWS_REGION || 'ap-south-1';
  const bucket   = process.env.AWS_S3_BUCKET;
  const file_url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
  return { s3_key: filename, file_url };
};

/**
 * Generate a pre-signed GET URL for a private S3 object.
 *
 * @param {string} s3Key
 * @param {number} [expiresIn=900] seconds
 * @returns {string} signed URL
 */
exports.getSignedUrl = async (s3Key, expiresIn = 900) => {
  if (!isS3Configured()) return `local://tmp/${s3Key}`;

  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key }),
    { expiresIn }
  );
};
