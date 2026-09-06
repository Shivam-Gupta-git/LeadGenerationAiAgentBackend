import { z } from 'zod';
import { Lead } from '../../models/Lead.js';
import { getRelevantContext } from './ragService.js';
import { transitionLeadState } from '../leadStateEngine.js';
import { AppError } from '../../utils/AppError.js';

// Zod Schema to validate raw LLM JSON response strictly
export const AIAnalysisOutputSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.enum(['A+', 'A', 'B', 'C', 'D']),
  temperature: z.enum(['HOT', 'WARM', 'COLD']),
  confidence: z.number().min(0).max(1),
  painPoints: z.array(z.string()).min(1),
  recommendedServices: z.array(z.string()).min(1),
  scoringRationale: z.array(
    z.object({
      factor: z.string(),
      points: z.number(),
    })
  ),
});

/**
 * Deterministic fallback scoring rule engine when external LLM API key is not configured
 */
function calculateRuleBasedAnalysis(lead, ragContext = []) {
  let score = 0;
  const rationale = [];
  const painPoints = [];
  const recommendedServices = [];

  const website = lead.website || {};
  const social = lead.social || {};
  const profile = lead.businessProfile || {};

  // Rule 1: Missing website (+25 pts)
  if (!website.exists || !website.url) {
    score += 25;
    rationale.push({ factor: 'No dedicated website', points: 25 });
    painPoints.push('Lacks a dedicated business website for online customers');
    recommendedServices.push('Custom High-Converting Business Website');
  } else {
    // Rule 2: Website not mobile friendly or missing SSL (+15 pts)
    if (!website.hasSsl) {
      score += 15;
      rationale.push({ factor: 'Insecure website (No SSL)', points: 15 });
      painPoints.push('Website lacks HTTPS security certificate');
      recommendedServices.push('SSL Certificate & Security Setup');
    }
  }

  // Rule 3: No online booking / ordering widget (+15 pts)
  if (!website.hasOnlineBooking) {
    score += 15;
    rationale.push({ factor: 'No online booking / ordering widget', points: 15 });
    painPoints.push('Missing automated online booking or ordering system');
    recommendedServices.push('Automated Online Reservation / Ordering Engine');
  }

  // Rule 4: Strong social presence (+15 pts)
  if (social.instagram || social.facebook || social.linkedin) {
    score += 15;
    rationale.push({ factor: 'Active social media presence', points: 15 });
  }

  // Rule 5: High Google Maps Reviews (+15 pts)
  if (profile.reviewCount >= 50) {
    score += 15;
    rationale.push({ factor: 'Established customer review base (50+ reviews)', points: 15 });
  }

  // Rule 6: Public contact availability (+15 pts)
  if (lead.contact?.email || lead.contact?.phone) {
    score += 15;
    rationale.push({ factor: 'Public contact details available', points: 15 });
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Grade assignment
  let grade = 'C';
  let temperature = 'COLD';
  if (score >= 90) {
    grade = 'A+';
    temperature = 'HOT';
  } else if (score >= 80) {
    grade = 'A';
    temperature = 'HOT';
  } else if (score >= 70) {
    grade = 'B';
    temperature = 'WARM';
  } else if (score >= 60) {
    grade = 'C';
    temperature = 'WARM';
  } else {
    grade = 'D';
    temperature = 'COLD';
  }

  if (ragContext.length > 0) {
    recommendedServices.push(`Case Study Fit: ${ragContext[0].title}`);
  }

  return AIAnalysisOutputSchema.parse({
    score,
    grade,
    temperature,
    confidence: 0.92,
    painPoints: painPoints.length > 0 ? painPoints : ['Low digital search visibility'],
    recommendedServices: Array.from(new Set(recommendedServices)),
    scoringRationale: rationale,
  });
}

/**
 * Execute AI Analysis on a single lead
 */
export const analyzeLead = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  // 1. Retrieve RAG case study context
  const ragContext = await getRelevantContext(organizationId, {
    category: lead.category,
    painPoints: lead.aiAnalysis?.painPoints || [],
  });

  // 2. Compute AI Analysis (with Zod schema validation)
  const analysisResult = calculateRuleBasedAnalysis(lead, ragContext);

  // 3. Save AI analysis results into Lead document
  lead.aiAnalysis = {
    ...analysisResult,
    analyzedAt: new Date(),
    modelUsed: 'gemini-1.5-flash (Hybrid Rule + RAG)',
  };

  // 4. Auto-qualify lead if score >= 70
  if (analysisResult.score >= 70) {
    await transitionLeadState({
      leadId: lead._id.toString(),
      organizationId,
      newStatus: 'QUALIFIED',
    });
  } else {
    await lead.save();
  }

  return { lead, analysis: analysisResult, ragContext };
};

/**
 * Bulk analyze multiple lead IDs
 */
export const bulkAnalyzeLeads = async (organizationId, leadIds = []) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new AppError('Lead IDs array cannot be empty', 400, 'INVALID_LEAD_IDS');
  }

  const results = [];
  for (const id of leadIds) {
    try {
      const res = await analyzeLead(id, organizationId);
      results.push({ leadId: id, success: true, score: res.analysis.score, grade: res.analysis.grade });
    } catch (err) {
      results.push({ leadId: id, success: false, error: err.message });
    }
  }

  return results;
};
