/**
 * WhatsApp Business API client (Connector / Cloud-compatible Graph API).
 * Auth: header `api-key: <WHATSAPP_API_KEY>`
 * Docs shape: POST {{base}}/{{phoneNumberId}}/messages
 */

function trimSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

function getConfig() {
  const baseUrl = trimSlash(process.env.WHATSAPP_BASE_URL || '');
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const apiKey = String(process.env.WHATSAPP_API_KEY || '').trim();
  const wabaId = String(process.env.WHATSAPP_WABA_ID || '').trim();
  const enabled = String(process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';
  const timeoutMs = Math.max(3000, Number(process.env.WHATSAPP_TIMEOUT_MS || 20000));

  return {
    enabled,
    baseUrl,
    phoneNumberId,
    apiKey,
    wabaId,
    timeoutMs,
    configured: Boolean(enabled && baseUrl && phoneNumberId && apiKey),
  };
}

function normalizeWhatsAppTo(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // India 10-digit → E.164 without +
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) {
    const rest = digits.slice(1);
    if (rest.length === 10) return `91${rest}`;
  }
  return digits;
}

async function whatsappFetch(path, { method = 'GET', body, formData } = {}) {
  const cfg = getConfig();
  if (!cfg.configured) {
    const err = new Error('WhatsApp is not configured (WHATSAPP_BASE_URL / PHONE_NUMBER_ID / API_KEY)');
    err.code = 'WHATSAPP_NOT_CONFIGURED';
    throw err;
  }

  const url = `${cfg.baseUrl}/${String(path || '').replace(/^\/+/, '')}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  const headers = {
    'api-key': cfg.apiKey,
    'User-Agent': 'Leira-Backend/1.0',
  };

  let payload;
  if (formData) {
    payload = formData;
  } else if (body != null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        `WhatsApp API ${response.status}`;
      const err = new Error(String(message));
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function sendMessage(payload) {
  const cfg = getConfig();
  return whatsappFetch(`${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    body: payload,
  });
}

/**
 * Free-form session text (only valid inside 24h customer-care window).
 */
async function sendTextMessage(to, body, { previewUrl = false } = {}) {
  const phone = normalizeWhatsAppTo(to);
  if (!phone) throw new Error('Invalid WhatsApp recipient phone');
  const text = String(body || '').trim();
  if (!text) throw new Error('WhatsApp text body is empty');

  return sendMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: {
      preview_url: Boolean(previewUrl),
      body: text,
    },
  });
}

/**
 * Approved template message (required for business-initiated / order alerts).
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.name - template name
 * @param {string} [opts.language=en]
 * @param {Array} [opts.components]
 */
async function sendTemplateMessage({ to, name, language = 'en', components = [] }) {
  const phone = normalizeWhatsAppTo(to);
  if (!phone) throw new Error('Invalid WhatsApp recipient phone');
  const templateName = String(name || '').trim();
  if (!templateName) throw new Error('WhatsApp template name is required');

  const template = {
    name: templateName,
    language: { code: String(language || 'en').trim() || 'en' },
  };
  if (Array.isArray(components) && components.length > 0) {
    template.components = components;
  }

  return sendMessage({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template,
  });
}

async function markMessageRead(messageId) {
  const cfg = getConfig();
  const mid = String(messageId || '').trim();
  if (!mid) throw new Error('message_id is required');
  return sendMessage({
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: mid,
  });
}

function extractMessageId(apiResponse) {
  const id = apiResponse?.messages?.[0]?.id || apiResponse?.message_id || '';
  return String(id || '').trim();
}

module.exports = {
  getConfig,
  normalizeWhatsAppTo,
  whatsappFetch,
  sendMessage,
  sendTextMessage,
  sendTemplateMessage,
  markMessageRead,
  extractMessageId,
};
