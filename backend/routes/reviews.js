const express = require('express');
const router = express.Router();
const {
  createReview,
  getByProduct,
  getStatsByProducts,
  getFeaturedApproved,
  getAll,
  updateStatus,
  deleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/auth');

// Public: get approved reviews for a product
router.get('/product/:productId', getByProduct);
router.get('/stats', getStatsByProducts);
router.get('/featured', getFeaturedApproved);

// Customer: submit a review (requires user login)
router.post('/', protect, createReview);

// Admin: list all reviews (optional ?productId= & ?status=)
router.get('/', protectAdmin, getAll);

// Admin: approve or reject review
router.patch('/:id/status', protectAdmin, updateStatus);
router.delete('/:id', protectAdmin, deleteReview);

module.exports = router;
