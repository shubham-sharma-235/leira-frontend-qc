const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  getActiveHomeVideos,
  getAdminHomeVideos,
  createHomeVideo,
  updateHomeVideo,
  deleteHomeVideo,
  reorderHomeVideos,
} = require('../controllers/homeVideoController');

// Public route
router.get('/', getActiveHomeVideos);

// Admin routes
router.get('/admin', protectAdmin, getAdminHomeVideos);
router.post('/', protectAdmin, createHomeVideo);
router.put('/:id', protectAdmin, updateHomeVideo);
router.delete('/:id', protectAdmin, deleteHomeVideo);
router.patch('/reorder', protectAdmin, reorderHomeVideos);

module.exports = router;

