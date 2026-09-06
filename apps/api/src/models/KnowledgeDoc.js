import mongoose from 'mongoose';

const KnowledgeDocSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true }, // e.g. 'Web Development', 'SEO', 'Online Ordering'
    content: { type: String, required: true },
    caseStudyResults: { type: String }, // e.g. "Increased online sales by 45% for a local bistro"
    targetCategories: [{ type: String, index: true }], // e.g. ['restaurant', 'salon', 'gym']
    tags: [{ type: String, index: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

KnowledgeDocSchema.index({ organizationId: 1, category: 1 });

export const KnowledgeDoc = mongoose.model('KnowledgeDoc', KnowledgeDocSchema);
