const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const s3Media = require('../services/s3Media');
const { buildLocalUploadUrl } = require('../utils/mediaUrl');
const { toSafeSegment } = require('../middleware/upload');

const uploadsRoot = path.join(__dirname, '../uploads');
const uploadsProductsDir = path.join(uploadsRoot, 'products');

const getProductKeyFromRequest = (req, file) => {
  return (
    req.body?.productKey ||
    req.body?.productId ||
    req.body?.productName ||
    req.body?.id ||
    req.body?.name ||
    path.basename(file?.originalname || file?.filename || 'product', path.extname(file?.originalname || file?.filename || ''))
  );
};

const toSeoWebpFileName = (productKey = '', index = 0) => {
  const safeKey = toSafeSegment(productKey);
  const timePart = Date.now();
  const indexPart = index > 0 ? `-${index}` : '';
  return `leira-intimate-perfume-${safeKey}-${timePart}${indexPart}.webp`;
};

const optimizeToWebpBuffer = async (inputBuffer) => {
  const transformer = sharp(inputBuffer).rotate().resize(1280, 1280, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  let webpBuffer = await transformer
    .clone()
    .webp({ quality: 68, effort: 4 })
    .toBuffer();

  if (webpBuffer.length > 200 * 1024) {
    webpBuffer = await transformer
      .clone()
      .webp({ quality: 55, effort: 5 })
      .toBuffer();
  }

  return webpBuffer;
};

const storeOptimizedImage = async (req, file, index = 0) => {
  const inputBuffer = file.buffer;
  if (!inputBuffer?.length) {
    throw new Error('No image data received');
  }

  const productKey = getProductKeyFromRequest(req, file);
  const outputName = toSeoWebpFileName(productKey, index);
  const objectKey = `products/${toSafeSegment(productKey)}/${outputName}`;
  const webpBuffer = await optimizeToWebpBuffer(inputBuffer);

  if (s3Media.isS3Enabled()) {
    const url = await s3Media.uploadBuffer({
      key: objectKey,
      buffer: webpBuffer,
      contentType: 'image/webp',
    });
    return {
      url,
      filename: outputName,
      optimized: true,
      format: 'webp',
      approxSizeKB: Math.round(webpBuffer.length / 1024),
      storage: 's3',
    };
  }

  const localDir = path.join(uploadsProductsDir, toSafeSegment(productKey));
  await fs.promises.mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, outputName);
  await fs.promises.writeFile(localPath, webpBuffer);
  const relativePath = path.relative(uploadsRoot, localPath).replace(/\\/g, '/');
  const url = buildLocalUploadUrl(req, relativePath);

  return {
    url,
    filename: outputName,
    optimized: true,
    format: 'webp',
    approxSizeKB: Math.round(webpBuffer.length / 1024),
    storage: 'local',
  };
};

const storeVideoFile = async (req, file) => {
  if (!file?.path) {
    throw new Error('No video file received');
  }

  const ext = path.extname(file.originalname).toLowerCase() || path.extname(file.filename).toLowerCase() || '.mp4';
  const safeBase = toSafeSegment(path.basename(file.originalname, ext));
  const outputName = `${safeBase}-${Date.now()}${ext}`;
  const objectKey = `videos/${outputName}`;

  if (s3Media.isS3Enabled()) {
    const url = await s3Media.uploadFileFromPath({
      key: objectKey,
      filePath: file.path,
      contentType: file.mimetype,
    });
    await fs.promises.unlink(file.path).catch(() => {});
    return {
      url,
      filename: outputName,
      mimetype: file.mimetype,
      sizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
      storage: 's3',
    };
  }

  const localPath = path.join(uploadsRoot, 'videos', outputName);
  await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
  await fs.promises.rename(file.path, localPath);
  const relativePath = path.relative(uploadsRoot, localPath).replace(/\\/g, '/');
  const url = buildLocalUploadUrl(req, relativePath);

  return {
    url,
    filename: outputName,
    mimetype: file.mimetype,
    sizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
    storage: 'local',
  };
};

exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const stored = await storeOptimizedImage(req, req.file, 0);
    return res.status(200).json({ success: true, data: stored });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message,
    });
  }
};

exports.uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const filePaths = await Promise.all(
      req.files.map((file, index) => storeOptimizedImage(req, file, index + 1))
    );

    return res.status(200).json({ success: true, data: filePaths });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message,
    });
  }
};

exports.uploadHomeVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video uploaded' });
    }

    const stored = await storeVideoFile(req, req.file);
    return res.status(200).json({ success: true, data: stored });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: error.message,
    });
  }
};
