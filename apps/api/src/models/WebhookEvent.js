import mongoose from 'mongoose';

const WebhookEventSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    provider: { type: String, enum: ['SENDGRID', 'MAILGUN', 'POSTMARK', 'TWILIO', 'CUSTOM'], required: true },
    eventType: {
      type: String,
      enum: ['DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'DROPPED', 'INBOUND_REPLY', 'OPT_OUT'],
      required: true,
      index: true,
    },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    recipientEmail: { type: String },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'], default: 'PENDING', index: true },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ provider: 1, eventType: 1, status: 1 });

export const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema);
