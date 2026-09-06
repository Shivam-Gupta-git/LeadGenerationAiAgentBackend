import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: [
        'USER_LOGIN',
        'USER_LOGOUT',
        'LEAD_CREATED',
        'LEAD_UPDATED',
        'LEAD_DELETED',
        'CAMPAIGN_CREATED',
        'CAMPAIGN_STARTED',
        'CAMPAIGN_PAUSED',
        'MESSAGE_GENERATED',
        'MESSAGE_APPROVED',
        'MESSAGE_SENT',
        'SETTINGS_CHANGED',
      ],
      required: true,
      index: true,
    },
    entityType: { type: String, required: true }, // e.g. 'Lead', 'Campaign', 'User', 'Settings'
    entityId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
