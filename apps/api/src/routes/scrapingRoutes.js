import { Router } from 'express';
import { inspectUrl } from '../controllers/scrapingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/inspect', inspectUrl);

export default router;
