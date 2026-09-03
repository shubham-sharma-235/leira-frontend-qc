const mongoose = require('mongoose');

const homeComboItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: 240,
    },
    /** Hero / card image (upload path or URL) — same role as a product’s main image */
    image: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    /** Display price on card (e.g. ₹2,999) */
    price: {
      type: String,
      trim: true,
      default: '',
      maxlength: 64,
    },
    /** MRP / list price for strikethrough when higher than price */
    originalPrice: {
      type: String,
      trim: true,
      default: '',
      maxlength: 64,
    },
    /** Optional: one catalog product for cart, wishlist, and “View details” (same as shop cards) */
    linkProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
  },
  { _id: false }
);

const homeComboConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      trim: true,
    },
    sectionTitle: {
      type: String,
      trim: true,
      default: 'Leira Signature Sets',
      maxlength: 160,
    },
    sectionSubtitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: 320,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    combos: {
      type: [homeComboItemSchema],
      default: [],
      validate: {
        validator(arr) {
          return !arr || arr.length <= 3;
        },
        message: 'Maximum 3 combos allowed',
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomeComboConfig', homeComboConfigSchema);
