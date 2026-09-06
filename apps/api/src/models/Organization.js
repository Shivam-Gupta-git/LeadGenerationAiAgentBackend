import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'AGENCY', 'ENTERPRISE'],
      default: 'FREE',
    },
    monthlyLeadLimit: { type: Number, default: 500 },
    monthlyEmailLimit: { type: Number, default: 2000 },
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', OrganizationSchema);
