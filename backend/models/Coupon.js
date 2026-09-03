const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['percent', 'fixed'],
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxUses: {
    type: Number,
    default: 0,
    min: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  validFrom: {
    type: Date,
    default: null,
  },
  validUntil: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isLoginPromo: {
    type: Boolean,
    default: false,
  },
  assignedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rewardSource: {
    type: String,
    enum: ['review', 'none'],
    default: 'none',
  },
  rewardReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null,
  },
  showInDropdown: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ isLoginPromo: 1 });
couponSchema.index({ assignedUser: 1, isActive: 1 });
couponSchema.index({ rewardReview: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
