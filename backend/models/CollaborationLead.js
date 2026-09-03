const mongoose = require('mongoose');

const collaborationLeadSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    collaborationType: {
      type: String,
      enum: ['influencer', 'brand', 'creator', 'affiliate', 'other'],
      default: 'influencer',
    },
    brandOrChannel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    socialHandle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    followers: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CollaborationLead', collaborationLeadSchema);

