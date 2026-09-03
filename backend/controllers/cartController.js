const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const toSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

/** Same rules as product detail: Mongo _id, business `id`, or URL slug — guest cart often stores slug. */
async function resolveProductForCart(paramId) {
  const trimmed = String(paramId || '').trim();
  if (!trimmed) return null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await Product.findById(trimmed);
    if (byId) return byId;
  }

  let product = await Product.findOne({ id: trimmed });
  if (!product) {
    const normalized = toSlug(trimmed);
    if (normalized) product = await Product.findOne({ id: normalized });
  }
  if (!product) {
    const normalizedParam = toSlug(trimmed);
    const candidates = await Product.find({}, '_id id name').lean();
    const match = candidates.find((p) => {
      const slugFromId = toSlug(p.id || '');
      const slugFromName = toSlug(p.name || '');
      return slugFromId === normalizedParam || slugFromName === normalizedParam;
    });
    if (match?._id) product = await Product.findById(match._id);
  }
  return product;
}

// @desc    Get my cart (with product details)
// @route   GET /api/auth/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'cart.product',
      select: 'name price folderPath images id stock status homeCardImage shopCardImage'
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const items = (user.cart || []).filter((item) => item.product != null).map((item) => ({
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity
    }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
};

// @desc    Add to cart or update quantity
// @route   POST /api/auth/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required' });
    }
    const product = await resolveProductForCart(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const mongoId = String(product._id);
    const availableStock = Number(product.stock ?? 0);
    const isOutOfStock = product.status === 'inactive' || availableStock <= 0;
    if (isOutOfStock) {
      return res.status(400).json({ success: false, message: 'This product is out of stock' });
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (qty > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} item(s) left in stock`,
      });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.cart) user.cart = [];
    const existing = user.cart.find((e) => String(e.product) === mongoId);
    if (existing) {
      existing.quantity = qty;
    } else {
      user.cart.push({ product: mongoId, quantity: qty });
    }
    await user.save();
    const updated = await User.findById(req.user.id).populate({
      path: 'cart.product',
      select: 'name price folderPath images id stock status homeCardImage shopCardImage'
    });
    const items = (updated.cart || []).filter((item) => item.product != null).map((item) => ({
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity
    }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating cart', error: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/auth/cart/items/:productId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const qty = Math.max(0, parseInt(quantity, 10));
    const resolved = await resolveProductForCart(productId);
    if (!resolved) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const mongoId = String(resolved._id);
    const product = await Product.findById(mongoId).select('stock status');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const availableStock = Number(product.stock ?? 0);
    const isOutOfStock = product.status === 'inactive' || availableStock <= 0;
    if (qty > 0 && isOutOfStock) {
      return res.status(400).json({ success: false, message: 'This product is out of stock' });
    }
    if (qty > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} item(s) left in stock`,
      });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    const item = user.cart.find((e) => String(e.product) === mongoId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }
    if (qty <= 0) {
      user.cart = user.cart.filter((e) => String(e.product) !== mongoId);
    } else {
      item.quantity = qty;
    }
    await user.save();
    const updated = await User.findById(req.user.id).populate({
      path: 'cart.product',
      select: 'name price folderPath images id stock status homeCardImage shopCardImage'
    });
    const items = (updated.cart || []).filter((item) => item.product != null).map((item) => ({
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity
    }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating cart', error: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/auth/cart/items/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const resolved = await resolveProductForCart(productId);
    if (!resolved) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const mongoId = String(resolved._id);
    const user = await User.findById(req.user.id);
    if (!user || !user.cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    user.cart = user.cart.filter((e) => String(e.product) !== mongoId);
    await user.save();
    const updated = await User.findById(req.user.id).populate({
      path: 'cart.product',
      select: 'name price folderPath images id stock status homeCardImage shopCardImage'
    });
    const items = (updated.cart || []).filter((item) => item.product != null).map((item) => ({
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity
    }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating cart', error: error.message });
  }
};

// @desc    Clear cart
// @route   DELETE /api/auth/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.cart = [];
    await user.save();
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
};
