const { getConfig, markMessageRead } = require('../services/whatsappClient');

/**
 * Optional webhook verify (Meta-style GET hub.challenge).
 * Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in env.
 */
exports.verifyWebhook = async (req, res) => {
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  const expected = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim();

  if (mode === 'subscribe' && expected && token === expected) {
    return res.status(200).send(challenge);
  }

  // Some connectors just ping GET
  if (getConfig().configured) {
    return res.status(200).json({ success: true, service: 'leira-whatsapp-webhook' });
  }

  return res.status(403).json({ success: false, message: 'Webhook verification failed' });
};

/**
 * Inbound WhatsApp events (messages / statuses).
 * Always ACK quickly with 200 so provider does not retry endlessly.
 */
exports.handleWebhook = async (req, res) => {
  try {
    const secret = String(process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
    if (secret) {
      const headerKey =
        req.headers['x-webhook-secret'] ||
        req.headers['x-api-key'] ||
        req.headers['api-key'] ||
        '';
      if (String(headerKey) !== secret) {
        return res.status(401).json({ success: false, message: 'Unauthorized webhook' });
      }
    }

    const body = req.body || {};
    const entries = Array.isArray(body.entry) ? body.entry : [];

    // Meta Cloud payload shape
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const msg of messages) {
          const mid = String(msg?.id || '').trim();
          if (mid && String(process.env.WHATSAPP_AUTO_MARK_READ || 'true').toLowerCase() !== 'false') {
            markMessageRead(mid).catch(() => {});
          }
          if (process.env.NODE_ENV !== 'production') {
            console.log('[WhatsApp webhook] inbound message', {
              from: msg?.from,
              type: msg?.type,
              id: mid,
            });
          }
        }
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        if (statuses.length && process.env.NODE_ENV !== 'production') {
          console.log(
            '[WhatsApp webhook] statuses',
            statuses.map((s) => ({ id: s?.id, status: s?.status }))
          );
        }
      }
    }

    // Connector may send flatter payloads
    if (body.message_id || body.messages) {
      const mid = String(body.message_id || body.messages?.[0]?.id || '').trim();
      if (mid && String(process.env.WHATSAPP_AUTO_MARK_READ || 'true').toLowerCase() !== 'false') {
        markMessageRead(mid).catch(() => {});
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[WhatsApp webhook] error:', error?.message || error);
    return res.status(200).json({ success: true });
  }
};
