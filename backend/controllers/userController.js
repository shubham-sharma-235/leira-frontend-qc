const User = require('../models/User');
const Admin = require('../models/Admin');

// @desc    Get all users (customers only - exclude admin emails)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const adminEmails = await Admin.find({}).select('email').lean();
    const adminEmailSet = new Set(adminEmails.map((a) => a.email?.toLowerCase()).filter(Boolean));

    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    const customersOnly = users.filter((u) => !adminEmailSet.has((u.email || '').toLowerCase()));

    res.status(200).json({
      success: true,
      count: customersOnly.length,
      data: customersOnly
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get single user by ID (admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user (admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, address, billingAddress, shippingAddress, role, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase();
    if (phone !== undefined) user.phone = String(phone).replace(/\D/g, '').slice(0, 10);
    if (address !== undefined) user.address = String(address).trim();
    if (billingAddress !== undefined) {
      user.billingAddress = {
        address: String(billingAddress.address || '').trim(),
        state: String(billingAddress.state || '').trim(),
        city: String(billingAddress.city || '').trim(),
        pincode: String(billingAddress.pincode || '').trim()
      };
    }
    if (shippingAddress !== undefined) {
      user.shippingAddress = {
        address: String(shippingAddress.address || '').trim(),
        state: String(shippingAddress.state || '').trim(),
        city: String(shippingAddress.city || '').trim(),
        pincode: String(shippingAddress.pincode || '').trim()
      };
    }
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = await User.findById(user._id).select('-password');
    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    // Prevent deleting self if needed
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      data: {},
      message: 'User deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
