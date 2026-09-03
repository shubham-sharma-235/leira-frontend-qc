const Order = require('../models/Order');

const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY || '';
const TWOFACTOR_BASE_URL = (process.env.TWOFACTOR_BASE_URL || 'https://2factor.in/API/V1').replace(/\/$/, '');
const TWOFACTOR_ORDER_TEMPLATE = process.env.TWOFACTOR_ORDER_TEMPLATE || 'ORDER_LEIRA';
const TWOFACTOR_ORDER_SENDER_ID = process.env.TWOFACTOR_ORDER_SENDER_ID || 'LEIRAI';
const ORDER_SMS_ENABLED = String(process.env.ORDER_SMS_ENABLED ?? 'true').toLowerCase() !== 'false';
const ORDER_SMS_TIMEOUT_MS = Math.max(3000, Number(process.env.ORDER_SMS_TIMEOUT_MS || 15000));

/** Approved DLT body — used only for fallback Msg if template API rejects. */
const ORDER_SMS_FALLBACK_BODY =
  process.env.ORDER_SMS_FALLBACK_BODY ||
  'Hi {#VAR1#}, your Leira order {#VAR2#} is confirmed. Amount Rs {#VAR3#}. Thank you! -LEIRA';

function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return '';
}

function hasOrderSmsConfig() {
  return Boolean(ORDER_SMS_ENABLED && TWOFACTOR_API_KEY && TWOFACTOR_ORDER_TEMPLATE && TWOFACTOR_ORDER_SENDER_ID);
}

function truncate(value, maxLen) {
  const t = String(value || '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function formatSmsAmount(total) {
  const n = Number(total);
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.round(n).toLocaleString('en-IN');
}

function buildTemplateVars(order) {
  const name =
    truncate(order?.customer?.name || 'Customer', 24) || 'Customer';
  const orderRef = truncate(order?.orderNumber || String(order?._id || '').slice(-8), 28) || '—';
  const amount = formatSmsAmount(order?.total);
  return { VAR1: name, VAR2: orderRef, VAR3: amount };
}

function applyTemplateVars(templateBody, vars) {
  return String(templateBody)
    .replace(/\{#VAR1#\}/gi, vars.VAR1)
    .replace(/\{#VAR2#\}/gi, vars.VAR2)
    .replace(/\{#VAR3#\}/gi, vars.VAR3);
}

function isOrderEligibleForConfirmationSms(order) {
  if (!order || order.status === 'cancelled') return false;

  if (order.paymentMethod === 'cod') {
    return ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status);
  }

  if (order.paymentMethod === 'online') {
    return order.paymentStatus === 'paid' && order.status !== 'created';
  }

  return false;
}

async function post2FactorTsms(formFields) {
  const url = `${TWOFACTOR_BASE_URL}/${encodeURIComponent(TWOFACTOR_API_KEY)}/ADDON_SERVICES/SEND/TSMS`;
  const body = new URLSearchParams(formFields);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORDER_SMS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Leira-Backend/1.0',
      },
      body: body.toString(),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    const status = String(data?.Status || data?.status || '').toLowerCase();
    const ok = response.ok && status === 'success';

    return {
      ok,
      message: data?.Details || data?.details || (ok ? 'SMS sent' : 'SMS send failed'),
      providerResponse: data,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function sendOrderConfirmationVia2Factor(phone, vars) {
  const templatePayload = {
    From: TWOFACTOR_ORDER_SENDER_ID,
    To: phone,
    TemplateName: TWOFACTOR_ORDER_TEMPLATE,
    VAR1: vars.VAR1,
    VAR2: vars.VAR2,
    VAR3: vars.VAR3,
  };

  const templateResult = await post2FactorTsms(templatePayload);
  if (templateResult.ok) {
    return { ...templateResult, mode: 'template' };
  }

  const msg = applyTemplateVars(ORDER_SMS_FALLBACK_BODY, vars);
  const msgResult = await post2FactorTsms({
    From: TWOFACTOR_ORDER_SENDER_ID,
    To: phone,
    Msg: msg,
  });

  if (msgResult.ok) {
    return { ...msgResult, mode: 'msg-fallback' };
  }

  return {
    ok: false,
    message: msgResult.message || templateResult.message || 'Order SMS failed',
    providerResponse: msgResult.providerResponse || templateResult.providerResponse,
    mode: 'failed',
  };
}

/**
 * Best-effort order confirmation SMS. Never throws — safe after checkout.
 * Idempotent: skips if already sent unless { force: true }.
 */
async function attemptOrderConfirmationSms(order, { force = false } = {}) {
  if (!order?._id) {
    return { sent: false, skipped: true, reason: 'Order not found' };
  }

  if (!hasOrderSmsConfig()) {
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        orderConfirmationSms: {
          ...(order.orderConfirmationSms || {}),
          status: 'skipped',
          lastError: 'Order SMS is not configured',
          lastAttemptAt: new Date(),
        },
      },
    });
    return { sent: false, skipped: true, reason: 'Order SMS is not configured' };
  }

  if (!isOrderEligibleForConfirmationSms(order)) {
    return { sent: false, skipped: true, reason: 'Order not eligible for confirmation SMS' };
  }

  const phone = normalizeIndianPhone(order?.customer?.phone);
  if (!phone) {
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        orderConfirmationSms: {
          ...(order.orderConfirmationSms || {}),
          status: 'skipped',
          lastError: 'Customer phone missing',
          lastAttemptAt: new Date(),
        },
      },
    });
    return { sent: false, skipped: true, reason: 'Customer phone missing' };
  }

  if (!force && order.orderConfirmationSms?.status === 'sent') {
    return { sent: true, skipped: true, reason: 'Already sent' };
  }

  const claimFilter = {
    _id: order._id,
    ...(force ? {} : { 'orderConfirmationSms.status': { $ne: 'sent' } }),
  };

  const claimed = await Order.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        'orderConfirmationSms.status': 'pending',
        'orderConfirmationSms.lastAttemptAt': new Date(),
        'orderConfirmationSms.lastError': '',
      },
      $inc: { 'orderConfirmationSms.attempts': 1 },
    },
    { new: true }
  );

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'Already sent or in progress' };
  }

  const vars = buildTemplateVars(claimed);

  try {
    const result = await sendOrderConfirmationVia2Factor(phone, vars);

    if (result.ok) {
      await Order.findByIdAndUpdate(claimed._id, {
        $set: {
          orderConfirmationSms: {
            ...(claimed.orderConfirmationSms || {}),
            status: 'sent',
            sentAt: new Date(),
            lastError: '',
            providerMode: result.mode,
            templateName: TWOFACTOR_ORDER_TEMPLATE,
          },
        },
      });
      return { sent: true, skipped: false, mode: result.mode };
    }

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        orderConfirmationSms: {
          ...(claimed.orderConfirmationSms || {}),
          status: 'failed',
          lastError: String(result.message || 'SMS failed').slice(0, 500),
          providerMode: result.mode,
        },
      },
    });
    return { sent: false, skipped: false, error: result.message };
  } catch (error) {
    const message =
      error?.name === 'AbortError' ? 'Order SMS request timed out' : error?.message || 'Order SMS failed';

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        orderConfirmationSms: {
          ...(claimed.orderConfirmationSms || {}),
          status: 'failed',
          lastError: String(message).slice(0, 500),
        },
      },
    });
    return { sent: false, skipped: false, error: message };
  }
}

module.exports = {
  hasOrderSmsConfig,
  normalizeIndianPhone,
  isOrderEligibleForConfirmationSms,
  attemptOrderConfirmationSms,
};
