import { AuditLog } from '../../models/AuditLog.js';

/**
 * Asynchronously record an audit log event in MongoDB.
 */
export const logAuditEvent = async ({
  organizationId,
  userId,
  action,
  entityType = 'General',
  entityId = null,
  metadata = {},
  ipAddress = null,
  userAgent = null
}) => {
  try {
    if (!organizationId || !userId || !action) {
      console.warn('[AuditLogger] Missing required audit parameters (organizationId, userId, action)');
      return null;
    }

    const logEntry = await AuditLog.create({
      organizationId,
      userId,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      metadata,
      ipAddress,
      userAgent
    });

    return logEntry;
  } catch (error) {
    // Non-blocking error handling to ensure audit logging never breaks application flow
    console.error(`[AuditLogger Error] Failed to log action '${action}':`, error.message);
    return null;
  }
};

export default {
  logAuditEvent
};
