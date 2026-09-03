const Coupon = require('../models/Coupon');
const jwt = require('jsonwebtoken');

function getUserIdFromAuthHeader(req) {
  try {
    const auth = req.headers?.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ? String(decoded.id) : null;
  } catch {
    return null;
  }
}

function isCouponCurrentlyValid(coupon) {
  const now = new Date();
  if (!coupon?.isActive) return false;
  if (coupon.validFrom && now < coupon.validFrom) return false;
  if (coupon.validUntil && now > coupon.validUntil) return false;
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return false;
  return true;
}

async function ensureSingleLoginPromo(couponId) {
  await Coupon.updateMany(
    { _id: { $ne: couponId }, isLoginPromo: true },
    { $set: { isLoginPromo: false } }
  );
}

// @desc    Validate coupon for cart (public)
// @route   POST /api/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Coupon code is required',
      });
    }
    const subTotal = Number(subtotal) || 0;
    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });
    if (!coupon) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid or expired coupon',
      });
    }
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'This coupon is not yet valid',
      });
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'This coupon has expired',
      });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'This coupon has reached its usage limit',
      });
    }
    if (coupon.minOrder > 0 && subTotal < coupon.minOrder) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: `Minimum order amount is ₹${coupon.minOrder}`,
      });
    }
    if (coupon.rewardSource === 'review') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Review reward coupons are not available',
      });
    }
    if (coupon.assignedUser) {
      const callerId = getUserIdFromAuthHeader(req);
      if (!callerId || String(coupon.assignedUser) !== callerId) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'This coupon is not available for this account',
        });
      }
    }
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.round((subTotal * Math.min(coupon.value, 100)) / 100);
    } else {
      discountAmount = Math.min(coupon.value, subTotal);
    }
    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
      },
      message: 'Coupon applied successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Error validating coupon',
      error: error.message,
    });
  }
};

// @desc    Get current login promo coupon (public)
// @route   GET /api/coupons/promo
// @access  Public
exports.getActiveLoginPromo = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ isLoginPromo: true, isActive: true })
      .sort({ updatedAt: -1, createdAt: -1 });

    if (!coupon || !isCouponCurrentlyValid(coupon)) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active login promo available',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching login promo coupon',
      error: error.message,
    });
  }
};

// @desc    Get active public coupons (customer-facing)
// @route   GET /api/coupons/active
// @access  Public (optionally uses auth header to include assignedUser coupons)
exports.getActivePublicCoupons = async (req, res) => {
  try {
    const callerId = getUserIdFromAuthHeader(req);

    const coupons = await Coupon.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const visible = (coupons || []).filter((c) => {
      if (!isCouponCurrentlyValid(c)) return false;
      // Admin toggle: hide from public dropdown/list, but coupon can still be used by code.
      if (c.showInDropdown === false) return false;
      // Hide review reward coupons from manual list (auto applied / account-specific)
      if (c.rewardSource === 'review') return false;
      // If assigned to a user, only show when same customer token is present
      if (c.assignedUser) return callerId && String(c.assignedUser) === String(callerId);
      return true;
    });

    return res.status(200).json({
      success: true,
      count: visible.length,
      data: visible.map((c) => ({
        _id: c._id,
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        isLoginPromo: !!c.isLoginPromo,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching active coupons',
      error: error.message,
    });
  }
};

// @desc    Get my active review reward coupon (customer)
// @route   GET /api/coupons/my/reward
// @access  Private (customer)
exports.getMyReviewReward = async (req, res) => {
  try {
    // Disabled: review reward feature off — always no coupon (restore query below to re-enable).
    return res.status(200).json({ success: true, data: null });
    /*
    const coupon = await Coupon.findOne({
      assignedUser: req.user.id,
      rewardSource: 'review',
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!coupon || !isCouponCurrentlyValid(coupon)) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: coupon._id,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        validUntil: coupon.validUntil,
        autoApplied: true,
      },
    });
    */
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching review reward coupon',
      error: error.message,
    });
  }
};

// @desc    Get all coupons (admin)
// @route   GET /api/coupons
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons',
      error: error.message,
    });
  }
};

// @desc    Get single coupon (admin)
// @route   GET /api/coupons/:id
// @access  Private/Admin
exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon',
      error: error.message,
    });
  }
};

// @desc    Create coupon (admin)
// @route   POST /api/coupons
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
  try {
    if (req.body.code) {
      req.body.code = req.body.code.trim().toUpperCase();
    }
    const coupon = await Coupon.create(req.body);
    if (coupon.isLoginPromo) {
      await ensureSingleLoginPromo(coupon._id);
    }
    res.status(201).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A coupon with this code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating coupon',
      error: error.message,
    });
  }
};

// @desc    Update coupon (admin)
// @route   PUT /api/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
  try {
    if (req.body.code) {
      req.body.code = req.body.code.trim().toUpperCase();
    }
    let coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (coupon.isLoginPromo) {
      await ensureSingleLoginPromo(coupon._id);
    }
    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A coupon with this code already exists',
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating coupon',
      error: error.message,
    });
  }
};

// @desc    Set login promo coupon (admin)
// @route   PATCH /api/coupons/:id/login-promo
// @access  Private/Admin
exports.setLoginPromoCoupon = async (req, res) => {
  try {
    const { isLoginPromo = true } = req.body || {};
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    coupon.isLoginPromo = !!isLoginPromo;
    await coupon.save();

    if (coupon.isLoginPromo) {
      await ensureSingleLoginPromo(coupon._id);
    }

    return res.status(200).json({
      success: true,
      data: coupon,
      message: coupon.isLoginPromo
        ? 'Login promo coupon updated successfully'
        : 'Login promo removed from coupon',
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error updating login promo coupon',
      error: error.message,
    });
  }
};

// @desc    Delete coupon (admin)
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon',
      error: error.message,
    });
  }
};
