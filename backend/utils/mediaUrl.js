const cloudFrontUrl = String(
  process.env.AWS_CLOUDFRONT_URL || process.env.MEDIA_PUBLIC_URL || ''
).replace(/\/$/, '');

function getBackendBaseUrl(req) {
  return process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
}

function buildLocalUploadUrl(req, relativePath) {
  const encoded = String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${getBackendBaseUrl(req)}/uploads/${encoded.replace(/^\/+/, '')}`;
}

/**
 * Convert stored path or legacy backend URL to public media URL.
 */
function resolveStoredMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return raw;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    if (cloudFrontUrl && raw.includes('/uploads/')) {
      const key = raw.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?uploads\/?/, '');
      return `${cloudFrontUrl}/${key.replace(/^\/+/, '')}`;
    }
    return raw;
  }

  const normalized = raw.replace(/\\/g, '/');
  if (
    normalized.startsWith('/uploads/') ||
    normalized.startsWith('uploads/') ||
    normalized.startsWith('/api/uploads/') ||
    normalized.startsWith('api/uploads/')
  ) {
    const key = normalized.replace(/^\/?api\//, '').replace(/^\/?uploads\/?/, '');
    if (cloudFrontUrl) {
      return `${cloudFrontUrl}/${key.replace(/^\/+/, '')}`;
    }
    const backend = process.env.BACKEND_URL || 'http://localhost:5000';
    const rel = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${backend}${rel}`;
  }

  return raw;
}

module.exports = {
  buildLocalUploadUrl,
  resolveStoredMediaUrl,
  cloudFrontUrl,
};
