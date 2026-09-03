/**
 * LMS Campaign WhatsApp template API (Point of Connect / 2Factor).
 * POST .../lms_campaign/api/whatsapp/template/<id>/process
 * Auth: header `api-key` (same key as Graph connector unless overridden).
 *
 * Body shape:
 * { "receiver": "<mobile>", "values": { "1": "...", "2": "..." } }
 */

const { normalizeWhatsAppTo } = require('./whatsappClient');

function sharedApiKey() {
  return String(
    process.env.WHATSAPP_ACCOUNT_TEMPLATE_API_KEY ||
      process.env.WHATSAPP_ORDER_TEMPLATE_API_KEY ||
      process.env.WHATSAPP_API_KEY ||
      ''
  ).trim();
}

function sharedTimeoutMs() {
  return Math.max(
    3000,
    Number(process.env.WHATSAPP_TIMEOUT_MS || process.env.WHATSAPP_LMS_TIMEOUT_MS || 20000)
  );
}

function sharedReceiverFormat(envKey, fallback = 'e164') {
  return String(process.env[envKey] || process.env.WHATSAPP_ACCOUNT_RECEIVER_FORMAT || fallback)
    .toLowerCase()
    .trim();
}

function formatReceiver(rawPhone, format = 'e164') {
  const e164 = normalizeWhatsAppTo(rawPhone);
  if (!e164) return '';
  if (format === 'national' || format === '10') {
    if (e164.length === 12 && e164.startsWith('91')) return e164.slice(2);
    if (e164.length === 10) return e164;
  }
  return e164;
}

function sanitizeTemplateValue(value, maxLen = 60) {
  return (
    String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen) || ''
  );
}

/**
 * Generic LMS template send.
 * @param {{ url: string, apiKey: string, timeoutMs: number, receiver: string, values: Record<string,string> }} opts
 */
async function sendLmsTemplate({ url, apiKey, timeoutMs, receiver, values }) {
  if (!url || !apiKey) {
    const err = new Error('LMS WhatsApp template is not configured');
    err.code = 'WHATSAPP_LMS_NOT_CONFIGURED';
    throw err;
  }
  if (!receiver) {
    const err = new Error('Invalid receiver phone for WhatsApp');
    err.code = 'WHATSAPP_INVALID_PHONE';
    throw err;
  }

  const payload = {
    receiver,
    values: values && typeof values === 'object' ? values : {},
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || sharedTimeoutMs());

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
        'User-Agent': 'Leira-Backend/1.0',
      },
      body: JSON.stringify(payload),
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
        data?.Details ||
        `WhatsApp template API ${response.status}`;
      const err = new Error(String(message));
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return { ok: true, receiver, data };
  } finally {
    clearTimeout(timer);
  }
}

function getAccountTemplateConfig() {
  const enabled =
    String(process.env.WHATSAPP_ACCOUNT_TEMPLATE_ENABLED ?? process.env.WHATSAPP_ENABLED ?? 'true')
      .toLowerCase() !== 'false';
  const url = String(
    process.env.WHATSAPP_ACCOUNT_TEMPLATE_URL ||
      'https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/qrjmb8o062/process'
  ).trim();
  const apiKey = sharedApiKey();
  const timeoutMs = sharedTimeoutMs();
  const receiverFormat = sharedReceiverFormat('WHATSAPP_ACCOUNT_RECEIVER_FORMAT');

  return {
    enabled,
    url,
    apiKey,
    timeoutMs,
    receiverFormat,
    configured: Boolean(enabled && url && apiKey),
  };
}

function getOrderTemplateConfig() {
  const enabled =
    String(process.env.WHATSAPP_ORDER_TEMPLATE_ENABLED ?? process.env.WHATSAPP_ENABLED ?? 'true')
      .toLowerCase() !== 'false';
  const url = String(
    process.env.WHATSAPP_ORDER_TEMPLATE_URL ||
      'https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/2s1ez7tkp8/process'
  ).trim();
  const apiKey = String(
    process.env.WHATSAPP_ORDER_TEMPLATE_API_KEY || process.env.WHATSAPP_API_KEY || ''
  ).trim();
  const timeoutMs = sharedTimeoutMs();
  const receiverFormat = sharedReceiverFormat(
    'WHATSAPP_ORDER_RECEIVER_FORMAT',
    process.env.WHATSAPP_ACCOUNT_RECEIVER_FORMAT || 'e164'
  );
  const templateName =
    process.env.WHATSAPP_ORDER_TEMPLATE_NAME || 'order_management_4';

  return {
    enabled,
    url,
    apiKey,
    timeoutMs,
    receiverFormat,
    templateName,
    configured: Boolean(enabled && url && apiKey),
  };
}

function getShippedTemplateConfig() {
  const enabled =
    String(process.env.WHATSAPP_SHIPPED_TEMPLATE_ENABLED ?? process.env.WHATSAPP_ENABLED ?? 'true')
      .toLowerCase() !== 'false';
  const url = String(
    process.env.WHATSAPP_SHIPPED_TEMPLATE_URL ||
      'https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/kzfg705by9/process'
  ).trim();
  const apiKey = String(
    process.env.WHATSAPP_SHIPPED_TEMPLATE_API_KEY || process.env.WHATSAPP_API_KEY || ''
  ).trim();
  const timeoutMs = sharedTimeoutMs();
  const receiverFormat = sharedReceiverFormat(
    'WHATSAPP_SHIPPED_RECEIVER_FORMAT',
    process.env.WHATSAPP_ORDER_RECEIVER_FORMAT ||
      process.env.WHATSAPP_ACCOUNT_RECEIVER_FORMAT ||
      'e164'
  );
  const templateName =
    process.env.WHATSAPP_SHIPPED_TEMPLATE_NAME || 'order_pick_up_no_cta_4';
  const pickupLocation = String(
    process.env.WHATSAPP_SHIPPED_PICKUP_LOCATION || 'Leira pickup point'
  ).trim();

  return {
    enabled,
    url,
    apiKey,
    timeoutMs,
    receiverFormat,
    templateName,
    pickupLocation,
    configured: Boolean(enabled && url && apiKey),
  };
}

/** account_creation_confirmation_3 — values.1 = name */
async function sendAccountCreationTemplate({ phone, name }) {
  const cfg = getAccountTemplateConfig();
  if (!cfg.configured) {
    const err = new Error('Account WhatsApp template is not configured');
    err.code = 'WHATSAPP_ACCOUNT_TEMPLATE_NOT_CONFIGURED';
    throw err;
  }

  const receiver = formatReceiver(phone, cfg.receiverFormat);
  const displayName = sanitizeTemplateValue(name || 'Customer', 60) || 'Customer';

  return sendLmsTemplate({
    url: cfg.url,
    apiKey: cfg.apiKey,
    timeoutMs: cfg.timeoutMs,
    receiver,
    values: { '1': displayName },
  });
}

/**
 * order_management_4 — Hi {{1}}, order placed... order number is {{2}}.
 * values.1 = name, values.2 = order number
 */
async function sendOrderManagementTemplate({ phone, name, orderNumber }) {
  const cfg = getOrderTemplateConfig();
  if (!cfg.configured) {
    const err = new Error('Order WhatsApp template is not configured');
    err.code = 'WHATSAPP_ORDER_TEMPLATE_NOT_CONFIGURED';
    throw err;
  }

  const receiver = formatReceiver(phone, cfg.receiverFormat);
  const displayName = sanitizeTemplateValue(name || 'Customer', 60) || 'Customer';
  const orderRef = sanitizeTemplateValue(orderNumber || '—', 40) || '—';

  return sendLmsTemplate({
    url: cfg.url,
    apiKey: cfg.apiKey,
    timeoutMs: cfg.timeoutMs,
    receiver,
    values: {
      '1': displayName,
      '2': orderRef,
    },
  });
}

/**
 * order_pick_up_no_cta_4 — Hello {{1}}, Your order {{2}} is now ready for pickup at {{3}}.
 */
async function sendOrderPickupTemplate({ phone, name, orderNumber, pickupLocation }) {
  const cfg = getShippedTemplateConfig();
  if (!cfg.configured) {
    const err = new Error('Shipped WhatsApp template is not configured');
    err.code = 'WHATSAPP_SHIPPED_TEMPLATE_NOT_CONFIGURED';
    throw err;
  }

  const receiver = formatReceiver(phone, cfg.receiverFormat);
  const displayName = sanitizeTemplateValue(name || 'Customer', 60) || 'Customer';
  const orderRef = sanitizeTemplateValue(orderNumber || '—', 40) || '—';
  const location =
    sanitizeTemplateValue(pickupLocation || cfg.pickupLocation || 'Leira pickup point', 80) ||
    'Leira pickup point';

  return sendLmsTemplate({
    url: cfg.url,
    apiKey: cfg.apiKey,
    timeoutMs: cfg.timeoutMs,
    receiver,
    values: {
      '1': displayName,
      '2': orderRef,
      '3': location,
    },
  });
}

function getDeliveredTemplateConfig() {
  const enabled =
    String(process.env.WHATSAPP_DELIVERED_TEMPLATE_ENABLED ?? process.env.WHATSAPP_ENABLED ?? 'true')
      .toLowerCase() !== 'false';
  const url = String(
    process.env.WHATSAPP_DELIVERED_TEMPLATE_URL ||
      'https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/0uv3omy1e7/process'
  ).trim();
  const apiKey = String(
    process.env.WHATSAPP_DELIVERED_TEMPLATE_API_KEY || process.env.WHATSAPP_API_KEY || ''
  ).trim();
  const timeoutMs = sharedTimeoutMs();
  const receiverFormat = sharedReceiverFormat(
    'WHATSAPP_DELIVERED_RECEIVER_FORMAT',
    process.env.WHATSAPP_ORDER_RECEIVER_FORMAT ||
      process.env.WHATSAPP_ACCOUNT_RECEIVER_FORMAT ||
      'e164'
  );
  const templateName =
    process.env.WHATSAPP_DELIVERED_TEMPLATE_NAME || 'order_delivered_0001';
  // "Your {{2}} has been delivered" → default "order LR-xxx"
  const orderLabelPrefix = String(
    process.env.WHATSAPP_DELIVERED_ORDER_LABEL_PREFIX ?? 'order'
  ).trim();

  return {
    enabled,
    url,
    apiKey,
    timeoutMs,
    receiverFormat,
    templateName,
    orderLabelPrefix,
    configured: Boolean(enabled && url && apiKey),
  };
}

/**
 * order_delivered_0001 — Hi {{1}}, Your {{2}} has been delivered. Thank you...
 * values.1 = name, values.2 = "order <orderNumber>" (or raw order no via env)
 */
async function sendOrderDeliveredTemplate({ phone, name, orderNumber }) {
  const cfg = getDeliveredTemplateConfig();
  if (!cfg.configured) {
    const err = new Error('Delivered WhatsApp template is not configured');
    err.code = 'WHATSAPP_DELIVERED_TEMPLATE_NOT_CONFIGURED';
    throw err;
  }

  const receiver = formatReceiver(phone, cfg.receiverFormat);
  const displayName = sanitizeTemplateValue(name || 'Customer', 60) || 'Customer';
  const orderRef = sanitizeTemplateValue(orderNumber || '—', 40) || '—';
  const prefix = String(cfg.orderLabelPrefix || '').trim();
  const deliveredSubject =
    sanitizeTemplateValue(prefix ? `${prefix} ${orderRef}` : orderRef, 60) || orderRef;

  return sendLmsTemplate({
    url: cfg.url,
    apiKey: cfg.apiKey,
    timeoutMs: cfg.timeoutMs,
    receiver,
    values: {
      '1': displayName,
      '2': deliveredSubject,
    },
  });
}

module.exports = {
  formatReceiver,
  sanitizeTemplateValue,
  sendLmsTemplate,
  getAccountTemplateConfig,
  getOrderTemplateConfig,
  getShippedTemplateConfig,
  getDeliveredTemplateConfig,
  sendAccountCreationTemplate,
  sendOrderManagementTemplate,
  sendOrderPickupTemplate,
  sendOrderDeliveredTemplate,
};
