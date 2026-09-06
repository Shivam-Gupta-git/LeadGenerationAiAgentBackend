import { Router } from 'express';
import { enrichSingleLead, bulkEnrich } from '../controllers/enrichmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/enrich-lead/:id', enrichSingleLead);
router.post('/bulk-enrich', bulkEnrich);

export default router;
