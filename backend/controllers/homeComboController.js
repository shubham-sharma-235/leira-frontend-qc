const mongoose = require('mongoose');
const HomeComboConfig = require('../models/HomeComboConfig');
const Product = require('../models/Product');

const CONFIG_KEY = 'default';
const MAX_COMBOS = 3;

function effectiveLinkId(combo) {
  if (!combo || typeof combo !== 'object') return null;
  const direct = combo.linkProductId;
  if (direct && mongoose.Types.ObjectId.isValid(String(direct))) return String(direct);
  const legacy = Array.isArray(combo.productIds) ? combo.productIds[0] : null;
  if (legacy && mongoose.Types.ObjectId.isValid(String(legacy))) return String(legacy);
  return null;
}

async function buildPopulatedPayload(doc) {
  if (!doc) return null;
  const combos = (doc.combos || []).slice(0, MAX_COMBOS);
  const linkIds = [
    ...new Set(combos.map((c) => effectiveLinkId(c)).filter(Boolean)),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  let products = [];
  if (linkIds.length) {
    products = await Product.find({ _id: { $in: linkIds } }).lean();
  }
  const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));

  const combosOut = combos.map((combo) => {
    const lid = effectiveLinkId(combo);
    const linked = lid ? byId[lid] : null;
    return {
      title: combo.title || '',
      subtitle: combo.subtitle || '',
      image: combo.image || '',
      price: combo.price != null ? String(combo.price).trim() : '',
      originalPrice: combo.originalPrice != null ? String(combo.originalPrice).trim() : '',
      linkProductId: lid || '',
      linkedProduct: linked || null,
    };
  });

  return {
    sectionTitle: doc.sectionTitle || '',
    sectionSubtitle: doc.sectionSubtitle || '',
    isActive: doc.isActive !== false,
    combos: combosOut,
    updatedAt: doc.updatedAt,
  };
}

// @desc    Public homepage combo section
// @route   GET /api/home-combos
// @access  Public
exports.getPublicHomeCombos = async (req, res) => {
  try {
    const doc = await HomeComboConfig.findOne({ key: CONFIG_KEY }).lean();
    if (!doc || doc.isActive === false) {
      return res.status(200).json({ success: true, data: null });
    }
    const data = await buildPopulatedPayload(doc);
    const visible = (data.combos || []).filter((c) => {
      const hasTitle = String(c.title || '').trim().length > 0;
      const hasImage = String(c.image || '').trim().length > 0;
      return hasTitle && hasImage;
    });
    if (!visible.length) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({ success: true, data: { ...data, combos: visible } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching home combos',
      error: error.message,
    });
  }
};

// @desc    Admin — get config for editor
// @route   GET /api/home-combos/admin
// @access  Private Admin
exports.getAdminHomeCombos = async (req, res) => {
  try {
    let doc = await HomeComboConfig.findOne({ key: CONFIG_KEY }).lean();
    if (!doc) {
      return res.status(200).json({
        success: true,
        data: {
          sectionTitle: 'Leira Signature Sets',
          sectionSubtitle: '',
          isActive: true,
          combos: [],
        },
      });
    }
    const data = await buildPopulatedPayload(doc);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching home combos',
      error: error.message,
    });
  }
};

function sanitizeCombos(bodyCombos) {
  const raw = Array.isArray(bodyCombos) ? bodyCombos : [];
  return raw.slice(0, MAX_COMBOS).map((c) => {
    const title = String(c?.title ?? '').trim().slice(0, 120);
    const subtitle = String(c?.subtitle ?? '').trim().slice(0, 240);
    const image = String(c?.image ?? '').trim().slice(0, 500);
    const price = String(c?.price ?? '').trim().slice(0, 64);
    const originalPrice = String(c?.originalPrice ?? '').trim().slice(0, 64);

    let linkProductId = null;
    const rawLink = c?.linkProductId ?? c?.productIds?.[0];
    if (rawLink != null && String(rawLink).trim()) {
      const s = String(rawLink).trim();
      if (mongoose.Types.ObjectId.isValid(s)) {
        linkProductId = new mongoose.Types.ObjectId(s);
      }
    }

    return { title, subtitle, image, price, originalPrice, linkProductId };
  });
}

// @desc    Admin — create or replace homepage combo config
// @route   PUT /api/home-combos
// @access  Private Admin
exports.upsertHomeCombos = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sectionTitle = String(body.sectionTitle ?? '').trim().slice(0, 160) || 'Leira Signature Sets';
    const sectionSubtitle = String(body.sectionSubtitle ?? '').trim().slice(0, 320);
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;
    const combos = sanitizeCombos(body.combos);

    const linkIds = combos.map((c) => c.linkProductId).filter(Boolean).map((id) => String(id));
    const uniquePid = [...new Set(linkIds)];
    if (uniquePid.length) {
      const count = await Product.countDocuments({ _id: { $in: uniquePid } });
      if (count !== uniquePid.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more linked product IDs are invalid or deleted',
        });
      }
    }

    const doc = await HomeComboConfig.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          sectionTitle,
          sectionSubtitle,
          isActive,
          combos,
          updatedBy: req.user?._id || null,
        },
        $setOnInsert: { key: CONFIG_KEY },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    const data = await buildPopulatedPayload(doc);
    return res.status(200).json({
      success: true,
      data,
      message: 'Home combos saved',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: 'Error saving home combos',
      error: error.message,
    });
  }
};
