import mongoose from 'mongoose';

const EmailAccountSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    senderName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    smtpHost: { type: String, required: true },
    smtpPort: { type: Number, required: true, default: 587 },
    smtpUser: { type: String, required: true },
    smtpPassEncrypted: { type: String, required: true },
    imapHost: { type: String },
    imapPort: { type: Number, default: 993 },
    dailySendLimit: { type: Number, default: 40 },
    currentSentToday: { type: Number, default: 0 },
    isWarmupActive: { type: Boolean, default: true },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'AUTH_ERROR', 'SPAM_FLAGGED'],
      default: 'ACTIVE',
      index: true,
    },
    lastResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EmailAccountSchema.index({ organizationId: 1, status: 1 });

export const EmailAccount = mongoose.model('EmailAccount', EmailAccountSchema);
