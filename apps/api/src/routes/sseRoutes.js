import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { streamEvents, triggerTestEvent } from '../controllers/sseController.js';

const router = express.Router();

router.use(protect);

router.get('/stream', streamEvents);
router.post('/test-broadcast', triggerTestEvent);

export default router;
