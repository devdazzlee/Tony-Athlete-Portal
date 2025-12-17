import express, { Router } from 'express';
import { IntegrationController } from '../controllers/IntegrationController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const integrationController = new IntegrationController();

// All routes require authentication
router.use(authenticateToken);

// Integration management routes
router.get('/', integrationController.getIntegrations);
router.get('/:id', integrationController.getIntegrationById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), integrationController.createIntegration);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), integrationController.updateIntegration);
router.delete('/:id', requireRole(['ADMIN']), integrationController.deleteIntegration);

// Shopify integration routes
router.post('/shopify/connect', requireRole(['ADMIN', 'MANAGER']), integrationController.connectShopify);
router.post('/shopify/sync', requireRole(['ADMIN', 'MANAGER']), integrationController.syncShopifyProducts);
router.get('/shopify/products', integrationController.getShopifyProducts);
router.get('/shopify/orders', integrationController.getShopifyOrders);

// Mailchimp integration routes
router.post('/mailchimp/connect', requireRole(['ADMIN', 'MANAGER']), integrationController.connectMailchimp);
router.post('/mailchimp/sync', requireRole(['ADMIN', 'MANAGER']), integrationController.syncMailchimpList);
router.get('/mailchimp/lists', integrationController.getMailchimpLists);
router.get('/mailchimp/campaigns', integrationController.getMailchimpCampaigns);

// Stripe integration routes
router.post('/stripe/connect', requireRole(['ADMIN', 'MANAGER']), integrationController.connectStripe);
router.get('/stripe/balance', requireRole(['ADMIN', 'MANAGER']), integrationController.getStripeBalance);
router.get('/stripe/payouts', requireRole(['ADMIN', 'MANAGER']), integrationController.getStripePayouts);

// Google Analytics integration routes
router.post('/google-analytics/connect', requireRole(['ADMIN', 'MANAGER']), integrationController.connectGoogleAnalytics);
router.get('/google-analytics/data', integrationController.getGoogleAnalyticsData);

// Facebook Pixel integration routes
router.post('/facebook-pixel/connect', requireRole(['ADMIN', 'MANAGER']), integrationController.connectFacebookPixel);
router.get('/facebook-pixel/events', integrationController.getFacebookPixelEvents);

// Integration status routes
router.get('/:id/status', integrationController.getIntegrationStatus);
router.post('/:id/test', requireRole(['ADMIN', 'MANAGER']), integrationController.testIntegration);
router.post('/:id/sync', requireRole(['ADMIN', 'MANAGER']), integrationController.syncIntegration);

export default router;
