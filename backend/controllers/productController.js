const Product = require('../models/Product');
const mongoose = require('mongoose');

const toSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const PRODUCT_SLUG_ALIASES = {
  'complete-trio-full-mother-s-day-description': 'the-complete-trio-all-3',
};

const canonicalProductSlug = (id = '', name = '') => {
  const slug = toSlug(id || name);
  return PRODUCT_SLUG_ALIASES[slug] || slug;
};

const normalizeStockAndStatus = (payload, existingProduct = null) => {
  const data = { ...payload };
  // Only normalize business `id` from fields present on the request body (create / full replace).
  // Do not derive `id` from `existingProduct` on PATCH-style admin updates — that polluted `$set`
  // and could interfere with partial updates (e.g. originalPrice).
  const hasIdKey = Object.prototype.hasOwnProperty.call(data, 'id');
  const hasNameKey = Object.prototype.hasOwnProperty.call(data, 'name');
  const sourceId = hasIdKey ? String(data.id ?? '').trim() : '';
  const normalizedId = sourceId ? toSlug(sourceId) : '';
  if (normalizedId) {
    data.id = normalizedId;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'stock')) {
    const parsed = Number(data.stock);
    data.stock = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    if (data.stock <= 0) {
      data.status = 'inactive';
    } else if (!data.status && existingProduct?.status) {
      data.status = existingProduct.status;
    } else if (!data.status) {
      data.status = 'active';
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, 'showInComboSection')) {
    data.showInComboSection = Boolean(data.showInComboSection);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'showInShopSection')) {
    data.showInShopSection = Boolean(data.showInShopSection);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'showReviewsOnCard')) {
    data.showReviewsOnCard = Boolean(data.showReviewsOnCard);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'comboSectionOrder')) {
    const n = Number(data.comboSectionOrder);
    data.comboSectionOrder = Number.isFinite(n) ? n : 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'shopSectionOrder')) {
    const n = Number(data.shopSectionOrder);
    data.shopSectionOrder = Number.isFinite(n) ? n : 0;
  }
  return data;
};

/** Resolve a product by Mongo _id, business `id`, or slug-style param (same rules as getProduct). */
async function findProductDocumentByParam(paramId) {
  const trimmed = String(paramId || '').trim();
  const normalizedParam = toSlug(trimmed);
  let product = null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    product = await Product.findById(trimmed);
  }
  if (!product) {
    product = await Product.findOne({ id: trimmed });
  }
  if (!product && normalizedParam) {
    product = await Product.findOne({ id: normalizedParam });
  }
  if (!product && normalizedParam) {
    const aliasTarget = PRODUCT_SLUG_ALIASES[normalizedParam];
    if (aliasTarget) {
      product = await Product.findOne({ id: aliasTarget });
    }
  }
  if (!product && normalizedParam) {
    const candidates = await Product.find({}, '_id id name').lean();
    const match = candidates.find((p) => {
      const slugFromId = toSlug(p.id || '');
      const slugFromName = toSlug(p.name || '');
      return slugFromId === normalizedParam || slugFromName === normalizedParam;
    });
    if (match?._id) {
      product = await Product.findById(match._id);
    }
  }
  return product;
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    // Don't filter by status - show all products (active and inactive)
    // Inactive products will show as "Out of Stock" on frontend
    const products = await Product.find({}).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const product = await findProductDocumentByParam(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Get product by slug/id
// @route   GET /api/products/slug/:id
// @access  Public
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const payload = normalizeStockAndStatus(req.body);
    const product = await Product.create(payload);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this ID already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    let product = await findProductDocumentByParam(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    // Use $set to ensure partial update (only update provided fields)
    // This preserves all other fields from seed script
    const payload = normalizeStockAndStatus(body, product);
    if (Object.prototype.hasOwnProperty.call(body, 'originalPrice')) {
      payload.originalPrice =
        body.originalPrice == null ? '' : String(body.originalPrice).trim();
    }

    const mongoId = product._id;
    const $set = Object.fromEntries(
      Object.entries(payload).filter(([key, v]) => v !== undefined && key !== '_id' && key !== '__v')
    );

    product = await Product.findByIdAndUpdate(
      mongoId,
      { $set },
      {
        new: true,
        runValidators: true,
        upsert: false
      }
    );

    console.log('Product updated:', product.id, 'Updated fields:', Object.keys($set));

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const product = await findProductDocumentByParam(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

