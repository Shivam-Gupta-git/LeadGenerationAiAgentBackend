import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  handleSendGridWebhook,
  handlePostmarkWebhook,
  handleInboundReply,
  getWebhookEvents
} from '../controllers/webhookController.js';

const router = express.Router();

// Public Webhook Ingestion Endpoints (Called by SendGrid, Postmark, Mailgun, or Inbound Parsers)
router.post('/sendgrid', handleSendGridWebhook);
router.post('/postmark', handlePostmarkWebhook);
router.post('/inbound-reply', handleInboundReply);

// Authenticated Audit Endpoint
router.get('/events', protect, getWebhookEvents);

export default router;
