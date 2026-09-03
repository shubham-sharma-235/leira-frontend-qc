const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { attemptEshipzSync } = require('../services/eshipzService');
const { attemptOrderConfirmationSms } = require('../services/orderSmsService');
const { attemptOrderConfirmationWhatsApp } = require('../services/orderWhatsAppService');
const { attemptOrderShippedWhatsApp } = require('../services/orderShippedWhatsAppService');
const { attemptOrderDeliveredWhatsApp } = require('../services/orderDeliveredWhatsAppService');

const ADMIN_STATUSES = ['created', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const CUSTOMER_CANCELLABLE_STATUSES = ['created', 'confirmed'];
const ORDER_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

function getCustomerCancelEligibility(order) {
  if (order.status === 'cancelled') {
    return { ok: false, message: 'This order is already cancelled.' };
  }
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    return {
      ok: false,
      message: 'This order can no longer be cancelled because it is being processed or has shipped.',
    };
  }
  const createdAt = new Date(order.createdAt).getTime();
  if (!Number.isFinite(createdAt)) {
    return { ok: false, message: 'Unable to verify order time.' };
  }
  if (Date.now() - createdAt >= ORDER_CANCEL_WINDOW_MS) {
    return {
      ok: false,
      message: 'Cancellation is only available within 24 hours of placing the order.',
    };
  }
  return { ok: true };
}

async function decrementStock(items = []) {
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

async function restoreStock(items = []) {
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const p = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: qty } },
      { new: true }
    );
    if (p && Number(p.stock || 0) > 0 && p.status !== 'active') {
      p.status = 'active';
      await p.save();
    }
  }
}

// @desc    Get my orders
// @route   GET /api/orders/my
// @access  Private (customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.product', select: 'name images folderPath id' });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
};

// @desc    Cancel my order (within 24 hours, before dispatch)
// @route   PATCH /api/orders/my/:id/cancel
// @access  Private (customer)
exports.cancelMyOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const eligibility = getCustomerCancelEligibility(order);
    if (!eligibility.ok) {
      return res.status(400).json({ success: false, message: eligibility.message });
    }

    const shouldRestoreStock =
      order.paymentMethod === 'cod' || order.paymentStatus === 'paid';

    if (shouldRestoreStock) {
      await restoreStock(order.items);
    }

    if (order.paymentMethod === 'online' && order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    } else if (order.paymentMethod === 'online') {
      order.paymentStatus = 'failed';
    } else if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'failed';
    }

    order.status = 'cancelled';
    await order.save();

    const refundNote =
      order.paymentMethod === 'online' && order.paymentStatus === 'refunded'
        ? ' If you paid online, your refund will be processed to the original payment method as per bank timelines.'
        : '';

    return res.status(200).json({
      success: true,
      data: order,
      message: `Order cancelled successfully.${refundNote}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message,
    });
  }
};

// @desc    Get my order by id
// @route   GET /api/orders/my/:id
// @access  Private (customer)
exports.getMyOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate({ path: 'items.product', select: 'name images folderPath id' });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
};

// @desc    Track my order by order number or id
// @route   GET /api/orders/my/track/:query
// @access  Private (customer)
exports.trackMyOrder = async (req, res) => {
  try {
    const query = String(req.params.query || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, message: 'Tracking id is required' });
    }

    const conditions = [{ orderNumber: query }];
    if (mongoose.Types.ObjectId.isValid(query)) {
      conditions.push({ _id: query });
    }

    const order = await Order.findOne({ user: req.user.id, $or: conditions })
      .populate({ path: 'items.product', select: 'name images folderPath id' });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error tracking order', error: error.message });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin
// @access  Private/Admin
exports.getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || '').trim();
    const paymentStatus = String(req.query.paymentStatus || '').trim();
    const q = String(req.query.q || '').trim();

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (q) {
      filter.$or = [
        { orderNumber: new RegExp(q, 'i') },
        { couponCode: new RegExp(q, 'i') },
        { 'customer.name': new RegExp(q, 'i') },
        { 'customer.email': new RegExp(q, 'i') },
      ];
    }

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'user', select: 'name email phone' })
        .populate({ path: 'items.product', select: 'name images folderPath id' }),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching admin orders', error: error.message });
  }
};

// @desc    Update order status (admin)
// @route   PATCH /api/orders/admin/:id/status
// @access  Private/Admin
exports.updateAdminOrderStatus = async (req, res) => {
  try {
    const nextStatus = String(req.body?.status || '').trim();
    if (!ADMIN_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'cancelled' && nextStatus !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled order cannot be moved to another status' });
    }
    if (order.status === 'delivered' && nextStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Delivered order cannot be moved to another status' });
    }

    if (nextStatus === 'cancelled' && order.status !== 'cancelled') {
      await restoreStock(order.items);
      if (order.paymentMethod === 'online' && order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      } else if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'failed';
      }
    }

    const previousStatus = order.status;
    const pickupLocation =
      String(req.body?.pickupLocation || req.body?.pickup_location || '').trim() || undefined;

    order.status = nextStatus;
    await order.save();

    // Admin marked shipped → pickup-ready WhatsApp (LMS template). Best-effort.
    if (nextStatus === 'shipped' && previousStatus !== 'shipped') {
      await attemptOrderShippedWhatsApp(order, { pickupLocation });
    }

    // Admin marked delivered → delivery WhatsApp (LMS template). Best-effort.
    if (nextStatus === 'delivered' && previousStatus !== 'delivered') {
      await attemptOrderDeliveredWhatsApp(order);
    }

    const refreshed = await Order.findById(order._id)
      .populate({ path: 'user', select: 'name email phone' })
      .populate({ path: 'items.product', select: 'name images folderPath id' });

    return res.status(200).json({
      success: true,
      data: refreshed || order,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
  }
};

// @desc    Delete order (admin)
// @route   DELETE /api/orders/admin/:id
// @access  Private/Admin
exports.deleteAdminOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await Order.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting order', error: error.message });
  }
};

// @desc    Manually mark online order as paid after Razorpay check (admin)
// @route   PATCH /api/orders/admin/:id/mark-paid
// @access  Private/Admin
exports.markAdminOrderPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentMethod !== 'online') {
      return res.status(400).json({
        success: false,
        message: 'Only online (Razorpay) orders can be marked as paid manually',
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Order is already marked as paid',
        skipped: true,
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled orders cannot be marked as paid',
      });
    }

    if (order.paymentStatus === 'failed' || order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark a ${order.paymentStatus} payment as paid`,
      });
    }

    const razorpayPaymentId = String(req.body?.razorpayPaymentId || '').trim();
    if (razorpayPaymentId && !order.razorpayPaymentId) {
      order.razorpayPaymentId = razorpayPaymentId;
    }

    await decrementStock(order.items);

    order.paymentStatus = 'paid';
    if (order.status === 'created') {
      order.status = 'confirmed';
    }
    await order.save();

    if (order.couponCode) {
      await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 } });
    }
    if (order.reviewRewardCouponCode) {
      await Coupon.findOneAndUpdate(
        { code: order.reviewRewardCouponCode },
        { $inc: { usedCount: 1 } }
      );
    }

    if (order.eshipz?.syncStatus !== 'synced') {
      await attemptEshipzSync(order);
    }

    await attemptOrderConfirmationSms(order);
    await attemptOrderConfirmationWhatsApp(order);

    const refreshedOrder = await Order.findById(req.params.id)
      .populate({ path: 'user', select: 'name email phone' })
      .populate({ path: 'items.product', select: 'name images folderPath id' });

    return res.status(200).json({
      success: true,
      data: refreshedOrder,
      message: 'Order marked as paid',
    });
  } catch (error) {
    const isStock = /stock is no longer available/i.test(String(error.message || ''));
    return res.status(isStock ? 400 : 500).json({
      success: false,
      message: isStock ? error.message : 'Error marking order as paid',
      error: error.message,
    });
  }
};

// @desc    Retry order confirmation SMS (admin)
// @route   PATCH /api/orders/admin/:id/order-sms
// @access  Private/Admin
exports.retryAdminOrderSms = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderConfirmationSms?.status === 'sent') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Order confirmation SMS already sent',
        skipped: true,
      });
    }

    const result = await attemptOrderConfirmationSms(order, { force: true });
    const refreshedOrder = await Order.findById(req.params.id);

    if (result.sent) {
      return res.status(200).json({
        success: true,
        data: refreshedOrder,
        message: 'Order confirmation SMS sent',
      });
    }

    return res.status(200).json({
      success: false,
      data: refreshedOrder,
      message: result.reason || result.error || 'Could not send order confirmation SMS',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending order confirmation SMS',
      error: error.message,
    });
  }
};

// @desc    Retry order confirmation WhatsApp (admin)
// @route   PATCH /api/orders/admin/:id/order-whatsapp
// @access  Private/Admin
exports.retryAdminOrderWhatsApp = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderConfirmationWhatsApp?.status === 'sent') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Order confirmation WhatsApp already sent',
        skipped: true,
      });
    }

    const result = await attemptOrderConfirmationWhatsApp(order, { force: true });
    const refreshedOrder = await Order.findById(req.params.id);

    if (result.sent) {
      return res.status(200).json({
        success: true,
        data: refreshedOrder,
        message: 'Order confirmation WhatsApp sent',
      });
    }

    return res.status(200).json({
      success: false,
      data: refreshedOrder,
      message: result.reason || result.error || 'Could not send order confirmation WhatsApp',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending order confirmation WhatsApp',
      error: error.message,
    });
  }
};

// @desc    Retry shipped / pickup-ready WhatsApp (admin)
// @route   PATCH /api/orders/admin/:id/order-shipped-whatsapp
// @access  Private/Admin
exports.retryAdminOrderShippedWhatsApp = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: 'Order must be shipped before sending pickup WhatsApp',
      });
    }

    if (order.orderShippedWhatsApp?.status === 'sent') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Shipped WhatsApp already sent',
        skipped: true,
      });
    }

    const pickupLocation =
      String(req.body?.pickupLocation || req.body?.pickup_location || '').trim() || undefined;
    const result = await attemptOrderShippedWhatsApp(order, {
      force: true,
      pickupLocation,
    });
    const refreshedOrder = await Order.findById(req.params.id);

    if (result.sent) {
      return res.status(200).json({
        success: true,
        data: refreshedOrder,
        message: 'Shipped WhatsApp sent',
      });
    }

    return res.status(200).json({
      success: false,
      data: refreshedOrder,
      message: result.reason || result.error || 'Could not send shipped WhatsApp',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending shipped WhatsApp',
      error: error.message,
    });
  }
};

// @desc    Retry delivered WhatsApp (admin)
// @route   PATCH /api/orders/admin/:id/order-delivered-whatsapp
// @access  Private/Admin
exports.retryAdminOrderDeliveredWhatsApp = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered before sending delivered WhatsApp',
      });
    }

    if (order.orderDeliveredWhatsApp?.status === 'sent') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Delivered WhatsApp already sent',
        skipped: true,
      });
    }

    const result = await attemptOrderDeliveredWhatsApp(order, { force: true });
    const refreshedOrder = await Order.findById(req.params.id);

    if (result.sent) {
      return res.status(200).json({
        success: true,
        data: refreshedOrder,
        message: 'Delivered WhatsApp sent',
      });
    }

    return res.status(200).json({
      success: false,
      data: refreshedOrder,
      message: result.reason || result.error || 'Could not send delivered WhatsApp',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error sending delivered WhatsApp',
      error: error.message,
    });
  }
};

// @desc    Retry eShipz sync (admin)
// @route   PATCH /api/orders/admin/:id/eshipz-sync
// @access  Private/Admin
exports.retryAdminEshipzSync = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Production safety: don't retry if we already consider the order synced.
    // Retrying on synced orders can create "-clone" duplicates in eShipz.
    if (order.eshipz?.syncStatus === 'synced') {
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Order already synced to eShipz',
        skipped: true,
      });
    }

    const result = await attemptEshipzSync(order, { force: true });
    const refreshedOrder = await Order.findById(req.params.id);

    if (result.synced) {
      return res.status(200).json({
        success: true,
        data: refreshedOrder,
        message: 'Order synced to eShipz successfully',
      });
    }

    return res.status(200).json({
      success: false,
      data: refreshedOrder,
      message: result.reason || result.error || 'Could not sync order to eShipz',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error syncing order to eShipz',
      error: error.message,
    });
  }
};

