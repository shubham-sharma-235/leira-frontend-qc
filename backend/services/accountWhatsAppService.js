const User = require('../models/User');
const {
  getAccountTemplateConfig,
  formatReceiver,
  sendAccountCreationTemplate,
} = require('./whatsappTemplateCampaignClient');

/**
 * Best-effort WhatsApp on new account creation (does not throw to callers).
 * Template: account_creation_confirmation_3 — Hi {{1}}, Your new account has been created...
 */
async function attemptAccountCreationWhatsApp(user, { force = false } = {}) {
  const cfg = getAccountTemplateConfig();
  if (!cfg.configured) {
    return { sent: false, skipped: true, reason: 'WhatsApp account template not configured' };
  }
  if (!user?._id) {
    return { sent: false, skipped: true, reason: 'No user' };
  }

  const phone = String(user.phone || '').trim();
  const receiver = formatReceiver(phone, cfg.receiverFormat);
  if (!receiver) {
    return { sent: false, skipped: true, reason: 'No customer phone' };
  }

  if (!force && user?.accountCreationWhatsApp?.status === 'sent') {
    return { sent: false, skipped: true, reason: 'Already sent' };
  }

  const claimFilter = {
    _id: user._id,
    ...(force ? {} : { 'accountCreationWhatsApp.status': { $ne: 'sent' } }),
  };

  const claimed = await User.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        'accountCreationWhatsApp.status': 'pending',
        'accountCreationWhatsApp.lastAttemptAt': new Date(),
        'accountCreationWhatsApp.lastError': '',
        'accountCreationWhatsApp.to': receiver,
      },
      $inc: { 'accountCreationWhatsApp.attempts': 1 },
    },
    { new: true }
  );

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'Already sent or in progress' };
  }

  try {
    const result = await sendAccountCreationTemplate({
      phone,
      name: claimed.name,
    });

    await User.findByIdAndUpdate(claimed._id, {
      $set: {
        'accountCreationWhatsApp.status': 'sent',
        'accountCreationWhatsApp.sentAt': new Date(),
        'accountCreationWhatsApp.lastError': '',
        'accountCreationWhatsApp.to': result.receiver || receiver,
        'accountCreationWhatsApp.templateName': 'account_creation_confirmation_3',
        'accountCreationWhatsApp.providerMode': 'lms_template',
      },
    });

    return { sent: true, skipped: false, receiver: result.receiver };
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'WhatsApp request timed out'
        : error?.message || 'WhatsApp account template failed';

    await User.findByIdAndUpdate(claimed._id, {
      $set: {
        'accountCreationWhatsApp.status': 'failed',
        'accountCreationWhatsApp.lastError': String(message).slice(0, 500),
        'accountCreationWhatsApp.templateName': 'account_creation_confirmation_3',
      },
    });

    console.error('[WhatsApp] account creation failed:', message);
    return { sent: false, skipped: false, error: message };
  }
}

module.exports = {
  attemptAccountCreationWhatsApp,
};
