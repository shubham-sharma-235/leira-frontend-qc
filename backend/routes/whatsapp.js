const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/whatsappController');
const { protectAdmin } = require('../middleware/auth');
const { getConfig, sendTextMessage, sendTemplateMessage } = require('../services/whatsappClient');
const {
  getOrderTemplateConfig,
  getAccountTemplateConfig,
} = require('../services/whatsappTemplateCampaignClient');

router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

/** Admin health / config check (no secrets returned) */
router.get('/status', protectAdmin, (req, res) => {
  const cfg = getConfig();
  const orderLms = getOrderTemplateConfig();
  const accountLms = getAccountTemplateConfig();
  return res.json({
    success: true,
    data: {
      enabled: cfg.enabled,
      graphConfigured: cfg.configured,
      baseUrlSet: Boolean(cfg.baseUrl),
      phoneNumberIdSet: Boolean(cfg.phoneNumberId),
      wabaIdSet: Boolean(cfg.wabaId),
      orderLms: {
        configured: orderLms.configured,
        templateName: orderLms.templateName,
        urlSet: Boolean(orderLms.url),
      },
      accountLms: {
        configured: accountLms.configured,
        urlSet: Boolean(accountLms.url),
      },
    },
  });
});

/**
 * Admin test send — template preferred; optional session text if body.text provided.
 * POST /api/whatsapp/admin/test
 */
router.post('/admin/test', protectAdmin, async (req, res) => {
  try {
    const { to, text, templateName, language, components } = req.body || {};
    if (!to) {
      return res.status(400).json({ success: false, message: 'to (phone) is required' });
    }

    let data;
    if (templateName) {
      data = await sendTemplateMessage({
        to,
        name: templateName,
        language: language || process.env.WHATSAPP_ORDER_TEMPLATE_LANG || 'en',
        components: Array.isArray(components) ? components : [],
      });
    } else if (text) {
      data = await sendTextMessage(to, text);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide templateName or text',
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'WhatsApp test send failed',
      error: error.data || undefined,
    });
  }
});

module.exports = router;
