import { Router } from 'express';
import { searchLeads, importCSVLeads, getDiscoveryJobStatus } from '../controllers/discoveryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/search', searchLeads);
router.post('/import', importCSVLeads);
router.get('/jobs/:jobId', getDiscoveryJobStatus);

export default router;
