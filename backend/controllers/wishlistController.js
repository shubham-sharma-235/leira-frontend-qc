const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get my wishlist (with product details)
// @route   GET /api/auth/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'name price folderPath images id homeCardImage shopCardImage'
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const items = (user.wishlist || []).filter(Boolean);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
  }
};

// @desc    Add to wishlist
// @route   POST /api/auth/wishlist
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.wishlist) user.wishlist = [];
    const idStr = productId.toString();
    if (user.wishlist.some((id) => id.toString() === idStr)) {
      const updated = await User.findById(req.user.id).populate({
        path: 'wishlist',
        select: 'name price folderPath images id homeCardImage shopCardImage'
      });
      return res.status(200).json({ success: true, data: (updated.wishlist || []).filter(Boolean) });
    }
    user.wishlist.push(productId);
    await user.save();
    const updated = await User.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'name price folderPath images id homeCardImage shopCardImage'
    });
    res.status(200).json({ success: true, data: (updated.wishlist || []).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating wishlist', error: error.message });
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/auth/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }
    const idStr = productId.toString();
    user.wishlist = user.wishlist.filter((id) => id.toString() !== idStr);
    await user.save();
    const updated = await User.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'name price folderPath images id homeCardImage shopCardImage'
    });
    res.status(200).json({ success: true, data: (updated.wishlist || []).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating wishlist', error: error.message });
  }
};
