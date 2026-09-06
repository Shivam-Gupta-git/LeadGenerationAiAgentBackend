import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getCrmConfig,
  updateCrmConfig,
  syncLeadHandler,
  testCrmHandler
} from '../controllers/crmController.js';

const router = express.Router();

router.use(protect);

router.get('/config', getCrmConfig);
router.put('/config', updateCrmConfig);
router.post('/sync-lead/:leadId', syncLeadHandler);
router.post('/test', testCrmHandler);

export default router;
