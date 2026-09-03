const ContactMessage = require('../models/ContactMessage');
const ContactReview = require('../models/ContactReview');

// @desc    Submit contact form
// @route   POST /api/contact/messages
// @access  Public
exports.createContactMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required',
      });
    }

    const doc = await ContactMessage.create({ name, email, message });
    return res.status(201).json({
      success: true,
      message: 'Your message has been received',
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error submitting contact message',
      error: error.message,
    });
  }
};

// @desc    Submit contact page product review form
// @route   POST /api/contact/reviews
// @access  Public
exports.createContactReview = async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const review = String(req.body?.review || '').trim();

    if (!firstName || !lastName || !email || !review) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and review are required',
      });
    }

    const doc = await ContactReview.create({ firstName, lastName, email, review });
    return res.status(201).json({
      success: true,
      message: 'Your review has been submitted for approval',
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error submitting review',
      error: error.message,
    });
  }
};

// @desc    Get contact messages (admin)
// @route   GET /api/contact/messages
// @access  Private (admin)
exports.getContactMessages = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.status) filter.status = req.query.status;
    const data = await ContactMessage.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching contact messages',
      error: error.message,
    });
  }
};

// @desc    Update contact message status (admin)
// @route   PATCH /api/contact/messages/:id/status
// @access  Private (admin)
exports.updateContactMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be new, in_progress, or resolved',
      });
    }

    const doc = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating message status',
      error: error.message,
    });
  }
};

// @desc    Approved contact reviews for homepage testimonials (public)
// @route   GET /api/contact/reviews/featured?limit=12
// @access  Public
exports.getApprovedContactReviewsFeatured = async (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), 30)
      : 12;

    const rows = await ContactReview.find({
      status: 'approved',
      review: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const data = rows.map((row) => ({
      _id: row._id,
      review: String(row.review || '').trim(),
      firstName: String(row.firstName || '').trim(),
      lastName: String(row.lastName || '').trim(),
      createdAt: row.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching approved contact reviews',
      error: error.message,
    });
  }
};

// @desc    Get contact page reviews (admin)
// @route   GET /api/contact/reviews
// @access  Private (admin)
exports.getContactReviews = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.status) filter.status = req.query.status;
    const data = await ContactReview.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching contact reviews',
      error: error.message,
    });
  }
};

// @desc    Update contact review status (admin)
// @route   PATCH /api/contact/reviews/:id/status
// @access  Private (admin)
exports.updateContactReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be pending, approved, or rejected',
      });
    }

    const doc = await ContactReview.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Contact review not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating review status',
      error: error.message,
    });
  }
};
