import { z } from 'zod';
import { analyzeLead, bulkAnalyzeLeads } from '../services/ai/aiAnalysisEngine.js';
import { rescoreLead } from '../services/ai/hybridScoringEngine.js';
import { generateOutreachPitch, generateFollowUpPitch } from '../services/ai/aiPersonalizationEngine.js';
import { AppError } from '../utils/AppError.js';

const bulkAnalyzeSchema = z.object({
  leadIds: z.array(z.string()).min(1, 'leadIds array cannot be empty'),
});

export const analyzeSingleLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await analyzeLead(id, organizationId);

    res.status(200).json({
      success: true,
      message: `AI Lead analysis completed. Lead scored ${result.analysis.score} (${result.analysis.grade})`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkAnalyze = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const { leadIds } = bulkAnalyzeSchema.parse(req.body);
    const results = await bulkAnalyzeLeads(organizationId, leadIds);

    res.status(200).json({
      success: true,
      message: `Processed AI analysis for ${leadIds.length} leads`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const rescoreLeadHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await rescoreLead(id, organizationId);

    res.status(200).json({
      success: true,
      message: `Rescored lead ${id}. New Score: ${result.scoringResult.score} (${result.scoringResult.grade})`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const generatePitchHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await generateOutreachPitch(id, organizationId);

    res.status(200).json({
      success: true,
      message: 'Generated multi-channel sales pitch drafts (Email, DM, WhatsApp, Call Script)',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const generateFollowUpHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stepNumber } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError('Organization context missing', 400, 'NO_TENANT_CONTEXT');
    }

    const result = await generateFollowUpPitch(id, organizationId, stepNumber ? Number(stepNumber) : 2);

    res.status(200).json({
      success: true,
      message: `Generated step ${stepNumber || 2} follow-up email draft`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
