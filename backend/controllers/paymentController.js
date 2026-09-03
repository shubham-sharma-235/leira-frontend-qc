const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { attemptEshipzSync } = require('../services/eshipzService');
const { attemptOrderConfirmationSms } = require('../services/orderSmsService');
const { attemptOrderConfirmationWhatsApp } = require('../services/orderWhatsAppService');
const ONLINE_PAYMENT_DISCOUNT_PERCENT = 5;

function generateOrderNumber() {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(100 + Math.random() * 900);
  return `LR-${ts}-${rand}`;
}

function parsePrice(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value).replace(/,/g, '').replace(/[^0-9.]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function isAddressComplete(address = {}) {
  const a = String(address.address || '').trim();
  const s = String(address.state || '').trim();
  const c = String(address.city || '').trim();
  const p = String(address.pincode || '').trim();
  return !!a && !!s && !!c && /^\d{6}$/.test(p);
}

async function buildCheckoutFromCart(userId, couponCode) {
  const user = await User.findById(userId).populate({
    path: 'cart.product',
    select: 'name price status stock',
  });
  if (!user) {
    return { error: { code: 404, message: 'User not found' } };
  }
  if (!user.cart || user.cart.length === 0) {
    return { error: { code: 400, message: 'Cart is empty' } };
  }
  if (!String(user.name || '').trim()) {
    return { error: { code: 400, message: 'Please update your profile name before placing order' } };
  }
  if (!/^\d{10}$/.test(String(user.phone || '').replace(/\D/g, ''))) {
    return { error: { code: 400, message: 'Please add a valid 10-digit phone number before placing order' } };
  }
  if (!isAddressComplete(user.billingAddress || {})) {
    return { error: { code: 400, message: 'Please complete billing address before placing order' } };
  }
  if (!isAddressComplete(user.shippingAddress || {})) {
    return { error: { code: 400, message: 'Please complete shipping address before placing order' } };
  }

  const items = [];
  let subtotal = 0;

  for (const line of user.cart) {
    const p = line.product;
    if (!p) continue;
    const qty = Math.max(1, Number(line.quantity || 1));
    const stock = Number(p.stock ?? 0);
    if (p.status === 'inactive' || stock <= 0) {
      return { error: { code: 400, message: `${p.name} is out of stock` } };
    }
    if (qty > stock) {
      return { error: { code: 400, message: `Only ${stock} item(s) left for ${p.name}` } };
    }
    const price = parsePrice(p.price);
    subtotal += price * qty;
    items.push({
      product: p._id,
      name: p.name,
      price,
      quantity: qty,
    });
  }

  if (items.length === 0) {
    return { error: { code: 400, message: 'Cart is empty' } };
  }

  let couponDiscount = 0;
  let reviewRewardDiscount = 0;
  let discount = 0;
  let appliedCoupon = null;
  let appliedReviewRewardCoupon = null;
  if (couponCode && typeof couponCode === 'string') {
    const code = couponCode.trim().toUpperCase();
    if (code) {
      const coupon = await Coupon.findOne({ code, isActive: true });
      if (!coupon) return { error: { code: 400, message: 'Invalid or expired coupon' } };
      if (coupon.rewardSource === 'review') {
        return { error: { code: 400, message: 'Review reward coupons are not available' } };
      }
        if (coupon.assignedUser && String(coupon.assignedUser) !== String(userId)) {
          return { error: { code: 400, message: 'This coupon is not available for this account' } };
        }
      const now = new Date();
      if (coupon.validFrom && now < coupon.validFrom) {
        return { error: { code: 400, message: 'This coupon is not yet valid' } };
      }
      if (coupon.validUntil && now > coupon.validUntil) {
        return { error: { code: 400, message: 'This coupon has expired' } };
      }
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        return { error: { code: 400, message: 'This coupon has reached its usage limit' } };
      }
      if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
        return { error: { code: 400, message: `Minimum order amount is ₹${coupon.minOrder}` } };
      }
      couponDiscount = coupon.type === 'percent'
        ? Math.round((subtotal * Math.min(coupon.value, 100)) / 100)
        : Math.min(coupon.value, subtotal);
      appliedCoupon = coupon;
    }
  }

  // Disabled: auto-apply review reward discount at checkout (restore block below to re-enable).
  // const reviewRewardCoupon = await Coupon.findOne({
  //   assignedUser: userId,
  //   rewardSource: 'review',
  //   isActive: true,
  // }).sort({ createdAt: -1 });
  //
  // if (reviewRewardCoupon) {
  //   const now = new Date();
  //   const withinStart = !reviewRewardCoupon.validFrom || now >= reviewRewardCoupon.validFrom;
  //   const withinEnd = !reviewRewardCoupon.validUntil || now <= reviewRewardCoupon.validUntil;
  //   const underLimit = !(reviewRewardCoupon.maxUses > 0 && reviewRewardCoupon.usedCount >= reviewRewardCoupon.maxUses);
  //   if (withinStart && withinEnd && underLimit) {
  //     const amountAfterCoupon = Math.max(0, subtotal - couponDiscount);
  //     reviewRewardDiscount = reviewRewardCoupon.type === 'percent'
  //       ? Math.round((amountAfterCoupon * Math.min(reviewRewardCoupon.value, 100)) / 100)
  //       : Math.min(reviewRewardCoupon.value, amountAfterCoupon);
  //     appliedReviewRewardCoupon = reviewRewardCoupon;
  //   }
  // }

  discount = couponDiscount + reviewRewardDiscount;
  const total = Math.max(0, subtotal - discount);
  return {
    user,
    items,
    subtotal,
    discount,
    couponDiscount,
    reviewRewardDiscount,
    total,
    appliedCoupon,
    appliedReviewRewardCoupon,
  };
}

async function decrementStock(items) {
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

// @desc    Create Razorpay order for online payment
// @route   POST /api/payments/online/order
// @access  Private (customer)
exports.createOnlineOrder = async (req, res) => {
  try {
    const { couponCode = '' } = req.body || {};
    const checkout = await buildCheckoutFromCart(req.user.id, couponCode);
    if (checkout.error) {
      return res.status(checkout.error.code).json({ success: false, message: checkout.error.message });
    }
    const amountAfterCoupon = Math.max(0, checkout.total);
    const onlinePaymentDiscount = Math.round((amountAfterCoupon * ONLINE_PAYMENT_DISCOUNT_PERCENT) / 100);
    const payableTotal = Math.max(0, amountAfterCoupon - onlinePaymentDiscount);

    if (payableTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Online payment amount must be greater than zero' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway is not configured' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(payableTotal * 100),
      currency: 'INR',
      receipt,
      notes: { userId: String(req.user.id) },
    });

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user.id,
      customer: {
        name: checkout.user.name || '',
        email: checkout.user.email || '',
        phone: checkout.user.phone || '',
      },
      billingAddress: checkout.user.billingAddress || {},
      shippingAddress: checkout.user.shippingAddress || {},
      items: checkout.items,
      subtotal: checkout.subtotal,
      discount: checkout.discount + onlinePaymentDiscount,
      total: payableTotal,
      couponCode: checkout.appliedCoupon?.code || '',
      reviewRewardCouponCode: checkout.appliedReviewRewardCoupon?.code || '',
      paymentMethod: 'online',
      paymentStatus: 'created',
      status: 'created',
      razorpayOrderId: rzpOrder.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        razorpayOrderId: rzpOrder.id,
        localOrderId: order._id,
        pricing: {
          subtotal: checkout.subtotal,
          couponDiscount: checkout.couponDiscount,
          reviewRewardDiscount: checkout.reviewRewardDiscount,
          onlinePaymentDiscount,
          total: payableTotal,
        },
        customer: {
          name: req.user.name || 'Customer',
          email: req.user.email || '',
          contact: req.user.phone || '',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating online order',
      error: error.message,
    });
  }
};

// @desc    Verify Razorpay payment and finalize order
// @route   POST /api/payments/online/verify
// @access  Private (customer)
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, localOrderId } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !localOrderId) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    const order = await Order.findOne({ _id: localOrderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, data: order, message: 'Order already paid' });
    }
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Order mismatch' });
    }

    await decrementStock(order.items);

    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    await order.save();

    if (order.couponCode) {
      await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 } });
    }
    if (order.reviewRewardCouponCode) {
      await Coupon.findOneAndUpdate({ code: order.reviewRewardCouponCode }, { $inc: { usedCount: 1 } });
    }

    const user = await User.findById(req.user.id);
    if (user) {
      user.cart = [];
      await user.save();
    }

    // Best-effort sync to eShipz. Order confirmation should not fail if shipment API is down.
    await attemptEshipzSync(order);

    // Best-effort order confirmation SMS (2Factor transactional template).
    await attemptOrderConfirmationSms(order);
    // Best-effort WhatsApp order confirmation (approved template).
    await attemptOrderConfirmationWhatsApp(order);

    return res.status(200).json({
      success: true,
      data: order,
      message: 'Payment verified and order confirmed',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying online payment',
      error: error.message,
    });
  }
};

// @desc    User closed Razorpay / abandoned checkout before paying
// @route   POST /api/payments/online/abandon
// @access  Private (customer)
exports.abandonOnlinePayment = async (req, res) => {
  try {
    const { localOrderId } = req.body || {};
    if (!localOrderId) {
      return res.status(400).json({ success: false, message: 'Missing order id' });
    }
    if (!mongoose.Types.ObjectId.isValid(localOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    const order = await Order.findOne({ _id: localOrderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.paymentMethod !== 'online') {
      return res.status(400).json({ success: false, message: 'Not an online payment order' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Order already paid', data: order });
    }

    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    await order.save();

    return res.status(200).json({ success: true, message: 'Payment not completed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error cancelling unpaid order',
      error: error.message,
    });
  }
};

// @desc    Place COD order
// @route   POST /api/payments/cod
// @access  Private (customer)
exports.placeCodOrder = async (req, res) => {
  try {
    const { couponCode = '' } = req.body || {};
    const checkout = await buildCheckoutFromCart(req.user.id, couponCode);
    if (checkout.error) {
      return res.status(checkout.error.code).json({ success: false, message: checkout.error.message });
    }

    await decrementStock(checkout.items);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user.id,
      customer: {
        name: checkout.user.name || '',
        email: checkout.user.email || '',
        phone: checkout.user.phone || '',
      },
      billingAddress: checkout.user.billingAddress || {},
      shippingAddress: checkout.user.shippingAddress || {},
      items: checkout.items,
      subtotal: checkout.subtotal,
      discount: checkout.discount,
      total: checkout.total,
      couponCode: checkout.appliedCoupon?.code || '',
      reviewRewardCouponCode: checkout.appliedReviewRewardCoupon?.code || '',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      status: 'confirmed',
    });

    if (checkout.appliedCoupon?.code) {
      await Coupon.findOneAndUpdate({ code: checkout.appliedCoupon.code }, { $inc: { usedCount: 1 } });
    }
    if (checkout.appliedReviewRewardCoupon?.code) {
      await Coupon.findOneAndUpdate({ code: checkout.appliedReviewRewardCoupon.code }, { $inc: { usedCount: 1 } });
    }

    checkout.user.cart = [];
    await checkout.user.save();

    // Best-effort sync to eShipz for COD as soon as order is confirmed.
    await attemptEshipzSync(order);

    // Best-effort order confirmation SMS.
    await attemptOrderConfirmationSms(order);
    await attemptOrderConfirmationWhatsApp(order);

    return res.status(201).json({
      success: true,
      data: order,
      message: 'COD order placed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error placing COD order',
      error: error.message,
    });
  }
};
