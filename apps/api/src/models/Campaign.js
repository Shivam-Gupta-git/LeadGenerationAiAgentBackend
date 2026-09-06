import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    targeting: {
      countries: [{ type: String, default: 'India' }],
      cities: [{ type: String }],
      categories: [{ type: String }],
      minRating: { type: Number, default: 0 },
      minReviews: { type: Number, default: 0 },
      websiteFilter: {
        type: String,
        enum: ['ALL', 'MISSING_ONLY', 'HAS_WEBSITE_ONLY'],
        default: 'ALL',
      },
    },
    limits: {
      maxLeadsToDiscover: { type: Number, default: 100 },
      dailyOutreachCap: { type: Number, default: 50 },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'DRAFT',
      index: true,
    },
    stats: {
      discovered: { type: Number, default: 0 },
      enriched: { type: Number, default: 0 },
      qualified: { type: Number, default: 0 },
      contacted: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      meetingsBooked: { type: Number, default: 0 },
      won: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ organizationId: 1, status: 1 });

export const Campaign = mongoose.model('Campaign', CampaignSchema);
