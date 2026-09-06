import { EmailAccount } from '../../models/EmailAccount.js';

/**
 * Calculates current warmup cap based on days since account creation/warmup start.
 */
export const calculateWarmupCap = (createdAt) => {
  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  
  if (daysActive <= 3) return 5;
  if (daysActive <= 7) return 10;
  if (daysActive <= 14) return 20;
  if (daysActive <= 21) return 35;
  return 50; // Full volume max cap
};

/**
 * Checks and resets daily send limits if 24 hours have elapsed since last reset.
 */
export const checkAndResetDailyLimits = async (organizationId) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await EmailAccount.updateMany(
    {
      organizationId,
      lastResetAt: { $lt: startOfDay }
    },
    {
      $set: {
        currentSentToday: 0,
        lastResetAt: now
      }
    }
  );
};

/**
 * Rotates and selects the next optimal EmailAccount for outbound dispatch.
 */
export const getNextAvailableInbox = async (organizationId) => {
  // First reset stale daily send counts if a new day has started
  await checkAndResetDailyLimits(organizationId);

  const activeAccounts = await EmailAccount.find({
    organizationId,
    status: 'ACTIVE',
    healthScore: { $gte: 50 }
  }).sort({ currentSentToday: 1, updatedAt: 1 });

  if (!activeAccounts || activeAccounts.length === 0) {
    throw new Error(`No active, healthy email accounts available for organization ${organizationId}`);
  }

  // Filter accounts that have not hit their daily ceiling or warmup cap
  const availableAccount = activeAccounts.find((acc) => {
    const effectiveCap = acc.isWarmupActive 
      ? Math.min(acc.dailySendLimit, calculateWarmupCap(acc.createdAt))
      : acc.dailySendLimit;

    return acc.currentSentToday < effectiveCap;
  });

  if (!availableAccount) {
    throw new Error(`All email accounts for organization ${organizationId} have reached their daily sending limit.`);
  }

  return availableAccount;
};

/**
 * Generates a randomized delay jitter in milliseconds (default: 4 to 11 minutes).
 */
export const getRandomSendJitterMs = (minMinutes = 4, maxMinutes = 11) => {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  const jitterMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return jitterMs;
};

export default {
  calculateWarmupCap,
  checkAndResetDailyLimits,
  getNextAvailableInbox,
  getRandomSendJitterMs
};
