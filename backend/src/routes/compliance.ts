import express, { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const complianceController = new ComplianceController();

// All routes require authentication
router.use(authenticateToken);

// GDPR routes
router.get('/gdpr', complianceController.getGDPRSettings);
router.put('/gdpr', requireRole(['ADMIN']), complianceController.updateGDPRSettings);
router.get('/gdpr/data-requests', requireRole(['ADMIN', 'MANAGER']), complianceController.getDataRequests);
router.post('/gdpr/data-requests', complianceController.createDataRequest);
router.put('/gdpr/data-requests/:id', requireRole(['ADMIN', 'MANAGER']), complianceController.updateDataRequest);

// Data retention routes
router.get('/data-retention', requireRole(['ADMIN']), complianceController.getDataRetentionSettings);
router.put('/data-retention', requireRole(['ADMIN']), complianceController.updateDataRetentionSettings);
router.post('/data-retention/cleanup', requireRole(['ADMIN']), complianceController.runDataCleanup);

// Audit trail routes
router.get('/audit-trail', requireRole(['ADMIN', 'MANAGER']), complianceController.getAuditTrail);
router.get('/audit-trail/export', requireRole(['ADMIN', 'MANAGER']), complianceController.exportAuditTrail);

// Privacy policy routes
router.get('/privacy-policy', complianceController.getPrivacyPolicy);
router.put('/privacy-policy', requireRole(['ADMIN']), complianceController.updatePrivacyPolicy);

// Terms of service routes
router.get('/terms-of-service', complianceController.getTermsOfService);
router.put('/terms-of-service', requireRole(['ADMIN']), complianceController.updateTermsOfService);

// Cookie consent routes
router.get('/cookie-consent', complianceController.getCookieConsentSettings);
router.put('/cookie-consent', requireRole(['ADMIN']), complianceController.updateCookieConsentSettings);
router.post('/cookie-consent/track', complianceController.trackCookieConsent);

// Data export routes
router.post('/data-export', complianceController.requestDataExport);
router.get('/data-export/:id', complianceController.getDataExport);
router.get('/data-export/:id/download', complianceController.downloadDataExport);

// Data deletion routes
router.post('/data-deletion', complianceController.requestDataDeletion);
router.get('/data-deletion/:id', complianceController.getDataDeletionStatus);

export default router;
