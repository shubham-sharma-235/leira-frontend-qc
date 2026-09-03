const Order = require('../models/Order');
const { normalizeWhatsAppTo } = require('./whatsappClient');
const {
  getShippedTemplateConfig,
  formatReceiver,
  sendOrderPickupTemplate,
} = require('./whatsappTemplateCampaignClient');

const TEMPLATE_LABEL = 'order_pick_up_no_cta_4';

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
 * Best-effort WhatsApp when admin marks order as shipped (pickup ready).
 * Template: order_pick_up_no_cta_4 — Hello {{1}}, order {{2}} ready for pickup at {{3}}.
 */
async function attemptOrderShippedWhatsApp(order, { force = false, pickupLocation } = {}) {
  const cfg = getShippedTemplateConfig();
  if (!cfg.configured) {
    return { sent: false, skipped: true, reason: 'Shipped WhatsApp template not configured' };
  }
  if (!order || order.status === 'cancelled') {
    return { sent: false, skipped: true, reason: 'Order not eligible' };
  }
  if (order.status !== 'shipped' && !force) {
    return { sent: false, skipped: true, reason: 'Order is not shipped' };
  }

  const phoneRaw = resolveCustomerPhoneRaw(order);
  const receiver = formatReceiver(phoneRaw, cfg.receiverFormat);
  if (!receiver || !normalizeWhatsAppTo(phoneRaw)) {
    return { sent: false, skipped: true, reason: 'No customer phone' };
  }

  if (!force && order?.orderShippedWhatsApp?.status === 'sent') {
    return { sent: false, skipped: true, reason: 'Already sent' };
  }

  const claimFilter = {
    _id: order._id,
    ...(force ? {} : { 'orderShippedWhatsApp.status': { $ne: 'sent' } }),
  };

  const claimed = await Order.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        'orderShippedWhatsApp.status': 'pending',
        'orderShippedWhatsApp.lastAttemptAt': new Date(),
        'orderShippedWhatsApp.lastError': '',
        'orderShippedWhatsApp.to': receiver,
      },
      $inc: { 'orderShippedWhatsApp.attempts': 1 },
    },
    { new: true }
  );

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'Already sent or in progress' };
  }

  const name = truncate(claimed?.customer?.name || 'Customer', 40) || 'Customer';
  const orderRef =
    truncate(claimed?.orderNumber || String(claimed?._id || '').slice(-8), 32) || '—';
  const location = truncate(
    pickupLocation || cfg.pickupLocation || 'Leira pickup point',
    80
  );

  try {
    const result = await sendOrderPickupTemplate({
      phone: phoneRaw,
      name,
      orderNumber: orderRef,
      pickupLocation: location,
    });

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        orderShippedWhatsApp: {
          ...(claimed.orderShippedWhatsApp?.toObject?.() ||
            claimed.orderShippedWhatsApp ||
            {}),
          status: 'sent',
          sentAt: new Date(),
          lastError: '',
          templateName: cfg.templateName || TEMPLATE_LABEL,
          providerMode: 'lms_template',
          messageId: String(result?.data?.message_id || result?.data?.id || ''),
          to: result.receiver || receiver,
          pickupLocation: location,
        },
      },
    });

    return { sent: true, skipped: false, receiver: result.receiver };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'WhatsApp request timed out'
        : error?.message || 'WhatsApp shipped template failed';

    await Order.findByIdAndUpdate(claimed._id, {
      $set: {
        'orderShippedWhatsApp.status': 'failed',
        'orderShippedWhatsApp.lastError': String(message).slice(0, 500),
        'orderShippedWhatsApp.templateName': cfg.templateName || TEMPLATE_LABEL,
        'orderShippedWhatsApp.providerMode': 'lms_template',
      },
    });

    console.error('[WhatsApp] order shipped failed:', message);
    return { sent: false, skipped: false, error: message };
  }
}

module.exports = {
  attemptOrderShippedWhatsApp,
};
