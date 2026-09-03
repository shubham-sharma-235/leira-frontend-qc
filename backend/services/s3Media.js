const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

let client = null;

function getRegion() {
  return process.env.AWS_REGION || 'ap-south-1';
}

function getBucket() {
  return String(process.env.AWS_S3_BUCKET || '').trim();
}

function getCloudFrontUrl() {
  return String(process.env.AWS_CLOUDFRONT_URL || process.env.MEDIA_PUBLIC_URL || '').replace(/\/$/, '');
}

function isS3Enabled() {
  return String(process.env.USE_S3_MEDIA || '').toLowerCase() === 'true' && !!getBucket();
}

function getClient() {
  if (!client) {
    client = new S3Client({ region: getRegion() });
  }
  return client;
}

function buildPublicUrl(key) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  const cloudFrontUrl = getCloudFrontUrl();
  if (cloudFrontUrl) {
    return `${cloudFrontUrl}/${cleanKey.split('/').map(encodeURIComponent).join('/')}`;
  }
  const bucket = getBucket();
  return `https://${bucket}.s3.${getRegion()}.amazonaws.com/${cleanKey.split('/').map(encodeURIComponent).join('/')}`;
}

async function objectExists(key) {
  try {
    await getClient().send(
      new HeadObjectCommand({
        Bucket: getBucket(),
        Key: String(key || '').replace(/^\/+/, ''),
      })
    );
    return true;
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function uploadBuffer({ key, buffer, contentType, cacheControl }) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: cacheControl || 'public, max-age=31536000, immutable',
    })
  );
  return buildPublicUrl(cleanKey);
}

async function uploadFileFromPath({ key, filePath, contentType, cacheControl }) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  const body = fs.createReadStream(filePath);
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: cleanKey,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: cacheControl || 'public, max-age=31536000, immutable',
    })
  );
  return buildPublicUrl(cleanKey);
}

module.exports = {
  isS3Enabled,
  uploadBuffer,
  uploadFileFromPath,
  buildPublicUrl,
  objectExists,
  getBucket,
  getCloudFrontUrl,
  get region() {
    return getRegion();
  },
  get bucket() {
    return getBucket();
  },
  get cloudFrontUrl() {
    return getCloudFrontUrl();
  },
};
