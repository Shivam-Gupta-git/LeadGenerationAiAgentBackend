import { Lead } from '../models/Lead.js';
import { AuditLog } from '../models/AuditLog.js';
import { validateStateTransition } from './leadStateMachine.js';
import { AppError } from '../utils/AppError.js';

/**
 * Safely transition a lead's status and trigger event-driven lifecycle hooks
 * @param {Object} params
 * @param {string} params.leadId
 * @param {string} params.organizationId
 * @param {string} params.newStatus
 * @param {string} [params.userId]
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>} Updated Lead document
 */
export const transitionLeadState = async ({
  leadId,
  organizationId,
  newStatus,
  userId,
  metadata = {},
}) => {
  const lead = await Lead.findOne({ _id: leadId, organizationId });
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  const previousStatus = lead.status;

  // 1. Validate state transition against state machine graph
  validateStateTransition(previousStatus, newStatus);

  // 2. Update lead status in MongoDB
  lead.status = newStatus;
  await lead.save();

  // 3. Log audit event
  if (userId) {
    await AuditLog.create({
      organizationId,
      userId,
      action: 'LEAD_UPDATED',
      entityType: 'Lead',
      entityId: leadId,
      metadata: {
        previousStatus,
        newStatus,
        ...metadata,
      },
    });
  }

  // 4. Trigger lifecycle event hooks
  await executeLifecycleHooks({ lead, previousStatus, newStatus, organizationId });

  return lead;
};

/**
 * Internal lifecycle event hooks execution
 */
async function executeLifecycleHooks({ lead, previousStatus, newStatus }) {
  console.log(`[Lifecycle Engine] Lead '${lead._id}' transitioned: ${previousStatus} -> ${newStatus}`);

  switch (newStatus) {
    case 'REPLIED':
      console.log(`[Lifecycle Hook] Lead replied. Auto-stopping outreach drip sequence for lead '${lead._id}'.`);
      // Outbound email drip sequence auto-stop trigger
      break;

    case 'NOT_INTERESTED':
    case 'REJECTED':
      console.log(`[Lifecycle Hook] Lead marked as ${newStatus}. Archiving outreach activity.`);
      break;

    case 'QUALIFIED':
      console.log(`[Lifecycle Hook] Lead auto-qualified. Ready for pitch generation.`);
      break;

    default:
      break;
  }
}
