import { WebhookEvent } from '../../models/WebhookEvent.js';
import { Lead } from '../../models/Lead.js';

/**
 * Classify prospect sentiment from email body text.
 */
export const classifyReplySentiment = (text = '') => {
  const lower = text.toLowerCase();

  const optOutKeywords = ['unsubscribe', 'remove me', 'stop emailing', 'take me off', 'not interested', 'don\'t contact', 'spam'];
  if (optOutKeywords.some(kw => lower.includes(kw))) {
    return 'OPT_OUT';
  }

  const positiveKeywords = ['interested', 'pricing', 'call', 'demo', 'meeting', 'schedule', 'send over', 'sounds good', 'let\'s talk', 'more info'];
  if (positiveKeywords.some(kw => lower.includes(kw))) {
    return 'INTERESTED';
  }

  return 'NEUTRAL';
};

/**
 * Process array of SendGrid webhook events.
 */
export const processSendGridWebhook = async (events = []) => {
  const processed = [];

  for (const event of events) {
    const email = event.email ? event.email.toLowerCase() : null;
    let eventType = 'DELIVERED';

    switch (event.event) {
      case 'delivered':
        eventType = 'DELIVERED';
        break;
      case 'open':
        eventType = 'OPENED';
        break;
      case 'click':
        eventType = 'CLICKED';
        break;
      case 'bounce':
      case 'dropped':
        eventType = 'BOUNCED';
        break;
      case 'spamreport':
      case 'unsubscribe':
        eventType = 'OPT_OUT';
        break;
      default:
        eventType = 'DELIVERED';
    }

    const lead = email ? await Lead.findOne({ email }) : null;

    const webhookRecord = await WebhookEvent.create({
      organizationId: lead?.organizationId,
      provider: 'SENDGRID',
      eventType,
      leadId: lead?._id,
      recipientEmail: email,
      rawPayload: event,
      status: 'PROCESSED',
      processedAt: new Date()
    });

    if (lead) {
      if (eventType === 'BOUNCED') {
        lead.status = 'REJECTED';
      } else if (eventType === 'OPT_OUT') {
        lead.status = 'REJECTED';
      } else if (eventType === 'CLICKED') {
        lead.engagementScore = Math.min(100, (lead.engagementScore || 0) + 20);
      } else if (eventType === 'OPENED') {
        lead.engagementScore = Math.min(100, (lead.engagementScore || 0) + 5);
      }
      await lead.save();
    }

    processed.push(webhookRecord);
  }

  return processed;
};

/**
 * Process incoming Postmark webhook payload.
 */
export const processPostmarkWebhook = async (payload = {}) => {
  const email = (payload.Recipient || payload.Email || '').toLowerCase();
  const recordType = payload.RecordType || 'Delivery';

  let eventType = 'DELIVERED';
  if (recordType === 'Open') eventType = 'OPENED';
  if (recordType === 'Click') eventType = 'CLICKED';
  if (recordType === 'Bounce') eventType = 'BOUNCED';
  if (recordType === 'SpamComplaint') eventType = 'OPT_OUT';

  const lead = email ? await Lead.findOne({ email }) : null;

  const webhookRecord = await WebhookEvent.create({
    organizationId: lead?.organizationId,
    provider: 'POSTMARK',
    eventType,
    leadId: lead?._id,
    recipientEmail: email,
    rawPayload: payload,
    status: 'PROCESSED',
    processedAt: new Date()
  });

  if (lead) {
    if (['BOUNCED', 'OPT_OUT'].includes(eventType)) {
      lead.status = 'REJECTED';
    } else if (eventType === 'CLICKED') {
      lead.engagementScore = Math.min(100, (lead.engagementScore || 0) + 20);
    }
    await lead.save();
  }

  return webhookRecord;
};

/**
 * Process inbound prospect email reply.
 */
export const processInboundReply = async ({ senderEmail, subject, bodyText, organizationId }) => {
  if (!senderEmail) {
    throw new Error('senderEmail is required to process inbound reply');
  }

  const email = senderEmail.toLowerCase().trim();
  const leadQuery = organizationId ? { email, organizationId } : { email };
  const lead = await Lead.findOne(leadQuery);

  const sentiment = classifyReplySentiment(bodyText);
  let eventType = 'INBOUND_REPLY';
  if (sentiment === 'OPT_OUT') eventType = 'OPT_OUT';

  const webhookRecord = await WebhookEvent.create({
    organizationId: lead?.organizationId || organizationId,
    provider: 'CUSTOM',
    eventType,
    leadId: lead?._id,
    recipientEmail: email,
    rawPayload: { senderEmail, subject, bodyText, sentiment },
    status: 'PROCESSED',
    processedAt: new Date()
  });

  if (lead) {
    if (sentiment === 'OPT_OUT') {
      lead.status = 'REJECTED';
    } else if (sentiment === 'INTERESTED') {
      lead.status = 'REPLIED';
      lead.engagementScore = 100;
    } else {
      lead.status = 'REPLIED';
    }

    if (!lead.outreachHistory) lead.outreachHistory = [];
    lead.outreachHistory.push({
      channel: 'EMAIL',
      senderEmail: email,
      subject: `REPLY: ${subject || 'Re:'}`,
      body: bodyText,
      sentAt: new Date(),
      isInbound: true,
      sentiment
    });

    await lead.save();
  }

  return {
    webhookRecord,
    sentiment,
    leadUpdated: !!lead,
    leadId: lead?._id
  };
};

export default {
  classifyReplySentiment,
  processSendGridWebhook,
  processPostmarkWebhook,
  processInboundReply
};
