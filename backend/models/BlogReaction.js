const mongoose = require('mongoose');

const blogReactionSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

blogReactionSchema.index({ blog: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('BlogReaction', blogReactionSchema);
