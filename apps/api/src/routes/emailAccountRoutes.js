import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getEmailAccounts,
  createEmailAccount,
  updateEmailAccount,
  testEmailAccount,
  checkDomainSecurity,
  deleteEmailAccount
} from '../controllers/emailAccountController.js';

const router = express.Router();

router.use(protect);

router.get('/', getEmailAccounts);
router.post('/', createEmailAccount);
router.get('/domain-security', checkDomainSecurity);
router.put('/:id', updateEmailAccount);
router.post('/:id/test', testEmailAccount);
router.delete('/:id', deleteEmailAccount);

export default router;
