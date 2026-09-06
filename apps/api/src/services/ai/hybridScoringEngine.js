import { Lead } from '../../models/Lead.js';
import { transitionLeadState } from '../leadStateEngine.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Deterministic scoring matrix definition (Max 100 pts)
 */
export const SCORING_RULES = [
  {
    id: 'MISSING_WEBSITE',
    factor: 'No dedicated business website',
    points: 25,
    check: (lead) => !lead.website?.exists || !lead.website?.url,
  },
  {
    id: 'NO_SSL',
    factor: 'Insecure website (No HTTPS/SSL)',
    points: 15,
    check: (lead) => lead.website?.exists && lead.website?.url && !lead.website?.hasSsl,
  },
  {
    id: 'NO_BOOKING_SYSTEM',
    factor: 'No online reservation / booking widget',
    points: 15,
    check: (lead) => !lead.website?.hasOnlineBooking,
  },
  {
    id: 'ACTIVE_SOCIAL_PRESENCE',
    factor: 'Active social media profiles',
    points: 15,
    check: (lead) => Boolean(lead.social?.instagram || lead.social?.facebook || lead.social?.linkedin),
  },
  {
    id: 'ESTABLISHED_REVIEWS',
    factor: 'Strong review base (50+ reviews)',
    points: 10,
    check: (lead) => (lead.businessProfile?.reviewCount || 0) >= 50,
  },
  {
    id: 'HIGH_RATING',
    factor: 'High customer rating (4.0+ stars)',
    points: 10,
    check: (lead) => (lead.businessProfile?.rating || 0) >= 4.0,
  },
  {
    id: 'PUBLIC_CONTACT',
    factor: 'Public email & phone available',
    points: 10,
    check: (lead) => Boolean(lead.contact?.email && lead.contact?.phone),
  },
];

/**
 * Calculate lead score, assign grade and temperature, and output explainable rationale
 * @param {Object} lead
 * @returns {Object} Score details
 */
export const calculateLeadScore = (lead) => {
  let score = 0;
  const rationale = [];

  for (const rule of SCORING_RULES) {
    if (rule.check(lead)) {
      score += rule.points;
      rationale.push({
        factor: rule.factor,
        points: rule.points,
      });
    }
  }

  score = Math.min(score, 100);

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

  return {
    score,
    grade,
    temperature,
    scoringRationale: rationale,
  };
};

/**
 * Recalculate and update a lead's score in MongoDB
 */
export const rescoreLead = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  const scoringResult = calculateLeadScore(lead);

  lead.aiAnalysis = {
    ...(lead.aiAnalysis || {}),
    score: scoringResult.score,
    grade: scoringResult.grade,
    temperature: scoringResult.temperature,
    scoringRationale: scoringResult.scoringRationale,
    analyzedAt: new Date(),
  };

  if (scoringResult.score >= 70 && (lead.status === 'NEW' || lead.status === 'DISCOVERED' || lead.status === 'VERIFIED')) {
    await transitionLeadState({
      leadId: lead._id.toString(),
      organizationId,
      newStatus: 'QUALIFIED',
    });
  } else {
    await lead.save();
  }

  return { lead, scoringResult };
};
