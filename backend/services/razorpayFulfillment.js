const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { attemptEshipzSync } = require('./eshipzService');

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Payment gateway is not configured');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expected === razorpaySignature;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

/** Find a captured payment for a Razorpay order id (server-side truth). */
async function findCapturedPaymentForRzpOrder(razorpayOrderId) {
  if (!razorpayOrderId) return null;
  const razorpay = getRazorpayClient();
  const list = await razorpay.orders.fetchPayments(razorpayOrderId);
  const items = list?.items || [];
  const captured = items.filter((p) => p.status === 'captured');
  if (captured.length === 0) return null;
  captured.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  return captured[0];
}

async function assertPaymentMatchesOrder(order, paymentEntity) {
  const paymentId = paymentEntity?.id;
  const orderId = paymentEntity?.order_id;
  if (!paymentId || !orderId) {
    throw new Error('Invalid payment payload');
  }
  if (String(order.razorpayOrderId) !== String(orderId)) {
    throw new Error('Razorpay order mismatch');
  }
  if (paymentEntity.status !== 'captured') {
    throw new Error(`Payment not captured (status: ${paymentEntity.status})`);
  }
  const expectedPaise = Math.round(Number(order.total || 0) * 100);
  const paidPaise = Number(paymentEntity.amount || 0);
  if (expectedPaise > 0 && paidPaise > 0 && paidPaise !== expectedPaise) {
    throw new Error('Payment amount does not match order total');
  }
  return paymentId;
}

async function decrementStock(items) {
  const Product = require('../models/Product');
  for (const item of items) {
    const result = await Product.findOneAndUpdate(
      {
        _id: item.product,
        status: 'active',
        stock: { $gte: item.quantity },
      },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!result) {
      throw new Error(`Stock is no longer available for ${item.name}`);
    }
    if (Number(result.stock ?? 0) <= 0) {
      result.status = 'inactive';
      await result.save();
    }
  }
}

async function incrementCouponUsage(order) {
  if (order.couponCode) {
    await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }
  if (order.reviewRewardCouponCode) {
    await Coupon.findOneAndUpdate({ code: order.reviewRewardCouponCode }, { $inc: { usedCount: 1 } });
  }
}

async function clearUserCart(userId) {
  const user = await User.findById(userId);
  if (user) {
    user.cart = [];
    await user.save();
  }
}

/**
 * Idempotent: mark online order paid, decrement stock once, sync eShipz.
 * @returns {{ order, alreadyPaid: boolean, source: string }}
 */
async function finalizeOnlineOrderPaid(order, {
  razorpayPaymentId,
  razorpaySignature = '',
  source = 'verify',
  skipSignatureCheck = false,
} = {}) {
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.paymentMethod !== 'online') {
    throw new Error('Not an online payment order');
  }

  if (order.paymentStatus === 'paid') {
    return { order, alreadyPaid: true, source };
  }

  if (order.status === 'cancelled') {
    order.status = 'confirmed';
  }

  let paymentId = razorpayPaymentId;
  if (!paymentId && order.razorpayOrderId) {
    const captured = await findCapturedPaymentForRzpOrder(order.razorpayOrderId);
    paymentId = captured?.id || '';
  }

  if (!paymentId) {
    throw new Error('No captured payment found for this order');
  }

  if (!skipSignatureCheck && razorpaySignature) {
    const valid = verifyCheckoutSignature(
      order.razorpayOrderId,
      paymentId,
      razorpaySignature
    );
    if (!valid) {
      throw new Error('Payment signature verification failed');
    }
  } else if (!skipSignatureCheck && !razorpaySignature) {
    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(paymentId);
    await assertPaymentMatchesOrder(order, payment);
  }

  await decrementStock(order.items);

  order.razorpayPaymentId = paymentId;
  if (razorpaySignature) {
    order.razorpaySignature = razorpaySignature;
  }
  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  order.paymentConfirmedAt = order.paymentConfirmedAt || new Date();
  order.paymentConfirmedVia = order.paymentConfirmedVia || source;
  await order.save();

  await incrementCouponUsage(order);
  await clearUserCart(order.user);

  await attemptEshipzSync(order);

  return { order, alreadyPaid: false, source };
}

/** Reconcile a local order against Razorpay (webhook miss, verify fail, admin). */
async function reconcileOrderPayment(order, { source = 'reconcile' } = {}) {
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.paymentMethod !== 'online') {
    throw new Error('Not an online payment order');
  }
  if (order.paymentStatus === 'paid') {
    return { order, alreadyPaid: true, source };
  }
  if (!order.razorpayOrderId) {
    throw new Error('Order has no Razorpay order id');
  }

  const captured = await findCapturedPaymentForRzpOrder(order.razorpayOrderId);
  if (!captured) {
    return { order, alreadyPaid: false, source, pending: true };
  }

  await assertPaymentMatchesOrder(order, captured);

  return finalizeOnlineOrderPaid(order, {
    razorpayPaymentId: captured.id,
    source,
    skipSignatureCheck: true,
  });
}

module.exports = {
  getRazorpayClient,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  findCapturedPaymentForRzpOrder,
  finalizeOnlineOrderPaid,
  reconcileOrderPayment,
  assertPaymentMatchesOrder,
};
