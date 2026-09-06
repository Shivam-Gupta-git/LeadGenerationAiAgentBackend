import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getQueueStats, performQueueAction, enqueueManualJob } from '../controllers/queueController.js';

const router = express.Router();

// Apply auth protection to queue management endpoints
router.use(protect);

router.get('/stats', getQueueStats);
router.post('/enqueue', enqueueManualJob);
router.post('/:queueName/action', performQueueAction);

export default router;
