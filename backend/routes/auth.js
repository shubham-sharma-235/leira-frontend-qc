const express = require('express');
const router = express.Router();
const {
  register,
  login,
  sendPhoneOtp,
  verifyPhoneOtp,
  getMe,
  adminLogin,
  updateProfile,
  updatePassword
} = require('../controllers/authController');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/phone/send-otp', sendPhoneOtp);
router.post('/phone/verify-otp', verifyPhoneOtp);
router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, updatePassword);

router.get('/cart', protect, getCart);
router.post('/cart', protect, addToCart);
router.put('/cart/items/:productId', protect, updateCartItem);
router.delete('/cart/items/:productId', protect, removeFromCart);
router.delete('/cart', protect, clearCart);

router.get('/wishlist', protect, getWishlist);
router.post('/wishlist', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

module.exports = router;

