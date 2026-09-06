import { AuditLog } from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { action, userId, entityType, page = 1, limit = 50 } = req.query;

    const query = { organizationId };
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName email role'),
      AuditLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
