import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    businessName: { type: String, required: true, trim: true },
    normalizedKey: { type: String, required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    subcategory: { type: String },
    description: { type: String },
    location: {
      country: { type: String, required: true, default: 'India' },
      state: { type: String },
      city: { type: String, required: true, index: true },
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    contact: {
      phone: { type: String },
      email: { type: String, lowercase: true, trim: true },
      isEmailVerified: { type: Boolean, default: false },
      verificationStatus: {
        type: String,
        enum: ['VALID', 'INVALID', 'RISKY', 'UNVERIFIED'],
        default: 'UNVERIFIED',
      },
      whatsapp: { type: String },
      decisionMakerName: { type: String },
      decisionMakerTitle: { type: String },
    },
    website: {
      url: { type: String },
      exists: { type: Boolean, default: false },
      status: { type: Number },
      hasSsl: { type: Boolean },
      isMobileFriendly: { type: Boolean },
      hasContactForm: { type: Boolean },
      hasOnlineBooking: { type: Boolean },
      hasEcommerce: { type: Boolean },
      techStack: [{ type: String }],
      lastCheckedAt: { type: Date },
    },
    social: {
      instagram: { type: String },
      facebook: { type: String },
      linkedin: { type: String },
      youtube: { type: String },
      twitter: { type: String },
    },
    businessProfile: {
      rating: { type: Number, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
      priceRange: { type: String },
      googleMapsUrl: { type: String },
    },
    aiAnalysis: {
      score: { type: Number, min: 0, max: 100 },
      grade: { type: String, enum: ['A+', 'A', 'B', 'C', 'D'] },
      temperature: { type: String, enum: ['HOT', 'WARM', 'COLD'] },
      confidence: { type: Number },
      painPoints: [{ type: String }],
      recommendedServices: [{ type: String }],
      scoringRationale: [
        {
          factor: { type: String },
          points: { type: Number },
        },
      ],
      generatedPitch: {
        emailSubject: { type: String },
        emailBody: { type: String },
        instagramDm: { type: String },
        whatsappMessage: { type: String },
        callScript: { type: String },
      },
      analyzedAt: { type: Date },
      modelUsed: { type: String },
    },
    status: {
      type: String,
      enum: [
        'NEW',
        'DISCOVERED',
        'ENRICHING',
        'VERIFIED',
        'QUALIFIED',
        'REJECTED',
        'CONTACTED',
        'REPLIED',
        'INTERESTED',
        'NOT_INTERESTED',
        'MEETING',
        'PROPOSAL',
        'WON',
        'LOST',
      ],
      default: 'NEW',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String, index: true }],
    source: {
      type: String,
      enum: ['GOOGLE_MAPS', 'DIRECTORY', 'CSV_IMPORT', 'CUSTOM_SCRAPER'],
      default: 'GOOGLE_MAPS',
    },
    sourceId: { type: String },
  },
  { timestamps: true }
);

LeadSchema.index({ organizationId: 1, status: 1 });
LeadSchema.index({ organizationId: 1, 'location.city': 1, category: 1 });
LeadSchema.index({ organizationId: 1, 'aiAnalysis.score': -1 });
LeadSchema.index({ organizationId: 1, normalizedKey: 1 }, { unique: true });

export const Lead = mongoose.model('Lead', LeadSchema);
