const Review = require('../models/Review');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

function randomChars(length = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateUniqueRewardCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = `REVIEW5-${randomChars(4)}`;
    const exists = await Coupon.exists({ code });
    if (!exists) return code;
  }
  return `REV5-${Date.now().toString().slice(-6)}`;
}

// @desc    Create a review (customer)
// @route   POST /api/reviews
// @access  Private (customer token)
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating are required',
      });
    }
    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    const existing = await Review.findOne({ product: productId, user: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }
    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating: numRating,
      comment: (comment || '').trim().slice(0, 1000),
      status: 'pending',
    });
    const populated = await Review.findById(review._id).populate('user', 'name').populate('product', 'name');
    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message,
    });
  }
};

// @desc    Get approved reviews for a product (public)
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getByProduct = async (req, res) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(200).json({
        success: true,
        data: [],
        stats: { avgRating: 0, totalCount: 0 },
      });
    }
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const reviews = await Review.find({
      product: productObjectId,
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .lean();

    const stats = await Review.aggregate([
      { $match: { product: productObjectId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = stats[0]?.avg ?? 0;
    const totalCount = stats[0]?.count ?? 0;

    res.status(200).json({
      success: true,
      data: reviews,
      stats: { avgRating: Math.round(avgRating * 10) / 10, totalCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message,
    });
  }
};

// @desc    Get approved review stats for multiple products (public)
// @route   GET /api/reviews/stats?productIds=id1,id2
// @access  Public
exports.getStatsByProducts = async (req, res) => {
  try {
    const raw = String(req.query.productIds || '').trim();
    if (!raw) {
      return res.status(200).json({ success: true, data: {} });
    }

    const objectIds = raw
      .split(',')
      .map((id) => String(id || '').trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(200).json({ success: true, data: {} });
    }

    const stats = await Review.aggregate([
      {
        $match: {
          product: { $in: objectIds },
          status: 'approved',
        },
      },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const data = {};
    for (const row of stats) {
      data[String(row._id)] = {
        avgRating: Math.round((row.avgRating || 0) * 10) / 10,
        totalCount: row.totalCount || 0,
      };
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching review stats',
      error: error.message,
    });
  }
};

// @desc    Get approved reviews for homepage testimonials (public)
// @route   GET /api/reviews/featured?limit=9
// @access  Public
exports.getFeaturedApproved = async (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), 30)
      : 9;

    const reviews = await Review.find({
      status: 'approved',
      comment: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name')
      .populate('product', 'name')
      .lean();

    const data = reviews.map((review) => ({
      _id: review._id,
      comment: String(review.comment || '').trim(),
      rating: Number(review.rating || 0),
      createdAt: review.createdAt,
      userName: review.user?.name || 'Verified Customer',
      productName: review.product?.name || '',
    }));

    return res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching featured reviews',
      error: error.message,
    });
  }
};

// @desc    Get all reviews (admin) – optional filter by productId, status
// @route   GET /api/reviews
// @access  Private (admin)
exports.getAll = async (req, res) => {
  try {
    const { productId, status } = req.query;
    const filter = {};
    if (productId) filter.product = productId;
    if (status) filter.status = status;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('product', 'name')
      .lean();

    res.status(200).json({
      success: true,
      data: reviews,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message,
    });
  }
};

// @desc    Update review status (approve / reject)
// @route   PATCH /api/reviews/:id/status
// @access  Private (admin)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected',
      });
    }
    const existingReview = await Review.findById(req.params.id);
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const previousStatus = existingReview.status;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('product', 'name');

    // Disabled: no review-approval discount coupon (restore to re-enable 5% reward on first approve).
    // let rewardCoupon = null;
    // if (status === 'approved' && previousStatus !== 'approved') {
    //   rewardCoupon = await Coupon.findOne({
    //     assignedUser: review.user?._id,
    //     rewardReview: review._id,
    //     rewardSource: 'review',
    //   });
    //
    //   if (!rewardCoupon) {
    //     const code = await generateUniqueRewardCode();
    //     rewardCoupon = await Coupon.create({
    //       code,
    //       type: 'percent',
    //       value: 5,
    //       minOrder: 0,
    //       maxUses: 1,
    //       isActive: true,
    //       assignedUser: review.user?._id,
    //       rewardSource: 'review',
    //       rewardReview: review._id,
    //     });
    //   }
    // }

    res.status(200).json({
      success: true,
      data: review,
      rewardCoupon: null,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message,
    });
  }
};

// @desc    Delete review (admin)
// @route   DELETE /api/reviews/:id
// @access  Private (admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await Review.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message,
    });
  }
};
