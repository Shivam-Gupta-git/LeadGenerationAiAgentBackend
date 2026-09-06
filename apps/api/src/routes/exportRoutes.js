import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { exportLeads } from '../controllers/exportController.js';

const router = express.Router();

router.use(protect);

router.get('/leads', exportLeads);

export default router;
