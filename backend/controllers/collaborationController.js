const CollaborationLead = require('../models/CollaborationLead');

// @desc    Submit collaboration lead
// @route   POST /api/collaborations
// @access  Public
exports.createCollaborationLead = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const collaborationType = String(req.body?.collaborationType || 'influencer').trim().toLowerCase();
    const brandOrChannel = String(req.body?.brandOrChannel || '').trim();
    const socialHandle = String(req.body?.socialHandle || '').trim();
    const followers = String(req.body?.followers || '').trim();
    const message = String(req.body?.message || '').trim();

    if (
      !fullName ||
      !email ||
      !phone ||
      !brandOrChannel ||
      !socialHandle ||
      !followers ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Full name, email, phone, brand/channel, social handle, followers/audience size, and collaboration idea are required',
      });
    }

    const allowedTypes = ['influencer', 'brand', 'creator', 'affiliate', 'other'];
    const safeType = allowedTypes.includes(collaborationType) ? collaborationType : 'influencer';

    const doc = await CollaborationLead.create({
      fullName,
      email,
      phone,
      collaborationType: safeType,
      brandOrChannel,
      socialHandle,
      followers,
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Your collaboration request has been submitted successfully',
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error submitting collaboration request',
      error: error.message,
    });
  }
};

// @desc    Get collaboration leads (admin)
// @route   GET /api/collaborations
// @access  Private (admin)
exports.getCollaborationLeads = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.status) filter.status = req.query.status;

    const data = await CollaborationLead.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching collaboration leads',
      error: error.message,
    });
  }
};

// @desc    Update collaboration lead status (admin)
// @route   PATCH /api/collaborations/:id/status
// @access  Private (admin)
exports.updateCollaborationLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be new, in_progress, or resolved',
      });
    }

    const doc = await CollaborationLead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration lead not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating collaboration lead status',
      error: error.message,
    });
  }
};

