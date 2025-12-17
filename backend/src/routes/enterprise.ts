import express, { Router } from 'express';
import { EnterpriseController } from '../controllers/EnterpriseController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const enterpriseController = new EnterpriseController();

// All routes require authentication
router.use(authenticateToken);

// White-label routes
router.get('/white-label', requireRole(['ADMIN']), enterpriseController.getWhiteLabelSettings);
router.put('/white-label', requireRole(['ADMIN']), enterpriseController.updateWhiteLabelSettings);
router.post('/white-label/preview', requireRole(['ADMIN']), enterpriseController.previewWhiteLabel);

// Multi-tenant routes
router.get('/tenants', requireRole(['ADMIN']), enterpriseController.getTenants);
router.get('/tenants/:id', requireRole(['ADMIN']), enterpriseController.getTenantById);
router.post('/tenants', requireRole(['ADMIN']), enterpriseController.createTenant);
router.put('/tenants/:id', requireRole(['ADMIN']), enterpriseController.updateTenant);
router.delete('/tenants/:id', requireRole(['ADMIN']), enterpriseController.deleteTenant);

// Tenant settings routes
router.get('/tenants/:id/settings', requireRole(['ADMIN']), enterpriseController.getTenantSettings);
router.put('/tenants/:id/settings', requireRole(['ADMIN']), enterpriseController.updateTenantSettings);

// Tenant analytics routes
router.get('/tenants/:id/analytics', requireRole(['ADMIN']), enterpriseController.getTenantAnalytics);
router.get('/tenants/:id/usage', requireRole(['ADMIN']), enterpriseController.getTenantUsage);

// Enterprise features routes
router.get('/features', requireRole(['ADMIN']), enterpriseController.getEnterpriseFeatures);
router.put('/features', requireRole(['ADMIN']), enterpriseController.updateEnterpriseFeatures);

// API limits routes
router.get('/api-limits', requireRole(['ADMIN']), enterpriseController.getAPILimits);
router.put('/api-limits', requireRole(['ADMIN']), enterpriseController.updateAPILimits);

// Custom domains routes
router.get('/domains', requireRole(['ADMIN']), enterpriseController.getCustomDomains);
router.post('/domains', requireRole(['ADMIN']), enterpriseController.addCustomDomain);
router.delete('/domains/:id', requireRole(['ADMIN']), enterpriseController.removeCustomDomain);

// SSO routes
router.get('/sso', requireRole(['ADMIN']), enterpriseController.getSSOSettings);
router.put('/sso', requireRole(['ADMIN']), enterpriseController.updateSSOSettings);
router.post('/sso/test', requireRole(['ADMIN']), enterpriseController.testSSO);

export default router;
