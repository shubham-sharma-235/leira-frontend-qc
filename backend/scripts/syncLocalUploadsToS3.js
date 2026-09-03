/**
 * Upload existing local files from backend/uploads to S3 (keeps folder structure).
 *
 * Usage:
 *   cd backend
 *   USE_S3_MEDIA=true AWS_S3_BUCKET=your-bucket AWS_REGION=ap-south-1 node scripts/syncLocalUploadsToS3.js
 *
 * Skips objects that already exist unless FORCE_UPLOAD=true
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const s3Media = require('../services/s3Media');

const uploadsRoot = path.join(__dirname, '../uploads');
const forceUpload = String(process.env.FORCE_UPLOAD || '').toLowerCase() === 'true';

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
}

async function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  if (!s3Media.isS3Enabled()) {
    console.error('Set USE_S3_MEDIA=true and AWS_S3_BUCKET before syncing.');
    process.exit(1);
  }

  const files = await walkFiles(uploadsRoot);
  console.log(`Found ${files.length} local files under uploads/`);

  let uploaded = 0;
  let skipped = 0;

  for (const filePath of files) {
    const key = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
    const exists = !forceUpload && (await s3Media.objectExists(key));
    if (exists) {
      skipped += 1;
      continue;
    }

    const contentType = guessContentType(filePath);
    const url = await s3Media.uploadFileFromPath({ key, filePath, contentType });
    uploaded += 1;
    console.log(`Uploaded: ${key} -> ${url}`);
  }

  console.log(`Done. uploaded=${uploaded}, skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
