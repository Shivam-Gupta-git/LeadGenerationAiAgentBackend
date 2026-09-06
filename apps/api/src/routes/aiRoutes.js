import { Router } from 'express';
import {
  analyzeSingleLead,
  bulkAnalyze,
  rescoreLeadHandler,
  generatePitchHandler,
  generateFollowUpHandler,
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/analyze-lead/:id', analyzeSingleLead);
router.post('/bulk-analyze', bulkAnalyze);
router.post('/rescore-lead/:id', rescoreLeadHandler);
router.post('/generate-pitch/:id', generatePitchHandler);
router.post('/generate-followup/:id', generateFollowUpHandler);

export default router;
