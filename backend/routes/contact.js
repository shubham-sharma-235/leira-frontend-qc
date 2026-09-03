const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  createContactMessage,
  createContactReview,
  getApprovedContactReviewsFeatured,
  getContactMessages,
  updateContactMessageStatus,
  getContactReviews,
  updateContactReviewStatus,
} = require('../controllers/contactController');

// Public submits (from contact page)
router.post('/messages', createContactMessage);
router.post('/reviews', createContactReview);
router.get('/reviews/featured', getApprovedContactReviewsFeatured);

// Admin inbox/moderation
router.get('/messages', protectAdmin, getContactMessages);
router.patch('/messages/:id/status', protectAdmin, updateContactMessageStatus);
router.get('/reviews', protectAdmin, getContactReviews);
router.patch('/reviews/:id/status', protectAdmin, updateContactReviewStatus);

module.exports = router;
