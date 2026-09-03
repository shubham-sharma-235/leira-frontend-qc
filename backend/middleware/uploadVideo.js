const fs = require('fs');
const os = require('os');
const multer = require('multer');
const path = require('path');
const { isS3Enabled } = require('../services/s3Media');

const uploadsBaseDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

const tempBaseDir = path.join(os.tmpdir(), 'leira-video-uploads');
if (!fs.existsSync(tempBaseDir)) {
  fs.mkdirSync(tempBaseDir, { recursive: true });
}

const toSafeSegment = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'clip';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, isS3Enabled() ? tempBaseDir : uploadsBaseDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawName = path.basename(file.originalname, ext);
    const safeName = toSafeSegment(rawName);
    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Only video files are allowed (mp4, webm, mov)'));
  }
  return cb(null, true);
};

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
});

module.exports = uploadVideo;
