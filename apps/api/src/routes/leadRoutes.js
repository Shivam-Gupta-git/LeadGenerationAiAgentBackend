import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  changeLeadStatus,
  checkDuplicateLead,
  deleteLead,
} from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.post('/check-duplicate', checkDuplicateLead);
router.patch('/:id', updateLead);
router.patch('/:id/status', changeLeadStatus);
router.delete('/:id', deleteLead);

export default router;
