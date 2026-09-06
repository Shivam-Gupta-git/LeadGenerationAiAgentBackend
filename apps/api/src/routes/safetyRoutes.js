import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getApprovalQueue,
  approveDraftHandler,
  rejectDraftHandler,
  bulkApproveDraftsHandler
} from '../controllers/safetyController.js';

const router = express.Router();

router.use(protect);

router.get('/approval-queue', getApprovalQueue);
router.post('/bulk-approve', bulkApproveDraftsHandler);
router.post('/:id/approve', approveDraftHandler);
router.post('/:id/reject', rejectDraftHandler);

export default router;
