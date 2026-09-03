const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    billingAddress: {
      address: { type: String, default: '' },
      state: { type: String, default: '' },
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    shippingAddress: {
      address: { type: String, default: '' },
      state: { type: String, default: '' },
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    items: { type: [orderItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String, default: '' },
    reviewRewardCouponCode: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentStatus: { type: String, enum: ['created', 'paid', 'failed', 'pending', 'refunded'], default: 'created' },
    status: { type: String, enum: ['created', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'created' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    paymentConfirmedAt: { type: Date },
    paymentConfirmedVia: {
      type: String,
      enum: ['verify', 'webhook', 'reconcile', 'abandon_recovery', 'admin_reconcile'],
      default: undefined,
    },
    eshipz: {
      syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed', 'skipped'],
        default: 'pending',
      },
      attempts: { type: Number, default: 0, min: 0 },
      externalOrderId: { type: String, default: '' },
      lastSyncedAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
    },
    orderConfirmationSms: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
      },
      attempts: { type: Number, default: 0, min: 0 },
      sentAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
      templateName: { type: String, default: '' },
      providerMode: { type: String, default: '' },
    },
    orderConfirmationWhatsApp: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
      },
      attempts: { type: Number, default: 0, min: 0 },
      sentAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
      templateName: { type: String, default: '' },
      providerMode: { type: String, default: '' },
      messageId: { type: String, default: '' },
      to: { type: String, default: '' },
    },
    orderShippedWhatsApp: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
      },
      attempts: { type: Number, default: 0, min: 0 },
      sentAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
      templateName: { type: String, default: '' },
      providerMode: { type: String, default: '' },
      messageId: { type: String, default: '' },
      to: { type: String, default: '' },
      pickupLocation: { type: String, default: '' },
    },
    orderDeliveredWhatsApp: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
      },
      attempts: { type: Number, default: 0, min: 0 },
      sentAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
      templateName: { type: String, default: '' },
      providerMode: { type: String, default: '' },
      messageId: { type: String, default: '' },
      to: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
