const mongoose = require('mongoose');

const blogBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['richText', 'image', 'imageLeft', 'imageRight', 'callout'],
      default: 'richText',
      required: true,
    },
    html: { type: String, default: '' }, // rich text / callout body
    imageUrl: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    tone: { type: String, enum: ['neutral', 'pink', 'green'], default: 'neutral' }, // for callout
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  subHeading: {
    type: String,
    trim: true,
    default: '',
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
    default: '',
  },
  blocks: {
    type: [blogBlockSchema],
    default: undefined, // keep undefined for older posts (backward compat)
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
    trim: true,
  },
  readTime: {
    type: String,
    required: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true,
  },
  /** Optional: listing / hero on small screens only (falls back to imageUrl). */
  coverImageMobile: {
    type: String,
    trim: true,
    default: '',
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  seo: {
    metaTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    primaryKeyword: { type: String, trim: true, default: '' },
    secondaryKeywords: { type: [String], default: [] },
  },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Index for listing by newest
blogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);
