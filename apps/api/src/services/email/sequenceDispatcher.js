import { Lead } from '../../models/Lead.js';
import { Sequence } from '../../models/Sequence.js';
import { getNextAvailableInbox, getRandomSendJitterMs } from './inboxRotator.js';
import { sendEmail } from './smtpService.js';
import { enqueueFollowupScheduler } from '../../queues/jobProducer.js';
import { generateFollowUpPitch } from '../ai/aiPersonalizationEngine.js';

const TERMINAL_STATUSES = ['REPLIED', 'INTERESTED', 'NOT_INTERESTED', 'MEETING', 'PROPOSAL', 'WON', 'LOST', 'REJECTED'];

/**
 * Replace merge tags in email templates with lead values.
 */
export const populateMergeTags = (template, lead) => {
  if (!template) return '';
  return template
    .replace(/\{\{businessName\}\}/g, lead.businessName || 'your business')
    .replace(/\{\{contactName\}\}/g, lead.contactName || 'there')
    .replace(/\{\{city\}\}/g, lead.location?.city || 'your area')
    .replace(/\{\{industry\}\}/g, lead.industry || 'your industry')
    .replace(/\{\{website\}\}/g, lead.website || '');
};

/**
 * Execute a specific step in a multi-channel drip sequence for a given lead.
 */
export const executeSequenceStep = async ({ leadId, sequenceId, stepIndex = 0, organizationId }) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found for organization ${organizationId}`);
  }

  // AUTO-STOP TRIGGER: If lead has already replied, booked meeting, or unsubscribed, abort sequence
  if (TERMINAL_STATUSES.includes(lead.status)) {
    console.log(`[SequenceDispatcher] Auto-stopping sequence ${sequenceId} for Lead ${lead._id} (Current status: ${lead.status})`);
    return {
      status: 'AUTO_STOPPED',
      reason: `Lead is in terminal/replied status (${lead.status})`,
      leadId: lead._id
    };
  }

  const sequence = await Sequence.findOne({ _id: sequenceId, organizationId, isActive: true });
  if (!sequence || !sequence.steps || sequence.steps.length === 0) {
    throw new Error(`Active sequence ${sequenceId} not found or has no steps`);
  }

  const currentStep = sequence.steps[stepIndex];
  if (!currentStep) {
    console.log(`[SequenceDispatcher] Sequence ${sequenceId} completed for Lead ${lead._id} (Reached end of steps)`);
    return { status: 'COMPLETED', leadId: lead._id };
  }

  // Handle EMAIL channel dispatch
  if (currentStep.channel === 'EMAIL') {
    const inbox = await getNextAvailableInbox(organizationId);

    let subject = populateMergeTags(currentStep.templateSubject || 'Quick question regarding {{businessName}}', lead);
    let body = populateMergeTags(currentStep.templateBody, lead);

    // If step 1 and AI pitch is available, prefer personalized AI pitch
    if (stepIndex === 0 && lead.aiAnalysis?.generatedPitch?.emailPitch?.body) {
      subject = lead.aiAnalysis.generatedPitch.emailPitch.subject || subject;
      body = lead.aiAnalysis.generatedPitch.emailPitch.body;
    } else if (stepIndex > 0) {
      // Dynamic follow-up generation if template body is generic
      try {
        const followUpPitch = await generateFollowUpPitch(leadId, organizationId, stepIndex + 1);
        if (followUpPitch && followUpPitch.body) {
          subject = followUpPitch.subject || subject;
          body = followUpPitch.body;
        }
      } catch (err) {
        console.warn(`[SequenceDispatcher] Using template follow-up fallback: ${err.message}`);
      }
    }

    const htmlBody = `<div style="font-family: sans-serif; font-size: 15px; color: #333; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>`;

    const dispatchResult = await sendEmail(inbox, {
      to: lead.email,
      subject,
      html: htmlBody,
      text: body
    });

    // Update lead status to CONTACTED if eligible
    if (['QUALIFIED', 'VERIFIED', 'DISCOVERED'].includes(lead.status)) {
      lead.status = 'CONTACTED';
    }

    // Record outreach log
    if (!lead.outreachHistory) lead.outreachHistory = [];
    lead.outreachHistory.push({
      channel: 'EMAIL',
      senderEmail: inbox.email,
      subject,
      body,
      sentAt: new Date(),
      messageId: dispatchResult.messageId,
      stepNumber: currentStep.stepNumber
    });

    await lead.save();

    // Check if next step exists and schedule follow-up
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < sequence.steps.length) {
      const nextStep = sequence.steps[nextStepIndex];
      const delayDays = nextStep.dayDelay || 3;
      const delayMs = delayDays * 86400 * 1000 + getRandomSendJitterMs();

      await enqueueFollowupScheduler(organizationId, sequence.campaignId, lead._id, delayMs);
      console.log(`[SequenceDispatcher] Scheduled step ${nextStep.stepNumber} for lead ${lead._id} in ${delayDays} days`);
    }

    return {
      status: 'SENT',
      stepNumber: currentStep.stepNumber,
      messageId: dispatchResult.messageId,
      senderEmail: inbox.email,
      hasNextStep: nextStepIndex < sequence.steps.length
    };
  }

  return {
    status: 'SKIPPED',
    reason: `Channel ${currentStep.channel} requires manual outreach`,
    stepNumber: currentStep.stepNumber
  };
};

export default {
  populateMergeTags,
  executeSequenceStep
};
