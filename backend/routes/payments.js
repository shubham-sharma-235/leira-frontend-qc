const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOnlineOrder,
  verifyOnlinePayment,
  abandonOnlinePayment,
  placeCodOrder,
} = require('../controllers/paymentController');

// Customer payment routes
router.post('/online/order', protect, createOnlineOrder);
router.post('/online/verify', protect, verifyOnlinePayment);
router.post('/online/abandon', protect, abandonOnlinePayment);
router.post('/cod', protect, placeCodOrder);

module.exports = router;
