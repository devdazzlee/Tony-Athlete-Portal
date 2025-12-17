import express, { Router } from 'express';
import { SecurityController } from '../controllers/SecurityController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const securityController = new SecurityController();

// All routes require authentication
router.use(authenticateToken);

// 2FA routes
router.post('/2fa/setup', securityController.setup2FA);
router.post('/2fa/verify', securityController.verify2FA);
router.post('/2fa/disable', securityController.disable2FA);
router.post('/2fa/backup-codes', securityController.generateBackupCodes);

// Security logs routes
router.get('/logs', requireRole(['ADMIN', 'MANAGER']), securityController.getSecurityLogs);
router.get('/logs/:id', requireRole(['ADMIN', 'MANAGER']), securityController.getSecurityLogById);

// Login attempts routes
router.get('/login-attempts', requireRole(['ADMIN', 'MANAGER']), securityController.getLoginAttempts);
router.get('/login-attempts/:userId', requireRole(['ADMIN', 'MANAGER']), securityController.getUserLoginAttempts);

// IP blocking routes
router.get('/ip-blocks', requireRole(['ADMIN', 'MANAGER']), securityController.getIPBlocks);
router.post('/ip-blocks', requireRole(['ADMIN', 'MANAGER']), securityController.createIPBlock);
router.delete('/ip-blocks/:id', requireRole(['ADMIN']), securityController.deleteIPBlock);

// Device management routes
router.get('/devices', securityController.getUserDevices);
router.post('/devices/:deviceId/revoke', securityController.revokeDevice);
router.post('/devices/revoke-all', securityController.revokeAllDevices);

// Security settings routes
router.get('/settings', securityController.getSecuritySettings);
router.put('/settings', requireRole(['ADMIN', 'MANAGER']), securityController.updateSecuritySettings);

// Audit trail routes
router.get('/audit-trail', requireRole(['ADMIN', 'MANAGER']), securityController.getAuditTrail);
router.get('/audit-trail/:userId', requireRole(['ADMIN', 'MANAGER']), securityController.getUserAuditTrail);

export default router;
