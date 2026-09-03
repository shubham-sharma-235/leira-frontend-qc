const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subName: {
    type: String,
    trim: true
  },
  /** Italic line under the title on /shop/[id] (product detail). Admin-controlled. */
  detailTagline: {
    type: String,
    trim: true,
    default: '',
  },
  price: {
    type: String,
    required: true
  },
  /** MRP / list price — shown struck-through on cards when higher than `price` */
  originalPrice: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    required: true
  },
  folderPath: {
    type: String,
    required: true
  },
  themeColor: {
    type: String,
    default: '#ec4899'
  },
  gradient: {
    type: String
  },
  features: [{
    type: String
  }],
  stats: [{
    label: String,
    val: String
  }],
  section1: {
    title: String,
    subtitle: String
  },
  section2: {
    title: String,
    subtitle: String
  },
  section3: {
    title: String,
    subtitle: String
  },
  section4: {
    title: String,
    subtitle: String
  },
  section5: {
    title: String,
    subtitle: String
  },
  introducingSection: {
    subtitle: String,
    title: String,
    paragraph1: String,
    paragraph2: String,
    bottleImage: String
  },
  detailsSection: {
    title: String,
    description: String,
    imageAlt: String
  },
  freshnessSection: {
    title: String,
    description: String
  },
  buyNowSection: {
    price: String,
    unit: String,
    processingParams: [String],
    deliveryPromise: String,
    returnPolicy: String
  },
  animationCutoff: {
    type: Number,
    default: 1
  },
  backgroundColor: {
    type: String
  },
  bgFit: {
    type: String,
    enum: ['contain', 'cover'],
    default: 'cover'
  },
  images: [{
    type: String
  }],
  /** Homepage “Discover” + combo strip cards — single hero thumbnail */
  homeCardImage: {
    type: String,
    trim: true,
    default: '',
  },
  /** Homepage Discover card italic line shown under product name */
  homeCardTagline: {
    type: String,
    trim: true,
    default: '',
  },
  /** Homepage Discover card short description */
  homeCardDescription: {
    type: String,
    trim: true,
    default: '',
  },
  /** /shop (and similar grid) card cover — single thumbnail */
  shopCardImage: {
    type: String,
    trim: true,
    default: '',
  },
  /** /shop product card short description */
  shopCardDescription: {
    type: String,
    trim: true,
    default: '',
  },
  /** /shop product card italic tagline under title */
  shopCardTagline: {
    type: String,
    trim: true,
    default: '',
  },
  stock: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  /** Homepage “Combo” strip (above “Loved by women everywhere”) — same product cards as shop */
  showInComboSection: {
    type: Boolean,
    default: false,
  },
  /**
   * Show in the main Shop grid + homepage “Loved by women everywhere”.
   * Back-compat: older products only had `showInComboSection`; frontend treats
   * `showInShopSection` as true when missing unless the product was combo-only.
   */
  showInShopSection: {
    type: Boolean,
    default: true,
  },
  /** Shop/combo/home cards: show star rating when product has approved reviews */
  showReviewsOnCard: {
    type: Boolean,
    default: false,
  },
  /** Lower numbers appear first in Shop + “Loved by women everywhere” */
  shopSectionOrder: {
    type: Number,
    default: 0,
  },
  /** Lower numbers appear first in the combo strip */
  comboSectionOrder: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update updatedAt on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);

