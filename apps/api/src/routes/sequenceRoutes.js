import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getSequences,
  createSequence,
  updateSequence,
  triggerLeadSequence,
  deleteSequence
} from '../controllers/sequenceController.js';

const router = express.Router();

router.use(protect);

router.get('/', getSequences);
router.post('/', createSequence);
router.put('/:id', updateSequence);
router.post('/:id/trigger', triggerLeadSequence);
router.delete('/:id', deleteSequence);

export default router;
