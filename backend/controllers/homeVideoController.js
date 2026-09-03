const mongoose = require('mongoose');
const HomeVideo = require('../models/HomeVideo');

function sanitizePayload(body = {}) {
  return {
    title: String(body.title || '').trim(),
    subtitle: String(body.subtitle || '').trim(),
    videoUrl: String(body.videoUrl || '').trim(),
    posterUrl: String(body.posterUrl || '').trim(),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Number(body.sortOrder)) : 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  };
}

// @desc    Get active home videos
// @route   GET /api/home-videos
// @access  Public
exports.getActiveHomeVideos = async (req, res) => {
  try {
    const data = await HomeVideo.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching home videos',
      error: error.message,
    });
  }
};

// @desc    Get all home videos (admin)
// @route   GET /api/home-videos/admin
// @access  Private/Admin
exports.getAdminHomeVideos = async (req, res) => {
  try {
    const data = await HomeVideo.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching home videos',
      error: error.message,
    });
  }
};

// @desc    Create home video
// @route   POST /api/home-videos
// @access  Private/Admin
exports.createHomeVideo = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    if (!payload.title || !payload.videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title and video URL are required',
      });
    }
    const doc = await HomeVideo.create({
      ...payload,
      createdBy: req.user?._id || null,
    });
    return res.status(201).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating home video',
      error: error.message,
    });
  }
};

// @desc    Update home video
// @route   PUT /api/home-videos/:id
// @access  Private/Admin
exports.updateHomeVideo = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Home video not found' });
    }

    const existing = await HomeVideo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Home video not found' });
    }

    const payload = sanitizePayload({
      ...existing.toObject(),
      ...req.body,
      isActive:
        typeof req.body?.isActive === 'boolean'
          ? req.body.isActive
          : existing.isActive,
    });

    if (!payload.title || !payload.videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title and video URL are required',
      });
    }

    const doc = await HomeVideo.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      data: doc,
      message: 'Home video updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating home video',
      error: error.message,
    });
  }
};

// @desc    Delete home video
// @route   DELETE /api/home-videos/:id
// @access  Private/Admin
exports.deleteHomeVideo = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Home video not found' });
    }

    const doc = await HomeVideo.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Home video not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Home video deleted successfully',
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting home video',
      error: error.message,
    });
  }
};

// @desc    Reorder home videos
// @route   PATCH /api/home-videos/reorder
// @access  Private/Admin
exports.reorderHomeVideos = async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    if (!orderedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be a non-empty array',
      });
    }

    const bulkOps = orderedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: index } },
        },
      }));

    if (!bulkOps.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid IDs provided',
      });
    }

    await HomeVideo.bulkWrite(bulkOps);
    const data = await HomeVideo.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error reordering home videos',
      error: error.message,
    });
  }
};

