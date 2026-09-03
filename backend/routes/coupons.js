const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getActiveLoginPromo,
  getActivePublicCoupons,
  getMyReviewReward,
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  setLoginPromoCoupon,
} = require('../controllers/couponController');
const { protect, protectAdmin } = require('../middleware/auth');

// Public: validate coupon (for cart)
router.post('/validate', validateCoupon);
router.get('/promo', getActiveLoginPromo);
router.get('/active', getActivePublicCoupons);
router.get('/my/reward', protect, getMyReviewReward);

// Admin-only
router.get('/', protectAdmin, getCoupons);
router.get('/:id', protectAdmin, getCoupon);
router.post('/', protectAdmin, createCoupon);
router.put('/:id', protectAdmin, updateCoupon);
router.patch('/:id/login-promo', protectAdmin, setLoginPromoCoupon);
router.delete('/:id', protectAdmin, deleteCoupon);

module.exports = router;
