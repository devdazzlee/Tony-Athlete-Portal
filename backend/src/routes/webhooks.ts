import { Router } from 'express';
import { WebhooksController } from '../controllers/WebhooksController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD Operations
router.post('/', WebhooksController.createWebhook);
router.get('/', WebhooksController.listWebhooks);
router.get('/dashboard', WebhooksController.getWebhooksDashboard);
router.get('/templates', WebhooksController.getWebhookTemplates);
router.post('/default', WebhooksController.createDefaultWebhooks);

// Individual Webhook Operations
router.get('/:id', WebhooksController.getWebhook);
router.put('/:id', WebhooksController.updateWebhook);
router.delete('/:id', WebhooksController.deleteWebhook);

// Webhook Events Management
router.post('/:webhookId/events', WebhooksController.addEvent);
router.put('/:webhookId/events/:eventId', WebhooksController.updateEvent);
router.delete('/:webhookId/events/:eventId', WebhooksController.removeEvent);

// Webhook Testing
router.post('/:id/test', WebhooksController.testWebhook);
router.post('/:id/trigger', WebhooksController.triggerWebhook);

// Webhook History and Logs
router.get('/:id/history', WebhooksController.getWebhookHistory);
router.get('/:id/logs', WebhooksController.getWebhookLogs);

// Webhook Statistics
router.get('/:id/stats', WebhooksController.getWebhookStats);

// Webhook Templates
router.post('/templates/:templateId', WebhooksController.createWebhookFromTemplate);

// Webhook Security
router.post('/:id/secret', WebhooksController.generateSecret);
router.post('/:id/validate', WebhooksController.validateSignature);

// Webhook Retry
router.post('/:id/retry', WebhooksController.retryWebhook);

// Webhook Endpoint (for receiving webhooks)
router.post('/receive/:webhookId', WebhooksController.receiveWebhook);

// Export/Import
router.get('/export', WebhooksController.exportWebhooks);
router.post('/import', WebhooksController.importWebhooks);

export default router;


