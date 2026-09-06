import { getAllQueueMetrics, getQueue, QUEUE_NAMES } from '../queues/queueManager.js';
import { enqueueJob } from '../queues/jobProducer.js';

export const getQueueStats = async (req, res, next) => {
  try {
    const metrics = await getAllQueueMetrics();
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      queues: metrics
    });
  } catch (error) {
    next(error);
  }
};

export const performQueueAction = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { action, gracePeriod = 5000, state = 'completed' } = req.body;

    if (!Object.values(QUEUE_NAMES).includes(queueName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid queue name: ${queueName}. Valid options: ${Object.values(QUEUE_NAMES).join(', ')}`
      });
    }

    const queue = getQueue(queueName);
    let result = {};

    switch (action) {
      case 'pause':
        await queue.pause();
        result = { message: `Queue '${queueName}' paused successfully.` };
        break;
      case 'resume':
        await queue.resume();
        result = { message: `Queue '${queueName}' resumed successfully.` };
        break;
      case 'clean':
        const removed = await queue.clean(gracePeriod, 1000, state);
        result = { message: `Queue '${queueName}' cleaned. Removed ${removed.length} ${state} jobs.` };
        break;
      case 'empty':
        await queue.drain();
        result = { message: `Queue '${queueName}' drained successfully.` };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported action '${action}'. Valid actions: pause, resume, clean, empty`
        });
    }

    return res.status(200).json({
      success: true,
      queueName,
      action,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const enqueueManualJob = async (req, res, next) => {
  try {
    const { queueName, jobName = 'manual-job', payload = {} } = req.body;

    if (!Object.values(QUEUE_NAMES).includes(queueName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid queue name: ${queueName}`
      });
    }

    const enqueueResult = await enqueueJob(
      queueName,
      jobName,
      { organizationId: req.user?.organizationId || 'system', ...payload }
    );

    return res.status(202).json({
      success: true,
      message: `Job enqueued into queue '${queueName}' successfully`,
      data: enqueueResult
    });
  } catch (error) {
    next(error);
  }
};
