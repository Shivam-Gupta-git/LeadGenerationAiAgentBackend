import { Lead } from '../../models/Lead.js';
import { scrapeWebsite } from '../scraping/scraperService.js';
import { detectTechStack } from './techStackDetector.js';
import { transitionLeadState } from '../leadStateEngine.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Enrich a single lead by auditing its website, tech stack, and social handles
 * @param {string} leadId
 * @param {string} organizationId
 * @returns {Promise<Object>} Enriched Lead document
 */
export const enrichLead = async (leadId, organizationId) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  // 1. Transition status to ENRICHING
  if (lead.status === 'NEW' || lead.status === 'DISCOVERED') {
    await transitionLeadState({
      leadId: lead._id.toString(),
      organizationId,
      newStatus: 'ENRICHING',
    });
  }

  const websiteUrl = lead.website?.url;

  if (!websiteUrl) {
    // If no website URL exists, mark website.exists = false and transition to VERIFIED
    lead.website = {
      url: null,
      exists: false,
      hasSsl: false,
      isMobileFriendly: false,
      hasContactForm: false,
      hasOnlineBooking: false,
      techStack: [],
      lastCheckedAt: new Date(),
    };

    lead.status = 'VERIFIED';
    await lead.save();

    return { lead, auditData: { exists: false, note: 'No website URL present on lead profile' } };
  }

  // 2. Perform live web scraping & contact extraction
  const audit = await scrapeWebsite(websiteUrl);

  // 3. Merge web audit facts into Lead document
  lead.website = {
    url: websiteUrl,
    exists: audit.exists,
    status: audit.statusCode,
    hasSsl: audit.hasSsl,
    isMobileFriendly: true,
    hasContactForm: audit.hasContactForm,
    hasOnlineBooking: audit.hasOnlineBooking,
    techStack: Array.from(new Set([...(lead.website?.techStack || []), ...audit.techStack])),
    lastCheckedAt: new Date(),
  };

  // Merge social links if discovered and not present
  if (audit.socialLinks) {
    lead.social = {
      instagram: lead.social?.instagram || audit.socialLinks.instagram || null,
      facebook: lead.social?.facebook || audit.socialLinks.facebook || null,
      linkedin: lead.social?.linkedin || audit.socialLinks.linkedin || null,
      twitter: lead.social?.twitter || audit.socialLinks.twitter || null,
      youtube: lead.social?.youtube || audit.socialLinks.youtube || null,
    };
  }

  // Merge discovered emails into contact profile if contact email missing
  if (!lead.contact?.email && audit.emailsFound?.length > 0) {
    lead.contact.email = audit.emailsFound[0];
  }

  // 4. Update status to VERIFIED
  await transitionLeadState({
    leadId: lead._id.toString(),
    organizationId,
    newStatus: 'VERIFIED',
  });

  return { lead, auditData: audit };
};

/**
 * Bulk enrich a list of lead IDs
 */
export const bulkEnrichLeads = async (organizationId, leadIds = []) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new AppError('Lead IDs array cannot be empty', 400, 'INVALID_LEAD_IDS');
  }

  const results = [];
  for (const id of leadIds) {
    try {
      const enriched = await enrichLead(id, organizationId);
      results.push({ leadId: id, success: true, lead: enriched.lead });
    } catch (err) {
      results.push({ leadId: id, success: false, error: err.message });
    }
  }

  return results;
};
