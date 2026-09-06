import { getQueue, QUEUE_NAMES } from './queueManager.js';

export const enqueueJob = async (queueName, jobName, data, opts = {}) => {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, {
    ...data,
    enqueuedAt: new Date().toISOString()
  }, opts);

  return {
    jobId: job.id,
    queueName,
    jobName,
    status: 'enqueued'
  };
};

export const enqueueLeadDiscovery = async (organizationId, payload) => {
  return enqueueJob(
    QUEUE_NAMES.LEAD_DISCOVERY,
    'discover-leads',
    { organizationId, ...payload },
    { priority: 1 }
  );
};

export const enqueueLeadEnrichment = async (organizationId, leadId, options = {}) => {
  return enqueueJob(
    QUEUE_NAMES.LEAD_ENRICHMENT,
    'enrich-lead',
    { organizationId, leadId, ...options },
    { priority: 2 }
  );
};

export const enqueueEmailVerification = async (organizationId, leadId, email) => {
  return enqueueJob(
    QUEUE_NAMES.EMAIL_VERIFICATION,
    'verify-email',
    { organizationId, leadId, email },
    { priority: 2 }
  );
};

export const enqueueAIAnalysis = async (organizationId, leadId) => {
  return enqueueJob(
    QUEUE_NAMES.AI_ANALYSIS,
    'analyze-lead-ai',
    { organizationId, leadId },
    { priority: 3 }
  );
};

export const enqueueAIPersonalization = async (organizationId, leadId, options = {}) => {
  return enqueueJob(
    QUEUE_NAMES.AI_PERSONALIZATION,
    'generate-personalization',
    { organizationId, leadId, ...options },
    { priority: 3 }
  );
};

export const enqueueOutreachDispatch = async (organizationId, campaignId, leadId, options = {}) => {
  return enqueueJob(
    QUEUE_NAMES.OUTREACH_DISPATCH,
    'dispatch-outreach',
    { organizationId, campaignId, leadId, ...options },
    { priority: 4 }
  );
};

export const enqueueFollowupScheduler = async (organizationId, campaignId, leadId, delayMs = 86400000) => {
  return enqueueJob(
    QUEUE_NAMES.FOLLOWUP_SCHEDULER,
    'schedule-followup',
    { organizationId, campaignId, leadId },
    { delay: delayMs, priority: 4 }
  );
};

export const enqueueWebhookEvent = async (organizationId, eventType, payload) => {
  return enqueueJob(
    QUEUE_NAMES.WEBHOOK_EVENTS,
    'process-webhook',
    { organizationId, eventType, payload },
    { priority: 5 }
  );
};

export default {
  enqueueJob,
  enqueueLeadDiscovery,
  enqueueLeadEnrichment,
  enqueueEmailVerification,
  enqueueAIAnalysis,
  enqueueAIPersonalization,
  enqueueOutreachDispatch,
  enqueueFollowupScheduler,
  enqueueWebhookEvent
};
