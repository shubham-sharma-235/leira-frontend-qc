const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlog,
  getMyReaction,
  recordView,
  reactToBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');
const { protect, protectAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlog);
router.post('/:id/view', recordView);
router.get('/:id/reaction', protect, getMyReaction);
router.post('/:id/react', protect, reactToBlog);

// Admin-only routes
router.post('/', protectAdmin, createBlog);
router.put('/:id', protectAdmin, updateBlog);
router.delete('/:id', protectAdmin, deleteBlog);

module.exports = router;
