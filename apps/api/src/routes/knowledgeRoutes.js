import { Router } from 'express';
import { createDoc, getDocs, queryContext } from '../controllers/knowledgeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createDoc);
router.get('/', getDocs);
router.post('/query', queryContext);

export default router;
