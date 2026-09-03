const Order = require('../models/Order');
const { normalizeWhatsAppTo } = require('./whatsappClient');
const {
  getDeliveredTemplateConfig,
  formatReceiver,
  sendOrderDeliveredTemplate,
} = require('./whatsappTemplateCampaignClient');

const TEMPLATE_LABEL = 'order_delivered_0001';

function truncate(value, maxLen) {
  const t = String(value || '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function resolveCustomerPhoneRaw(order) {
  return (
    String(order?.customer?.phone || '').trim() ||
    String(order?.shippingAddress?.phone || '').trim() ||
    ''
  );
}

/**
 * Best-effort WhatsApp when admin marks order as delivered.
 * Template: order_delivered_0001 — Hi {{1}}, Your {{2}} has been delivered.
 */
async function attemptOrderDeliveredWhatsApp(order, { force = false } = {}) {
  const cfg = getDeliveredTemplateConfig();
  if (!cfg.configured) {
    return { sent: false, skipped: true, reason: 'Delivered WhatsApp template not configured' };
  }
  if (!order || order.status === 'cancelled') {
    return { sent: false, skipped: true, reason: 'Order not eligible' };
  }
  if (order.status !== 'delivered' && !force) {
    return { sent: false, skipped: true, reason: 'Order is not delivered' };
  }

  const phoneRaw = resolveCustomerPhoneRaw(order);
  const receiver = formatReceiver(phoneRaw, cfg.receiverFormat);
  if (!receiver || !normalizeWhatsAppTo(phoneRaw)) {
    return { sent: false, skipped: true, reason: 'No customer phone' };
  }

  if (!force && order?.orderDeliveredWhatsApp?.status === 'sent') {
    return { sent: false, skipped: true, reason: 'Already sent' };
  }

  const claimFilter = {
    _id: order._id,
    ...(force ? {} : { 'orderDeliveredWhatsApp.status': { $ne: 'sent' } }),
  };

  const claimed = await Order.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        'orderDeliveredWhatsApp.status': 'pending',
        'orderDeliveredWhatsApp.lastAttemptAt': new Date(),
        'orderDeliveredWhatsApp.lastError': '',
        'orderDeliveredWhatsApp.to': receiver,
      },
      $inc: { 'orderDeliveredWhatsApp.attempts': 1 },
    },
    { new: true }
  );

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'Already sent or in progress' };
  }

  const name = truncate(claimed?.customer?.name || 'Customer', 40) || 'Customer';
  const orderRef =
    truncate(claimed?.orderNumber || String(claimed?._id || '').slice(-8), 32) || '—';

  try {
    const result = await sendOrderDeliveredTemplate({
      phone: phoneRaw,
      name,
      orderNumber: orderRef,
    });

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        orderDeliveredWhatsApp: {
          ...(claimed.orderDeliveredWhatsApp?.toObject?.() ||
            claimed.orderDeliveredWhatsApp ||
            {}),
          status: 'sent',
          sentAt: new Date(),
          lastError: '',
          templateName: cfg.templateName || TEMPLATE_LABEL,
          providerMode: 'lms_template',
          messageId: String(result?.data?.message_id || result?.data?.id || ''),
          to: result.receiver || receiver,
        },
      },
    });

    return { sent: true, skipped: false, receiver: result.receiver };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'WhatsApp request timed out'
        : error?.message || 'WhatsApp delivered template failed';

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        'orderDeliveredWhatsApp.status': 'failed',
        'orderDeliveredWhatsApp.lastError': String(message).slice(0, 500),
        'orderDeliveredWhatsApp.templateName': cfg.templateName || TEMPLATE_LABEL,
        'orderDeliveredWhatsApp.providerMode': 'lms_template',
      },
    });

    console.error('[WhatsApp] order delivered failed:', message);
    return { sent: false, skipped: false, error: message };
  }
}

module.exports = {
  attemptOrderDeliveredWhatsApp,
};
