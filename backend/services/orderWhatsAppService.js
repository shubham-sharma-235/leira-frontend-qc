const Order = require('../models/Order');
const { normalizeWhatsAppTo } = require('./whatsappClient');
const {
  getOrderTemplateConfig,
  formatReceiver,
  sendOrderManagementTemplate,
} = require('./whatsappTemplateCampaignClient');

const ORDER_TEMPLATE_LABEL = 'order_management_4';

function truncate(value, maxLen) {
  const t = String(value || '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function buildOrderVars(order) {
  const name = truncate(order?.customer?.name || 'Customer', 40) || 'Customer';
  const orderRef = truncate(order?.orderNumber || String(order?._id || '').slice(-8), 32) || '—';
  return { name, orderRef };
}

function isOrderEligibleForWhatsApp(order) {
  if (!order || order.status === 'cancelled') return false;
  if (order.paymentMethod === 'cod') {
    return ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status);
  }
  if (order.paymentMethod === 'online') {
    return order.paymentStatus === 'paid' && order.status !== 'created';
  }
  return false;
}

function resolveCustomerPhoneRaw(order) {
  return (
    String(order?.customer?.phone || '').trim() ||
    String(order?.shippingAddress?.phone || '').trim() ||
    ''
  );
}

/**
 * Best-effort WhatsApp order confirmation via LMS template order_management_4.
 * Does not throw to callers.
 */
async function attemptOrderConfirmationWhatsApp(order, { force = false } = {}) {
  const cfg = getOrderTemplateConfig();
  if (!cfg.configured) {
    return { sent: false, skipped: true, reason: 'Order WhatsApp template not configured' };
  }
  if (!isOrderEligibleForWhatsApp(order)) {
    return { sent: false, skipped: true, reason: 'Order not eligible' };
  }

  const phoneRaw = resolveCustomerPhoneRaw(order);
  const receiver = formatReceiver(phoneRaw, cfg.receiverFormat);
  if (!receiver || !normalizeWhatsAppTo(phoneRaw)) {
    return { sent: false, skipped: true, reason: 'No customer phone' };
  }

  if (!force && order?.orderConfirmationWhatsApp?.status === 'sent') {
    return { sent: false, skipped: true, reason: 'Already sent' };
  }

  const claimFilter = {
    _id: order._id,
    ...(force ? {} : { 'orderConfirmationWhatsApp.status': { $ne: 'sent' } }),
  };

  const claimed = await Order.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        'orderConfirmationWhatsApp.status': 'pending',
        'orderConfirmationWhatsApp.lastAttemptAt': new Date(),
        'orderConfirmationWhatsApp.lastError': '',
        'orderConfirmationWhatsApp.to': receiver,
      },
      $inc: { 'orderConfirmationWhatsApp.attempts': 1 },
    },
    { new: true }
  );

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'Already sent or in progress' };
  }

  const vars = buildOrderVars(claimed);

  try {
    const result = await sendOrderManagementTemplate({
      phone: phoneRaw,
      name: vars.name,
      orderNumber: vars.orderRef,
    });

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        orderConfirmationWhatsApp: {
          ...(claimed.orderConfirmationWhatsApp?.toObject?.() ||
            claimed.orderConfirmationWhatsApp ||
            {}),
          status: 'sent',
          sentAt: new Date(),
          lastError: '',
          templateName: cfg.templateName || ORDER_TEMPLATE_LABEL,
          providerMode: 'lms_template',
          messageId: String(result?.data?.message_id || result?.data?.id || ''),
          to: result.receiver || receiver,
        },
      },
    });

    return {
      sent: true,
      skipped: false,
      mode: 'lms_template',
      receiver: result.receiver,
    };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'WhatsApp request timed out'
        : error?.message || 'WhatsApp order template failed';

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        'orderConfirmationWhatsApp.status': 'failed',
        'orderConfirmationWhatsApp.lastError': String(message).slice(0, 500),
        'orderConfirmationWhatsApp.templateName': cfg.templateName || ORDER_TEMPLATE_LABEL,
        'orderConfirmationWhatsApp.providerMode': 'lms_template',
      },
    });

    console.error('[WhatsApp] order confirmation failed:', message);
    return { sent: false, skipped: false, error: message };
  }
}

module.exports = {
  isOrderEligibleForWhatsApp,
  attemptOrderConfirmationWhatsApp,
  buildOrderVars,
};
