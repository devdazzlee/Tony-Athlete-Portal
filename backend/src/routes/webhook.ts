import express, { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const webhookController = new WebhookController();

// Public webhook endpoints (no authentication required)
router.post('/stripe', webhookController.handleStripeWebhook);
router.post('/shopify', webhookController.handleShopifyWebhook);
router.post('/mailchimp', webhookController.handleMailchimpWebhook);

// Protected webhook management routes
router.use(authenticateToken);

// Webhook management routes
router.get('/', webhookController.getWebhooks);
router.get('/:id', webhookController.getWebhookById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), webhookController.createWebhook);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), webhookController.updateWebhook);
router.delete('/:id', requireRole(['ADMIN']), webhookController.deleteWebhook);

// Webhook testing routes
router.post('/:id/test', requireRole(['ADMIN', 'MANAGER']), webhookController.testWebhook);
router.post('/:id/retry', requireRole(['ADMIN', 'MANAGER']), webhookController.retryWebhook);

// Webhook logs routes
router.get('/:id/logs', webhookController.getWebhookLogs);
router.get('/:id/logs/:logId', webhookController.getWebhookLogById);

// Webhook events routes
router.get('/events', webhookController.getWebhookEvents);
router.post('/events/:event/trigger', requireRole(['ADMIN', 'MANAGER']), webhookController.triggerWebhookEvent);

// Webhook security routes
router.post('/:id/regenerate-secret', requireRole(['ADMIN', 'MANAGER']), webhookController.regenerateWebhookSecret);
router.get('/:id/verify', webhookController.verifyWebhookSignature);

export default router;
