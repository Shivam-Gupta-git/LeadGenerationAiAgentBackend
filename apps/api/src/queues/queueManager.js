import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';

export const QUEUE_NAMES = {
  LEAD_DISCOVERY: 'lead-discovery',
  LEAD_ENRICHMENT: 'lead-enrichment',
  EMAIL_VERIFICATION: 'email-verification',
  AI_ANALYSIS: 'ai-analysis',
  AI_PERSONALIZATION: 'ai-personalization',
  OUTREACH_DISPATCH: 'outreach-dispatch',
  FOLLOWUP_SCHEDULER: 'followup-scheduler',
  WEBHOOK_EVENTS: 'webhook-events'
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: {
    age: 86400, // 24 hours
    count: 1000
  },
  removeOnFail: {
    age: 604800, // 7 days
    count: 5000
  }
};

const queues = {};

// Initialize all BullMQ queues
export const initializeQueues = () => {
  if (process.env.NODE_ENV === 'test') {
    return queues; // Skip background socket loops during unit testing
  }

  Object.values(QUEUE_NAMES).forEach((queueName) => {
    queues[queueName] = new Queue(queueName, {
      connection: redisConfig,
      defaultJobOptions
    });
  });
  console.log(`[QueueManager] Initialized ${Object.keys(queues).length} BullMQ queues.`);
  return queues;
};

export const getQueue = (queueName) => {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, {
      connection: redisConfig,
      defaultJobOptions
    });
  }
  return queues[queueName];
};

export const getAllQueueMetrics = async () => {
  const metrics = {};
  for (const [name, queue] of Object.entries(queues)) {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused()
      ]);
      metrics[name] = { waiting, active, completed, failed, delayed, isPaused: paused };
    } catch (err) {
      metrics[name] = { error: err.message, status: 'redis_disconnected' };
    }
  }
  return metrics;
};

// Initialize on module load
initializeQueues();

export default queues;
