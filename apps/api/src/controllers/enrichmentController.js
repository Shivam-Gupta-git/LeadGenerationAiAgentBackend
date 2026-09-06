import { z } from 'zod';
import { enrichLead, bulkEnrichLeads } from '../services/enrichment/enrichmentService.js';
import { AppError } from '../utils/AppError.js';

const bulkSchema = z.object({
  leadIds: z.array(z.string()).min(1, 'leadIds array cannot be empty'),
});

export const enrichSingleLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await enrichLead(id, organizationId);

    res.status(200).json({
      success: true,
      message: 'Lead website audit & tech stack enrichment completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkEnrich = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const { leadIds } = bulkSchema.parse(req.body);

    const results = await bulkEnrichLeads(organizationId, leadIds);

    res.status(200).json({
      success: true,
      message: `Processed bulk enrichment for ${leadIds.length} leads`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
