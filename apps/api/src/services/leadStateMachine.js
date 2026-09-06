import { AppError } from '../utils/AppError.js';

const ALLOWED_TRANSITIONS = {
  NEW: ['DISCOVERED', 'REJECTED'],
  DISCOVERED: ['ENRICHING', 'REJECTED'],
  ENRICHING: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['QUALIFIED', 'REJECTED'],
  QUALIFIED: ['CONTACTED', 'REJECTED'],
  REJECTED: ['QUALIFIED'],
  CONTACTED: ['REPLIED', 'NOT_INTERESTED', 'REJECTED'],
  REPLIED: ['INTERESTED', 'NOT_INTERESTED'],
  INTERESTED: ['MEETING', 'NOT_INTERESTED'],
  NOT_INTERESTED: ['INTERESTED'],
  MEETING: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['WON', 'LOST'],
  WON: [],
  LOST: ['INTERESTED'],
};

export const validateStateTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true;

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new AppError(
      `Invalid lead status transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: ${allowed ? allowed.join(', ') : 'none'}`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }
  return true;
};
