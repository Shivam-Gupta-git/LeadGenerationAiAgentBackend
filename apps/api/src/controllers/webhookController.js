import { WebhookEvent } from '../models/WebhookEvent.js';
import {
  processSendGridWebhook,
  processPostmarkWebhook,
  processInboundReply
} from '../services/webhooks/webhookProcessor.js';

export const handleSendGridWebhook = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    const results = await processSendGridWebhook(events);

    return res.status(200).json({
      success: true,
      processedCount: results.length
    });
  } catch (error) {
    next(error);
  }
};

export const handlePostmarkWebhook = async (req, res, next) => {
  try {
    const result = await processPostmarkWebhook(req.body);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const handleInboundReply = async (req, res, next) => {
  try {
    const { senderEmail, subject, bodyText } = req.body;
    const organizationId = req.user?.organizationId || req.body.organizationId;

    if (!senderEmail || !bodyText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: senderEmail, bodyText'
      });
    }

    const result = await processInboundReply({
      senderEmail,
      subject,
      bodyText,
      organizationId
    });

    return res.status(200).json({
      success: true,
      message: 'Inbound reply processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getWebhookEvents = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { provider, eventType, limit = 50 } = req.query;

    const query = { organizationId };
    if (provider) query.provider = provider.toUpperCase();
    if (eventType) query.eventType = eventType.toUpperCase();

    const events = await WebhookEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('leadId', 'businessName contactName email status');

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};
