import { Lead } from '../../models/Lead.js';
import { Campaign } from '../../models/Campaign.js';
import { enqueueOutreachDispatch } from '../../queues/jobProducer.js';
import { logAuditEvent } from '../observability/auditLogger.js';

/**
 * Evaluates AI lead scoring confidence and applies safety threshold rules.
 * - Confidence > 85%: Auto-qualify lead
 * - Confidence 60-85%: Hold in review queue (NEEDS_REVIEW)
 * - Confidence < 60%: Flag for manual inspection
 */
export const evaluateLeadConfidence = (scoringResult = {}) => {
  const confidenceScore = scoringResult.confidenceScore || 70;

  if (confidenceScore >= 85) {
    return {
      status: 'QUALIFIED',
      requiresReview: false,
      confidenceCategory: 'HIGH',
      reason: 'AI confidence score exceeds auto-qualification threshold (>= 85%)'
    };
  }

  if (confidenceScore >= 60) {
    return {
      status: 'QUALIFIED',
      requiresReview: true,
      reviewReason: 'MODERATE_CONFIDENCE',
      confidenceCategory: 'MEDIUM',
      reason: 'AI confidence score requires human verification (60-84%)'
    };
  }

  return {
    status: 'QUALIFIED',
    requiresReview: true,
    reviewReason: 'LOW_CONFIDENCE',
    confidenceCategory: 'LOW',
    reason: 'AI confidence score is low (< 60%). Flagged for manual audit.'
  };
};

/**
 * Evaluates whether an outreach pitch draft can be auto-sent or requires human approval.
 */
export const evaluateDraftSafety = async (campaignId, pitchDraft) => {
  if (!campaignId) {
    return { requiresApproval: true, mode: 'MANUAL_APPROVAL' };
  }

  const campaign = await Campaign.findById(campaignId);
  const isAutoSendEnabled = campaign && campaign.autoSend === true;

  return {
    requiresApproval: !isAutoSendEnabled,
    mode: isAutoSendEnabled ? 'AUTO_SEND' : 'MANUAL_APPROVAL'
  };
};

/**
 * Approve a draft pitch for a lead and enqueue outreach dispatch.
 */
export const approveOutreachDraft = async ({ leadId, userId, organizationId, editedSubject, editedBody }) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  if (!lead.aiAnalysis || !lead.aiAnalysis.generatedPitch) {
    throw new Error(`No AI generated pitch found for lead ${leadId}`);
  }

  // Apply edits if user updated draft content in review queue
  if (editedSubject) {
    lead.aiAnalysis.generatedPitch.emailPitch.subject = editedSubject;
  }
  if (editedBody) {
    lead.aiAnalysis.generatedPitch.emailPitch.body = editedBody;
  }

  lead.aiAnalysis.generatedPitch.isApproved = true;
  lead.aiAnalysis.generatedPitch.approvedBy = userId;
  lead.aiAnalysis.generatedPitch.approvedAt = new Date();

  await lead.save();

  // Audit log action
  await logAuditEvent({
    organizationId,
    userId,
    action: 'MESSAGE_APPROVED',
    entityType: 'Lead',
    entityId: lead._id,
    metadata: { leadEmail: lead.email, businessName: lead.businessName }
  });

  // Enqueue job for BullMQ outreach dispatch worker
  const dispatchJob = await enqueueOutreachDispatch(organizationId, lead.campaignId, lead._id);

  return {
    success: true,
    message: 'Outreach pitch approved and enqueued for dispatch',
    leadId: lead._id,
    dispatchJob
  };
};

/**
 * Reject an outreach draft and log feedback for AI refinement.
 */
export const rejectOutreachDraft = async ({ leadId, userId, organizationId, rejectionReason }) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  if (lead.aiAnalysis && lead.aiAnalysis.generatedPitch) {
    lead.aiAnalysis.generatedPitch.isApproved = false;
    lead.aiAnalysis.generatedPitch.rejectionReason = rejectionReason || 'User requested revision';
    await lead.save();
  }

  await logAuditEvent({
    organizationId,
    userId,
    action: 'MESSAGE_GENERATED',
    entityType: 'Lead',
    entityId: lead._id,
    metadata: { action: 'DRAFT_REJECTED', rejectionReason }
  });

  return {
    success: true,
    message: 'Draft rejected and flagged for AI pitch re-generation',
    leadId: lead._id
  };
};

export default {
  evaluateLeadConfidence,
  evaluateDraftSafety,
  approveOutreachDraft,
  rejectOutreachDraft
};
