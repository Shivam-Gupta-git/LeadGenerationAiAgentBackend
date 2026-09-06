import { z } from 'zod';
import { runDiscovery } from '../services/discovery/discoveryService.js';
import { AppError } from '../utils/AppError.js';

const searchSchema = z.object({
  campaignId: z.string().optional(),
  country: z.string().default('India'),
  city: z.string().min(1, 'City is required'),
  category: z.string().min(1, 'Category is required'),
  limit: z.number().min(1).max(100).default(20),
  source: z.enum(['GOOGLE_MAPS', 'DIRECTORY', 'CSV_IMPORT', 'MANUAL_IMPORT']).default('GOOGLE_MAPS'),
});

const importCSVSchema = z.object({
  campaignId: z.string().optional(),
  rows: z.array(z.record(z.any())).min(1, 'Rows array cannot be empty'),
});

export const searchLeads = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing.', 400, 'NO_TENANT_CONTEXT');
    }

    const { campaignId, source, ...params } = searchSchema.parse(req.body);

    const result = await runDiscovery({
      organizationId,
      campaignId,
      source,
      params,
    });

    res.status(200).json({
      success: true,
      message: `Successfully discovered ${result.savedCount} new unique leads (${result.duplicateCount} duplicates filtered out)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const importCSVLeads = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing.', 400, 'NO_TENANT_CONTEXT');
    }

    const { campaignId, rows } = importCSVSchema.parse(req.body);

    const result = await runDiscovery({
      organizationId,
      campaignId,
      source: 'CSV_IMPORT',
      params: { rows },
    });

    res.status(200).json({
      success: true,
      message: `Successfully imported ${result.savedCount} new unique leads from CSV (${result.duplicateCount} duplicates skipped)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscoveryJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    res.status(200).json({
      success: true,
      data: {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
