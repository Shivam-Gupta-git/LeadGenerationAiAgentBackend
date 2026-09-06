import { Lead } from '../models/Lead.js';
import { approveOutreachDraft, rejectOutreachDraft } from '../services/ai/humanSafetyEngine.js';

export const getApprovalQueue = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { page = 1, limit = 20 } = req.query;

    const query = {
      organizationId,
      'aiAnalysis.generatedPitch': { $exists: true },
      'aiAnalysis.generatedPitch.isApproved': { $ne: true }
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Lead.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      data: leads
    });
  } catch (error) {
    next(error);
  }
};

export const approveDraftHandler = async (req, res, next) => {
  try {
    const { id } = req.params; // leadId
    const { editedSubject, editedBody } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id || req.user._id;

    const result = await approveOutreachDraft({
      leadId: id,
      userId,
      organizationId,
      editedSubject,
      editedBody
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const rejectDraftHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id || req.user._id;

    const result = await rejectOutreachDraft({
      leadId: id,
      userId,
      organizationId,
      rejectionReason
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const bulkApproveDraftsHandler = async (req, res, next) => {
  try {
    const { leadIds = [] } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id || req.user._id;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, error: 'leadIds array is required' });
    }

    const results = [];
    for (const leadId of leadIds) {
      try {
        const approved = await approveOutreachDraft({ leadId, userId, organizationId });
        results.push(approved);
      } catch (err) {
        results.push({ leadId, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      approvedCount: results.filter(r => r.success).length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
