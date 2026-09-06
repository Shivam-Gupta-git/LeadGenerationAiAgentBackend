import mongoose from 'mongoose';

const SequenceStepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  dayDelay: { type: Number, required: true, default: 0 }, // Days to wait after previous step
  channel: {
    type: String,
    enum: ['EMAIL', 'INSTAGRAM_DM', 'WHATSAPP', 'CALL_SCRIPT'],
    default: 'EMAIL',
  },
  templateSubject: { type: String },
  templateBody: { type: String, required: true },
});

const SequenceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    steps: [SequenceStepSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SequenceSchema.index({ organizationId: 1, campaignId: 1 });

export const Sequence = mongoose.model('Sequence', SequenceSchema);
