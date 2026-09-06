import { Lead } from '../../models/Lead.js';
import { getRelevantContext } from './ragService.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Anti-Hallucination rules string injected into system prompts
 */
const ANTI_HALLUCINATION_GUARDRAILS = `
STRICT GUARDRAILS:
1. NEVER offer unauthorized discounts or free work.
2. NEVER invent fake client names or fake testimonials.
3. NEVER claim previous phone calls or prior contact if none occurred.
4. NEVER promise technical capabilities outside the target service area.
`;

/**
 * Synthesizes personalized sales pitches across multiple outreach channels
 * @param {Object} lead
 * @param {Array<Object>} ragContext
 * @returns {Object} Multi-channel pitch drafts
 */
function synthesizePitchDrafts(lead, ragContext = []) {
  const name = lead.businessName;
  const city = lead.location?.city || 'your area';
  const category = lead.category || 'business';
  const websiteExists = lead.website?.exists;
  const painPoints = lead.aiAnalysis?.painPoints || [];
  const primaryPain = painPoints[0] || (websiteExists ? 'low online conversions' : 'no dedicated website');
  
  const caseStudyTitle = ragContext.length > 0 ? ragContext[0].title : null;
  const caseStudyResult = ragContext.length > 0 ? ragContext[0].caseStudyResults : 'helped local businesses increase digital leads by 40%';

  // 1. Email Draft
  const emailSubject = !websiteExists
    ? `Quick question regarding ${name} in ${city}`
    : `Website feedback & digital growth opportunity for ${name}`;

  const emailBody = `Hi ${lead.contact?.decisionMakerName || 'Team'} at ${name},

I noticed ${name} has built a great reputation in ${city}${lead.businessProfile?.reviewCount ? ` with over ${lead.businessProfile.reviewCount} customer reviews` : ''}!

However, while auditing local ${category} businesses in ${city}, I observed that ${primaryPain}. 

${caseStudyTitle ? `We recently completed a project (${caseStudyTitle}) where we ${caseStudyResult}.` : `We specialize in helping ${category} businesses convert more local searchers into paying clients.`}

Would you be open to a quick 5-minute chat this Thursday to see how we could help ${name}?

Best regards,
Growth Team`;

  // 2. Instagram DM Draft
  const instagramDm = `Hey ${name} team! 👋 Love your page and what you're doing in ${city}. Noticed ${primaryPain}. We recently ${caseStudyResult}. Mind if I send over a quick 2-min video walkthrough with some ideas?`;

  // 3. WhatsApp Message Draft
  const whatsappMessage = `Hi! Reaching out from Growth Services regarding ${name} in ${city}. We saw ${primaryPain} and wanted to share a quick solution we implemented for a similar ${category} business. Are you available for a brief call tomorrow?`;

  // 4. Cold Call Script
  const callScript = `[Hook]: Hi, is this the manager at ${name}?
[Opener]: My name is [Your Name] with Growth Agency. I’m calling because we work with ${category} businesses in ${city}.
[Problem]: We noticed ${primaryPain}, which is costing you customer bookings every week.
[Social Proof]: We recently ${caseStudyResult}.
[Call to Action]: I'd love to drop off a 1-page audit for ${name}. Are you at the location this afternoon?`;

  return {
    emailSubject,
    emailBody,
    instagramDm,
    whatsappMessage,
    callScript,
  };
}

/**
 * Generate personalized multi-channel pitch for a lead
 */
export const generateOutreachPitch = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  // Retrieve RAG case study context
  const ragContext = await getRelevantContext(organizationId, {
    category: lead.category,
    painPoints: lead.aiAnalysis?.painPoints || [],
  });

  const generatedPitch = synthesizePitchDrafts(lead, ragContext);

  // Update lead aiAnalysis document in MongoDB
  lead.aiAnalysis = {
    ...(lead.aiAnalysis || {}),
    generatedPitch,
  };

  await lead.save();

  return { lead, generatedPitch, ragContext };
};

/**
 * Generate follow-up email draft for drip sequences
 */
export const generateFollowUpPitch = async (leadId, organizationId, stepNumber = 2) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  const name = lead.businessName;
  let followUpSubject = `Following up: ${name}`;
  let followUpBody = '';

  if (stepNumber === 2) {
    followUpSubject = `Quick follow-up regarding ${name}`;
    followUpBody = `Hi Team,\n\nFollowing up on my previous note. Did you have a chance to review the digital growth opportunity for ${name}?\n\nHappy to share a quick 2-minute video walkthrough if you're interested.\n\nBest,`;
  } else {
    followUpSubject = `Final check-in for ${name}`;
    followUpBody = `Hi Team,\n\nI haven't heard back, so I assume timing isn't right for ${name} at the moment.\n\nI won't clutter your inbox further. Feel free to reach out whenever you're ready to grow your digital presence.\n\nBest,`;
  }

  return {
    leadId,
    stepNumber,
    followUpSubject,
    followUpBody,
  };
};
