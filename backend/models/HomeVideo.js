const mongoose = require('mongoose');

const homeVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 240,
      default: '',
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    posterUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

homeVideoSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model('HomeVideo', homeVideoSchema);

