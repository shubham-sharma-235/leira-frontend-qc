const User = require('../models/User');
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const OtpSession = require('../models/OtpSession');
const crypto = require('crypto');
const { attemptAccountCreationWhatsApp } = require('../services/accountWhatsAppService');

const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY || '';
const TWOFACTOR_BASE_URL = process.env.TWOFACTOR_BASE_URL || 'https://2factor.in/API/V1';
const TWOFACTOR_TEMPLATE_NAME = process.env.TWOFACTOR_TEMPLATE_NAME || 'OTP_LEIRA';
const OTP_EXPIRY_MINUTES = Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES || 5));
const OTP_RESEND_COOLDOWN_SECONDS = Math.max(5, Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 30));
const OTP_MAX_VERIFY_ATTEMPTS = Math.max(1, Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5));

const normalizeIndianPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return '';
};

const normalizeCustomerName = (raw) =>
  String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

const isFallbackPhoneName = (name, phone = '') => {
  const normalized = String(name || '').trim();
  if (!normalized) return true;
  if (/^leira user \d{4}$/i.test(normalized)) return true;
  return phone ? normalized === `Leira User ${String(phone).slice(-4)}` : false;
};

const createOtpRequestId = () => crypto.randomBytes(16).toString('hex');

const sendOtpVia2Factor = async (phone) => {
  if (!TWOFACTOR_API_KEY) {
    throw new Error('2Factor API key is missing');
  }
  const url = `${TWOFACTOR_BASE_URL}/${encodeURIComponent(TWOFACTOR_API_KEY)}/SMS/+91${phone}/AUTOGEN/${encodeURIComponent(TWOFACTOR_TEMPLATE_NAME)}`;
  const response = await fetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  const status = String(data?.Status || data?.status || '').toLowerCase();
  if (!response.ok || status !== 'success') {
    throw new Error(data?.Details || data?.details || 'Failed to send OTP');
  }
  const providerSessionId = data?.Details || data?.details;
  if (!providerSessionId) {
    throw new Error('OTP provider did not return session ID');
  }
  return String(providerSessionId);
};

const verifyOtpVia2Factor = async (providerSessionId, otp) => {
  if (!TWOFACTOR_API_KEY) {
    throw new Error('2Factor API key is missing');
  }
  const url = `${TWOFACTOR_BASE_URL}/${encodeURIComponent(TWOFACTOR_API_KEY)}/SMS/VERIFY/${encodeURIComponent(
    providerSessionId
  )}/${encodeURIComponent(String(otp))}`;
  const response = await fetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  const status = String(data?.Status || data?.status || '').toLowerCase();
  return {
    ok: response.ok && status === 'success',
    message: data?.Details || data?.details || 'OTP verification failed',
  };
};

const createOrResolveUserByPhone = async (phone, name = '') => {
  const customerName = normalizeCustomerName(name);
  let user = await User.findOne({ phone }).sort({ createdAt: -1 });
  if (user) {
    // Keep an existing real profile name, but replace generated fallback names from OTP-only accounts.
    if (customerName && isFallbackPhoneName(user.name, phone)) {
      user.name = customerName;
      await user.save();
    }
    return { user, created: false };
  }

  // Create a customer account for first-time phone login.
  const baseEmail = `phone${phone}@otp.leira.local`;
  let email = baseEmail;
  let counter = 1;
  while (await User.findOne({ email })) {
    email = `phone${phone}.${counter}@otp.leira.local`;
    counter += 1;
  }

  const randomPassword = crypto.randomBytes(18).toString('hex');
  user = await User.create({
    name: customerName || `Leira User ${phone.slice(-4)}`,
    email,
    phone,
    password: randomPassword,
    role: 'user',
  });
  return { user, created: true };
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone: (phone && String(phone).replace(/\D/g, '').slice(0, 10)) || '',
      role: role || 'user'
    });

    if (user) {
      // Best-effort WhatsApp welcome (approved template) — never block signup.
      await attemptAccountCreationWhatsApp(user);

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Send OTP for mobile login (2Factor)
// @route   POST /api/auth/phone/send-otp
// @access  Public
exports.sendPhoneOtp = async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number',
      });
    }
    if (!TWOFACTOR_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OTP service is not configured',
      });
    }

    const latest = await OtpSession.findOne({ phone, verifiedAt: null }).sort({ createdAt: -1 });
    if (latest?.lastSentAt) {
      const cooldownUntil = latest.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000;
      const now = Date.now();
      if (cooldownUntil > now) {
        const waitSec = Math.ceil((cooldownUntil - now) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSec}s before requesting another OTP`,
          retryAfter: waitSec,
        });
      }
    }

    const providerSessionId = await sendOtpVia2Factor(phone);
    const requestId = createOtpRequestId();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpSession.create({
      requestId,
      phone,
      providerSessionId,
      attempts: 0,
      expiresAt,
      lastSentAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        requestId,
        expiresIn: OTP_EXPIRY_MINUTES * 60,
        phone: `******${phone.slice(-4)}`,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
};

// @desc    Verify OTP and login user
// @route   POST /api/auth/phone/verify-otp
// @access  Public
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const requestId = String(req.body.requestId || '').trim();
    const otp = String(req.body.otp || '').replace(/\D/g, '');
    const name = normalizeCustomerName(req.body.name);
    if (!requestId || otp.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and valid OTP are required',
      });
    }

    const otpSession = await OtpSession.findOne({ requestId });
    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: 'OTP session not found or expired',
      });
    }
    if (otpSession.verifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'This OTP is already used',
      });
    }
    if (otpSession.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }
    if (otpSession.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new OTP',
      });
    }

    const verification = await verifyOtpVia2Factor(otpSession.providerSessionId, otp);
    otpSession.attempts += 1;
    if (!verification.ok) {
      await otpSession.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    let { user, created } = await createOrResolveUserByPhone(otpSession.phone, name);
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    otpSession.verifiedAt = new Date();
    await otpSession.save();

    // First-time phone signup only — not on every login.
    if (created) {
      await attemptAccountCreationWhatsApp(user);
    }

    return res.status(200).json({
      success: true,
      message: created ? 'Account created successfully' : 'Mobile login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
};

// @desc    Admin login (separate from User - uses Admin collection)
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    res.status(200).json({
      success: true,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        token: generateToken(admin._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

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

// @desc    Update current user profile (name, email, phone, address)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, billingAddress, shippingAddress } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (phone !== undefined) user.phone = String(phone).replace(/\D/g, '').slice(0, 10);
    if (address !== undefined) user.address = address.trim();
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

    await user.save();

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json({
      success: true,
      data: updated
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
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Change password (current user)
// @route   PUT /api/auth/change-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message
    });
  }
};

