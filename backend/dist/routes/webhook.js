"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const WebhookController_1 = require("../controllers/WebhookController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const webhookController = new WebhookController_1.WebhookController();
router.post('/stripe', webhookController.handleStripeWebhook);
router.post('/shopify', webhookController.handleShopifyWebhook);
router.post('/mailchimp', webhookController.handleMailchimpWebhook);
router.use(auth_1.authenticateToken);
router.get('/', webhookController.getWebhooks);
router.get('/:id', webhookController.getWebhookById);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.createWebhook);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.updateWebhook);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN']), webhookController.deleteWebhook);
router.post('/:id/test', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.testWebhook);
router.post('/:id/retry', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.retryWebhook);
router.get('/:id/logs', webhookController.getWebhookLogs);
router.get('/:id/logs/:logId', webhookController.getWebhookLogById);
router.get('/events', webhookController.getWebhookEvents);
router.post('/events/:event/trigger', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.triggerWebhookEvent);
router.post('/:id/regenerate-secret', (0, auth_1.requireRole)(['ADMIN', 'MANAGER']), webhookController.regenerateWebhookSecret);
router.get('/:id/verify', webhookController.verifyWebhookSignature);
exports.default = router;
//# sourceMappingURL=webhook.js.map