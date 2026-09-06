import { Router } from 'express';
import { verifyEmail, verifyLeadContact } from '../controllers/verificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/verify-email', verifyEmail);
router.post('/verify-lead/:id', verifyLeadContact);

export default router;
